# 🤖 telegram-lm-interface

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Repo](https://img.shields.io/github/repo-size/Ib-R/telegram-lm-interface?style=flat-square&logo=github)]()

> 🚀 A Telegram bot that bridges your local LLMs (via LM Studio) to the Telegram messaging platform. Send messages and get intelligent AI responses powered by locally-hosted models!

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🧠 Local LLM Integration** | Seamlessly connect with your local LLMs running on LM Studio |
| **💬 Conversation Memory** | Maintains chat history context using Map-based memory storage |
| **🖼️ Multimodal Support** | Send images directly from Telegram chats (with captions) for AI processing |
| **📝 Persona** | Each conversation has a configurable system prompt (persona) |
| **🔄 Chat History Management** | Automatically manages history (keeps last 20 messages + system prompt) |
| **⚠️ Error Handling** | Graceful handling of Telegram webhook errors and LM Studio API failures |
| **📡 Polling Mode** | Uses long-polling with automatic error recovery as fallback |
| **⌨️ Type Indicators** | Shows typing action while AI is generating responses |
| **🔐 Access Control** | Configurable chat ID whitelist for access control |
| **⚙️ Model Switching** | Change the underlying model at runtime via `/model` or `/set-model <name>` commands |
| **💤 Graceful Shutdown** | Clean shutdown on SIGINT/SIGTERM signals |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js 18+](https://nodejs.org/) 
- [LM Studio](https://lmstudio.ai) (installed and running locally)
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

---

## 🚀 Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/Ib-R/telegram-lm-interface.git
cd telegram-lm-interface
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in your project directory:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
CHAT_ID_ALLOWED_LIST=123456789,987654321
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=llama3.1
```

**Environment Variables Explained:**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from @BotFather | - | ✅ Yes |
| `CHAT_ID_ALLOWED_LIST` | Comma-separated list of allowed chat IDs (leave empty for all) | All chats | ❌ No |
| `LM_STUDIO_URL` | URL where LM Studio is running | http://localhost:1234/v1 | ❌ No |
| `LM_STUDIO_MODEL` | Default model name to use | llama3.1 | ❌ No |

### Step 3: Start the Bot

```bash
npm start
```

Then open a new chat in LM Studio with your default model or select any compatible model! 🎉

---

## 💬 Usage

### Basic Commands (Future Functionality)

| Command | Description |
|---------|-------------|
| `/model` | Shows the currently active model |
| `/set-model <name>` | Changes to a different model |

### How It Works

1. Simply send messages to the bot (excluding commands starting with `/`)
2. The bot adds your message to conversation history
3. Sends it to your configured LM Studio instance
4. Receives and forwards the AI's response back to you! 🔄

---

## 🔧 Context Window

- **Maximum context**: 21 messages (1 system prompt + 20 recent messages)
- Older messages are automatically discarded to stay within limits

---

## 📁 Project Structure

```
telegram-lm-interface/
├── index.js              # Main entry point and bot logic
├── package.json          # Node.js dependencies and scripts
├── .env.example          # Example environment variables template
├── README.md             # This documentation file
└── .clinerules           # Coding guidelines and best practices
```

---

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| **Runtime** | Node.js 18+ |
| **Telegram API** | `node-telegram-bot-api` |
| **LLM Inference** | LM Studio API |
| **Environment Config** | dotenv |

---

## 📖 Configuration Examples

### Multi-Model Setup (Future Functionality)

```env
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=mistral-7b-instruct-v0.2
```

Then switch models during conversation using `/set-model` when available in future releases! 🔄

### Restricted Access Configuration

```env
CHAT_ID_ALLOWED_LIST=567890123,901234567
```

---

## ⚠️ Error Handling & Resilience

The bot gracefully handles:

- HTTP 401 errors from Telegram webhook endpoints
- LM Studio connection failures  
- Invalid API responses
- Unauthorized chat IDs

**Automatic Fallback**: When webhook polling fails, the bot automatically switches to long-polling mode! 🔄

---

## 🔍 Troubleshooting Guide

### Bot not responding?

```bash
# 1. Verify your .env file is properly configured
cat .env

# 2. Ensure LM Studio is running on specified URL
curl http://localhost:1234/api/tags

# 3. Check TELEGRAM_BOT_TOKEN is set correctly
grep TELEGRAM_BOT_TOKEN .env

# 4. Review console output for error messages
```

### Model changes not taking effect? (Future Functionality)

When model switching becomes available:

1. Confirm the model name matches exactly what's in LM Studio
2. Try switching with `/set-model <model-name>`
3. Check LM Studio API logs for compatibility issues

---

## 📚 Development Guidelines

See [.clinerules](./.clinerules) for comprehensive guidelines on:

- ✅ Code style conventions  
- 🔒 Security best practices  
- 🧪 Testing guidelines  
- 🏗️ Architecture patterns  

---

## 👥 Contributing

We welcome contributions! Here's how to get involved:

```bash
# 1. Fork the repository
git clone https://github.com/Ib-R/telegram-lm-interface.git

# 2. Create a feature branch
git checkout -b feature/amazing-feature

# 3. Make your changes following .clinerules guidelines

# 4. Test locally with npm start
npm start

# 5. Submit a pull request! 🚀
```

---

## 📜 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

---

## 💬 Support & Resources

For issues and questions:

- 🔍 Check error messages in console output  
- ⚙️ Review environment configuration files  
- 📖 Consult LM Studio documentation for API compatibility  

### Links

| Resource | URL |
|----------|-----|
| **GitHub Repository** | [github.com/Ib-R/telegram-lm-interface](https://github.com/Ib-R/telegram-lm-interface) |
| **LM Studio Docs** | [lmstudio.ai/docs](https://lmstudio.ai/docs) |
| **Telegram BotFather** | [@BotFather](https://t.me/BotFather) |

---

<div align="center">
  <strong>Made with ❤️ for the AI community</strong>
</div>
