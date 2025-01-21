# Telegram Bot

A modular Telegram bot built with Node.js and Telegraf.

## Project Structure
```
src/
├── action/      # Action handlers
├── bot/         # Bot core functionality
├── command/     # Command handlers
├── config/      # Configuration files
├── keyboard/    # Keyboard layouts
├── menu/        # Menu handlers
├── middleware/  # Custom middleware
├── model/       # Data models
└── utils/       # Utility functions
```

## Setup
1. Install dependencies:
```bash
npm install
```

2. Create a .env file with your bot token:
```
BOT_TOKEN=your_bot_token_here
```

3. Run the bot:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```
