#!/usr/bin/env python3
"""
EAS Arena Discord Bot
Main entry point for the bot
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv
import discord
from discord.ext import commands
import asyncpg

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get environment variables
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
DATABASE_URL = os.getenv('DATABASE_URL')
DEVELOPER_USER_ID = int(os.getenv('DEVELOPER_USER_ID', '0'))
STAFF_ROLE_IDS = [int(rid) for rid in os.getenv('STAFF_ROLE_IDS', '').split(',') if rid.strip()]

if not DISCORD_TOKEN:
    logger.error("DISCORD_TOKEN environment variable not set!")
    sys.exit(1)

if not DATABASE_URL:
    logger.error("DATABASE_URL environment variable not set!")
    sys.exit(1)

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.guilds = True

bot = commands.Bot(command_prefix='!', intents=intents)

# Database connection pool
db_pool = None

async def init_db():
    """Initialize database connection pool"""
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        logger.info("✅ Database connection pool created")
    except Exception as e:
        logger.error(f"❌ Failed to create database pool: {e}")
        raise

async def close_db():
    """Close database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("✅ Database connection pool closed")

@bot.event
async def on_ready():
    """Called when the bot is ready"""
    logger.info(f"✅ Bot logged in as {bot.user}")
    logger.info(f"✅ Bot ID: {bot.user.id}")
    logger.info(f"✅ Developer User ID: {DEVELOPER_USER_ID}")
    logger.info(f"✅ Staff Role IDs: {STAFF_ROLE_IDS}")
    
    # Set bot status
    await bot.change_presence(
        activity=discord.Activity(
            type=discord.ActivityType.watching,
            name="EAS Arena Rankings"
        )
    )

@bot.event
async def on_error(event, *args, **kwargs):
    """Handle bot errors"""
    logger.error(f"Error in {event}:", exc_info=True)

@bot.command(name='ping')
async def ping(ctx):
    """Ping command to test bot responsiveness"""
    latency = round(bot.latency * 1000)
    await ctx.send(f"🏓 Pong! Latency: {latency}ms")

@bot.command(name='status')
async def status(ctx):
    """Check bot status and database connection"""
    try:
        # Test database connection
        async with db_pool.acquire() as conn:
            result = await conn.fetchval('SELECT 1')
        
        embed = discord.Embed(
            title="🤖 Bot Status",
            color=discord.Color.green()
        )
        embed.add_field(name="Status", value="✅ Online", inline=False)
        embed.add_field(name="Latency", value=f"{round(bot.latency * 1000)}ms", inline=False)
        embed.add_field(name="Database", value="✅ Connected", inline=False)
        embed.add_field(name="Guilds", value=str(len(bot.guilds)), inline=False)
        
        await ctx.send(embed=embed)
    except Exception as e:
        logger.error(f"Error in status command: {e}")
        await ctx.send(f"❌ Error: {str(e)}")

async def main():
    """Main bot startup function"""
    try:
        logger.info("🚀 Starting EAS Arena Discord Bot...")
        
        # Initialize database
        await init_db()
        
        # Start the bot
        async with bot:
            await bot.start(DISCORD_TOKEN)
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        raise
    finally:
        await close_db()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot shutdown requested")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)
