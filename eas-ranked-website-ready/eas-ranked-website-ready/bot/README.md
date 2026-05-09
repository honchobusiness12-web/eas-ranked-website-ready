# EAS Arena Discord Bot — Giveaway Code Commands

This directory contains the Discord bot cog for managing Premium giveaway codes.

## Setup

### 1. Install dependencies

```bash
pip install discord.py aiohttp
```

### 2. Load the cog in your bot

```python
# In your main bot file (e.g. bot.py)
async def main():
    bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())
    await bot.load_extension("cogs.giveaway_codes")
    await bot.start(os.getenv("DISCORD_BOT_TOKEN"))
```

### 3. Environment variables

| Variable          | Description                                                        |
|-------------------|--------------------------------------------------------------------|
| `OWNER_USER_IDS`  | Comma-separated Discord user IDs allowed to use owner commands     |
| `WEBSITE_API_URL` | Base URL of the Next.js website (e.g. `https://eas-arena.railway.app`) |
| `WEBSITE_API_KEY` | Shared secret — must match `WEBHOOK_SECRET` on the website         |

## Commands

All commands are ephemeral (only visible to the user who ran them).

### `/giveawaycode create <code> <duration> <max_uses> [expires_at]`

Create a new giveaway code.

| Parameter   | Description                                              | Example          |
|-------------|----------------------------------------------------------|------------------|
| `code`      | Code name (letters, numbers, hyphens)                    | `EAS-1WEEK`      |
| `duration`  | Duration: `7d`, `14d`, `30d`, `90d`, `180d`, `365d`     | `30d`            |
| `max_uses`  | Max number of redemptions                                | `5`              |
| `expires_at`| Optional: date the code expires (YYYY-MM-DD)             | `2026-12-31`     |

**Examples:**
```
/giveawaycode create EAS-1WEEK 7d 1 2026-12-31
/giveawaycode create EAS-30DAY 30d 5 2026-12-31
/giveawaycode create EAS-UNLIMITED 90d 1000
```

### `/giveawaycode list`

List all giveaway codes with their status, uses, and expiry.

### `/giveawaycode disable <code>`

Disable a code so it can no longer be redeemed.

### `/giveawaycode info <code>`

View redemption details for a specific code.

## Owner Check

Only users whose Discord ID is in `OWNER_USER_IDS` (or the hardcoded developer ID `733871667788644445`) can run these commands. All other users receive an ephemeral "Access Denied" message.
