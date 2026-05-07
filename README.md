# telegram-lm-interface

A Telegram bot that connects your local LLMs running via LM Studio to the Telegram messaging platform.

## Overview

This Node.js/JavaScript project bridges the gap between Telegram and local large language models (LLMs). Send messages to the bot and get intelligent responses powered by locally-hosted AI models through LM Studio.

## Features

- **Local LLM Integration**: Connect with your local LLMs running on LM Studio
- **Conversation Memory**: Maintains chat history context for each conversation using Map-based memory storage
- **Model Switching**: Change the underlying model at runtime using `/model` or `/set-model <model-name>` commands
- **System Prompts**: Each conversation has a configurable system prompt
- **Chat History Management**: Automatically manages conversation history (keeps last 20 messages + system prompt)
- **Error Handling**: Graceful handling of Telegram webhook errors and LM Studio API failures
- **Polling Mode**: Uses long-polling as the primary connection method with automatic error recovery
- **Type Indicators**: Shows typing action while AI is generating responses
- **Access Control**: Configurable chat ID whitelist for access control
- **Graceful Shutdown**: Clean shutdown on SIGINT/SIGTERM signals

## Prerequisites

- Node.js 18+ installed
- LM Studio installed and running locally
- A Telegram Bot Token (get one from [@BotFather](https://t.me/BotFather))

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Ib-R/telegram-lm-interface.git
cd telegram-lm-interface
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project directory with your configuration:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
CHAT_ID_ALLOWED_LIST=123456789,987654321
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=llama3.1
```

**Environment Variables Explained:**

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from @BotFather (required)
- `CHAT_ID_ALLOWED_LIST`: Comma-separated list of Telegram chat IDs allowed to use the bot. If not set, all chats are allowed.
- `LM_STUDIO_URL`: The URL where LM Studio is running (default: http://localhost:1234)
- `LM_STUDIO_MODEL`: The default model name to use (default: llama3.1)

### 3. Start the Bot

```bash
npm start
```

Then start a new chat in LM Studio with your default model or select any compatible model.

## Usage

### Basic Commands

| Command | Description |
|---------|-------------|
| `/model` | Shows the currently active model |
| `/set-model <name>` | Changes to a different model |

### Chatting

Simply send messages to the bot (excluding commands starting with `/`). The bot will:
1. Add your message to conversation history
2. Send it to the configured LM Studio instance
3. Receive and forward the AI's response back to you

### Context Window

- Maximum conversation context: 21 messages (1 system prompt + 20 recent messages)
- Older messages are automatically discarded to stay within limits

## Project Structure

```
telegram-lm-interface/
├── index.js          # Main entry point and bot logic
├── package.json      # Node.js dependencies and scripts
├── .env.example      # Example environment variables
├── README.md         # This file
└── .clinerules       # Coding guidelines and best practices
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Telegram API**: `node-telegram-bot-api`
- **LLM Inference**: LM Studio API
- **Environment Config**: dotenv

## Configuration Examples

### Multi-Model Setup

To use different models for different tasks:

```env
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=mistral-7b-instruct-v0.2
```

Then switch models during conversation:

```
/set-model llama3.1
```

### Restricted Access

To limit bot access to specific chats:

```env
CHAT_ID_ALLOWED_LIST=567890123,901234567
```

## Error Handling

The bot gracefully handles:
- HTTP 401 errors from Telegram webhook endpoints
- LM Studio connection failures
- Invalid API responses
- Unauthorized chat IDs

When webhook polling fails, the bot automatically falls back to long-polling mode.

## Troubleshooting

### Bot not responding

1. Verify your `.env` file is properly configured
2. Ensure LM Studio is running on the specified URL
3. Check that `TELEGRAM_BOT_TOKEN` is set correctly
4. Review console output for error messages

### Model changes are not taking effect

1. Confirm the model name matches exactly what's in LM Studio
2. Try switching to a different model with `/set-model <model-name>`
3. Check LM Studio API logs for compatibility issues

## Development Guidelines

See [.clinerules](./.clinerules) for:
- Code style conventions
- Security best practices
- Testing guidelines
- Architecture patterns

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following `.clinerules`
4. Test locally with `npm start`
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the error messages in the console output
- Review the environment configuration
- Consult LM Studio documentation for API compatibility

## Repository

[github.com/Ib-R/telegram-lm-interface](https://github.com/Ib-R/telegram-lm-interface.git)