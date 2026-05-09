#!/usr/bin/env node

import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

/* ============================================
   ENVIRONMENT
============================================ */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const LM_STUDIO_URL =
  process.env.LM_STUDIO_URL || "http://127.0.0.1:1234/v1";
const LM_STUDIO_MODEL =
  process.env.LM_STUDIO_MODEL || "qwen2.5-vl-7b-instruct";

const CHAT_ID_ALLOWED_LIST =
  process.env.CHAT_ID_ALLOWED_LIST?.split(",").map((x) =>
    x.trim()
  ) || null;


/* ============================================
   MEMORY
============================================ */

const conversationMemory = new Map();

function getChatState(chatId) {
  if (!conversationMemory.has(chatId)) {
    conversationMemory.set(chatId, {
      model: LM_STUDIO_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Be concise and useful.",
        },
      ],
    });
  }

  return conversationMemory.get(chatId);
}

function getCurrentModel(chatId) {
  return getChatState(chatId).model;
}

function isIdAllowed(chatId) {
  return (
    !CHAT_ID_ALLOWED_LIST ||
    CHAT_ID_ALLOWED_LIST.includes(chatId)
  );
}

function trimHistory(state) {
  if (state.messages.length <= 21) return;

  const system = state.messages[0];

  state.messages = [
    system,
    ...state.messages.slice(-20),
  ];
}

/* ============================================
   TELEGRAM
============================================ */

const bot = new TelegramBot(
  TELEGRAM_BOT_TOKEN,
  {
    polling: false,
  }
);

bot.on("polling_error", (err) =>
  console.error("Polling error:", err.message)
);

bot.on("error", (err) =>
  console.error("Telegram error:", err.message)
);

/* ============================================
   LM STUDIO HELPERS
============================================ */

async function lmChat(messages, model) {
  const response = await fetch(
    `${LM_STUDIO_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(
      `LM Studio ${response.status}: ${txt}`
    );
  }

  const data = await response.json();

  return (
    data?.choices?.[0]?.message
      ?.content || "No response."
  );
}

/* ============================================
   COMMANDS
============================================ */

bot.onText(/^\/model$/, async (msg) => {
  const chatId =
    msg.chat.id.toString();

  if (!isIdAllowed(chatId))
    return;

  await bot.sendMessage(
    chatId,
    `Current model: ${getCurrentModel(
      chatId
    )}`
  );
});

bot.onText(
  /^\/set-model\s+(.+)$/,
  async (msg, match) => {
    const chatId =
      msg.chat.id.toString();

    if (!isIdAllowed(chatId))
      return;

    const model =
      match?.[1]?.trim();

    if (!model) {
      await bot.sendMessage(
        chatId,
        "Usage: /set-model <model>"
      );
      return;
    }

    const state =
      getChatState(chatId);

    state.model = model;

    await bot.sendMessage(
      chatId,
      `Model changed to: ${model}`
    );
  }
);

bot.onText(/^\/reset$/, async (msg) => {
  const chatId =
    msg.chat.id.toString();

  if (!isIdAllowed(chatId))
    return;

  conversationMemory.delete(
    chatId
  );

  getChatState(chatId);

  await bot.sendMessage(
    chatId,
    "Conversation reset."
  );
});

/* ============================================
   TEXT CHAT
============================================ */

bot.on("message", async (msg) => {
  try {
    const chatId =
      msg.chat.id.toString();

    if (!isIdAllowed(chatId))
      return;

    if (!msg.text) return;
    if (
      msg.photo ||
      msg.document ||
      msg.voice
    )
      return;

    if (
      msg.text.startsWith("/")
    )
      return;

    const state =
      getChatState(chatId);

    state.messages.push({
      role: "user",
      content: msg.text,
    });

    trimHistory(state);

    await bot.sendChatAction(
      chatId,
      "typing"
    );

    const reply = await lmChat(
      state.messages,
      state.model
    );

    state.messages.push({
      role: "assistant",
      content: reply,
    });

    await bot.sendMessage(
      chatId,
      reply
    );
  } catch (error) {
    console.error(error);

    await bot.sendMessage(
      msg.chat.id,
      "Error talking to LM Studio."
    );
  }
});

/* ============================================
   PHOTO / VISION
============================================ */

bot.on("photo", async (msg) => {
  try {
    const chatId =
      msg.chat.id.toString();

    if (!isIdAllowed(chatId))
      return;

    const photo =
      msg.photo[
      msg.photo.length - 1
      ];

    await bot.sendChatAction(
      chatId,
      "upload_photo"
    );

    const fileUrl =
      await bot.getFileLink(
        photo.file_id
      );

    if (!fileUrl) {
      throw new Error(
        "No Telegram file URL"
      );
    }

    const imgRes =
      await fetch(
        String(fileUrl)
      );

    if (!imgRes.ok) {
      throw new Error(
        "Failed to download image"
      );
    }

    const arrayBuffer =
      await imgRes.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer
      );

    const base64 =
      buffer.toString(
        "base64"
      );

    const caption =
      msg.caption?.trim() ||
      "Describe this image.";

    const state =
      getChatState(chatId);

    const messages = [
      ...state.messages,
      {
        role: "user",
        content: [
          {
            type: "text",
            text: caption,
          },
          {
            type:
              "image_url",
            image_url: {
              url:
                `data:image/jpeg;base64,${base64}`,
            },
          },
        ],
      },
    ];

    await bot.sendChatAction(
      chatId,
      "typing"
    );

    const reply =
      await lmChat(
        messages,
        state.model
      );

    state.messages.push({
      role: "user",
      content:
        "[Image sent] " +
        caption,
    });

    state.messages.push({
      role: "assistant",
      content: reply,
    });

    trimHistory(state);

    await bot.sendMessage(
      chatId,
      reply
    );
  } catch (error) {
    console.error(
      "Photo vision error:",
      error
    );

    await bot.sendMessage(
      msg.chat.id,
      "Failed to analyze image."
    );
  }
});

/* ============================================
   STARTUP
============================================ */

async function main() {
  if (!TELEGRAM_BOT_TOKEN && process.env.NODE_ENV !== 'test') {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }

  try {
    await bot.startPolling({
      restart: true,
      interval: 300,
    });

    console.log(
      "Telegram bot started."
    );
    console.log(
      "LM Studio URL:",
      LM_STUDIO_URL
    );
    console.log(
      "Default model:",
      LM_STUDIO_MODEL
    );
  } catch (error) {
    console.error(
      "Startup error:",
      error
    );
    process.exit(1);
  }
}

export { getChatState, getCurrentModel, isIdAllowed, trimHistory, main, lmChat };

if (import.meta.main) {
  main();
}

/* ============================================
   SHUTDOWN
============================================ */

async function shutdown() {
  try {
    console.log(
      "Shutting down..."
    );

    await bot.stopPolling();

    process.exit(0);
  } catch {
    process.exit(1);
  }
}

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);