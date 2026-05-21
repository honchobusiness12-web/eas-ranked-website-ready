"""
EAS Arena — Scrim Expiry Task
==============================
Background task that marks active scrim sessions as 'expired' if they
started more than 30 minutes ago.  Runs every 6 hours.

This does NOT delete any data — it only updates the status column so
that the website API stops returning them as active.

Setup:
  1. Add this cog to your bot: bot.load_extension("cogs.scrim_expiry")
  2. Set environment variables:
       DATABASE_URL — PostgreSQL connection string (same as the website)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import asyncpg
import discord
from discord.ext import commands, tasks

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL: str = os.getenv("DATABASE_URL", "")

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cog
# ---------------------------------------------------------------------------


class ScrimExpiry(commands.Cog):
    """Periodically expires scrim sessions older than 30 minutes."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot
        self._pool: asyncpg.Pool | None = None
        self.expire_old_scrims.start()

    async def cog_load(self) -> None:
        if DATABASE_URL:
            try:
                self._pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=3)
                log.info("ScrimExpiry: database pool created.")
            except Exception as exc:
                log.error("ScrimExpiry: failed to create database pool: %s", exc)

    async def cog_unload(self) -> None:
        self.expire_old_scrims.cancel()
        if self._pool:
            await self._pool.close()

    # -----------------------------------------------------------------------
    # Task — runs every 6 hours
    # -----------------------------------------------------------------------

    @tasks.loop(hours=6)
    async def expire_old_scrims(self) -> None:
        """Mark active scrims older than 30 minutes as 'expired'."""
        if not self._pool:
            log.warning("ScrimExpiry: no database pool available, skipping expiry run.")
            return

        try:
            async with self._pool.acquire() as conn:
                result = await conn.execute(
                    """
                    UPDATE scrim_sessions
                    SET status = 'expired'
                    WHERE status = 'active'
                      AND start_time < NOW() - INTERVAL '30 minutes'
                    """
                )
            # asyncpg returns a string like "UPDATE 3"
            count_str = result.split()[-1] if result else "0"
            count = int(count_str) if count_str.isdigit() else 0

            if count > 0:
                log.info(
                    "ScrimExpiry: expired %d stale scrim session(s) at %s.",
                    count,
                    datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
                )
            else:
                log.debug("ScrimExpiry: no stale scrims to expire.")

        except Exception as exc:
            log.error("ScrimExpiry: error during expiry run: %s", exc)

    @expire_old_scrims.before_loop
    async def before_expire(self) -> None:
        await self.bot.wait_until_ready()


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(ScrimExpiry(bot))
