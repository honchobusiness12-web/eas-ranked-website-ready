# EAS Arena Discord Bot

A Discord bot for the EAS Arena Roblox esports ranking platform.

## Features

- Player ranking management
- Staff commands
- Database integration with PostgreSQL
- Automatic status updates
- Error handling and logging

## Setup

1. Create a `.env` file based on `.env.example`
2. Set your Discord token and database URL
3. Install dependencies: `pip install -r requirements.txt`
4. Run the bot: `python main.py`

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token from Discord Developer Portal
- `DATABASE_URL`: PostgreSQL connection string
- `DEVELOPER_USER_ID`: Developer user ID for special commands (733871667788644445)
- `STAFF_ROLE_IDS`: Comma-separated list of staff role IDs

## Commands

- `!ping` - Check bot latency
- `!status` - Check bot and database status

## Development

The bot uses:
- discord.py 2.3.2 for Discord API interaction
- asyncpg for PostgreSQL database access
- Python 3.11+

## Deployment

The bot is deployed on Railway with:
- Python 3.11 runtime
- Automatic restart on failure (max 5 retries)
- PostgreSQL database connection
- Environment variable configuration
