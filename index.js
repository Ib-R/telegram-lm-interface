#!/usr/bin/env node

import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

/* ============================================
   ENVIRONMENT
============================================ */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const CHAT_ID_ALLOWED_LIST = process.env.CHAT_ID_ALLOWED_LIST?.split(",").map((id) => id.trim());

const LM_STUDIO_URL =
  process.env.LM_STUDIO_URL || "http://localhost:1234";

const LM_STUDIO_MODEL =
  process.env.LM_STUDIO_MODEL || "llama3.1";

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN must be set");
  process.exit(1);
}

/* ============================================
   MEMORY
============================================ */

const conversationMemory = new Map();

const SYSTEM_PROMPT =
  "You are a helpful AI assistant. Respond naturally and concisely.";

function getChatState(chatId) {
  if (!conversationMemory.has(chatId)) {
    conversationMemory.set(chatId, {
      model: LM_STUDIO_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
      ],
    });
  }

  return conversationMemory.get(chatId);
}

function getCurrentModel(chatId) {
  return getChatState(chatId).model;
}

/* ============================================
   TELEGRAM BOT
============================================ */

const bot = new TelegramBot(
  TELEGRAM_BOT_TOKEN,
  {
    polling: false, // IMPORTANT
  }
);

bot.on("polling_error", (err) =>
  console.error("Polling error:", err.message)
);

bot.on("error", (err) =>
  console.error("Telegram error:", err.message)
);

/* ============================================
   TELEGRAM COMMANDS
============================================ */

bot.onText(/^\/model$/, async (msg) => {
  const chatId = msg.chat.id.toString();
  if (!isIdAllowed(chatId)) {
    await bot.sendMessage(chatId, "You are not authorized to use this bot.");
    return;
  }

  await bot.sendMessage(
    chatId,
    `Current model: ${getCurrentModel(chatId)}`
  );
});

bot.onText(
  /^\/set-model\s+(.+)$/,
  async (msg, match) => {
    try {
      const chatId =
        msg.chat.id.toString();

      if (!isIdAllowed(chatId)) {
        await bot.sendMessage(chatId, "You are not authorized to use this bot.");
        return;
      }

      const modelName =
        match?.[1]?.trim();

      if (!modelName) {
        await bot.sendMessage(
          chatId,
          "Usage: /set-model <model-name>"
        );
        return;
      }

      const state =
        getChatState(chatId);

      state.model = modelName;

      await bot.sendMessage(
        chatId,
        `Model changed to: ${modelName}`
      );
    } catch (error) {
      console.error(error);

      await bot.sendMessage(
        msg.chat.id,
        "Failed to change model."
      );
    }
  }
);

/* ============================================
   TELEGRAM CHAT HANDLER
============================================ */

bot.on("message", async (msg) => {
  try {
    const chatId =
      msg.chat.id.toString();

    if (!isIdAllowed(chatId)) {
      await bot.sendMessage(chatId, "You are not authorized to use this bot.");
      return;
    }

    if (!msg.text) return;

    if (msg.text.startsWith("/"))
      return;

    await processUserMessage(
      chatId,
      msg.text
    );
  } catch (error) {
    console.error(
      "Message handler error:",
      error
    );

    try {
      await bot.sendMessage(
        msg.chat.id,
        "Unexpected error occurred."
      );
    } catch { }
  }
});

/* ============================================
   LM STUDIO CHAT
============================================ */

function isIdAllowed(chatId) {
  return (
    !CHAT_ID_ALLOWED_LIST ||
    CHAT_ID_ALLOWED_LIST.includes(chatId)
  );
}

async function processUserMessage(
  chatId,
  text
) {
  const state =
    getChatState(chatId);

  const model = state.model;

  await bot.sendChatAction(
    chatId,
    "typing"
  );

  state.messages.push({
    role: "user",
    content: text,
  });

  if (state.messages.length > 21) {
    const systemMessage =
      state.messages[0];

    state.messages = [
      systemMessage,
      ...state.messages.slice(-20),
    ];
  }

  try {
    const response = await fetch(
      `${LM_STUDIO_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          messages:
            state.messages,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const txt =
        await response.text();

      throw new Error(
        `LM Studio ${response.status}: ${txt}`
      );
    }

    const data =
      await response.json();

    const aiResponse =
      data?.choices?.[0]
        ?.message?.content;

    if (!aiResponse) {
      throw new Error(
        "Invalid response from LM Studio"
      );
    }

    state.messages.push({
      role: "assistant",
      content: aiResponse,
    });

    await bot.sendMessage(
      chatId,
      aiResponse
    );
  } catch (error) {
    console.error(
      "LM Studio error:",
      error.message
    );

    await bot.sendMessage(
      chatId,
      "Error talking to LM Studio."
    );
  }
}

/* ============================================
   STARTUP
============================================ */

async function main() {
  try {
    // START TELEGRAM FIRST
    await bot.startPolling({
      restart: true,
      interval: 300,
    });

    console.error(
      "Telegram polling started"
    );

    console.error(
      `LM Studio URL: ${LM_STUDIO_URL}`
    );

    console.error(
      `Default model: ${LM_STUDIO_MODEL}`
    );
  } catch (error) {
    console.error(
      "Startup error:",
      error
    );
    process.exit(1);
  }
}

main();

/* ============================================
   SHUTDOWN
============================================ */

async function shutdown() {
  try {
    console.error(
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