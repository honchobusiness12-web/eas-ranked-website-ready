import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getBadgesForPlayer, ensureBadgeTables } from '@/lib/badges';

const MAIN_GUILD_ID = '1467697766837915804';

// ---------------------------------------------------------------------------
// GET /api/shop/inventory
// Returns the logged-in user's owned items, badges, and Discord roles
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'You must be logged in to view your inventory.' }, { status: 401 });
  }

  const userId = session.userId;

  try {
    await ensureBadgeTables();

    // Ensure market_user_items table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_user_items (
        id           SERIAL        PRIMARY KEY,
        guild_id     VARCHAR(32)   NOT NULL DEFAULT '${MAIN_GUILD_ID}',
        user_id      VARCHAR(32)   NOT NULL,
        item_id      INTEGER       NOT NULL,
        purchased_at TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE (guild_id, user_id, item_id)
      )
    `);

    // Fetch badges from player_badges with badge_definitions joined
    const badges = await getBadgesForPlayer(userId);

    // Fetch Discord roles from member object
    let discordRoles: Array<{ id: string; name: string; color: string }> = [];
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID ?? MAIN_GUILD_ID;

    if (botToken) {
      try {
        // Fetch member roles
        const memberRes = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
          {
            headers: { Authorization: `Bot ${botToken}` },
            cache: 'no-store',
          }
        );

        if (memberRes.ok) {
          const member = await memberRes.json();
          const memberRoleIds: string[] = member.roles ?? [];

          if (memberRoleIds.length > 0) {
            // Fetch guild roles to get names and colors
            const rolesRes = await fetch(
              `https://discord.com/api/v10/guilds/${guildId}/roles`,
              {
                headers: { Authorization: `Bot ${botToken}` },
                cache: 'no-store',
              }
            );

            if (rolesRes.ok) {
              const allRoles: Array<{ id: string; name: string; color: number }> = await rolesRes.json();
              discordRoles = allRoles
                .filter((r) => memberRoleIds.includes(r.id) && r.name !== '@everyone')
                .map((r) => ({
                  id: r.id,
                  name: r.name,
                  color: r.color
                    ? `#${r.color.toString(16).padStart(6, '0')}`
                    : '#99aab5',
                }));
            }
          }
        }
      } catch (err) {
        console.warn('[shop/inventory] Failed to fetch Discord roles:', err);
      }
    }

    // Fetch purchased shop items (non-badge, non-role categories)
    const itemsResult = await pool.query(
      `SELECT
         mui.id, mui.item_id, mui.purchased_at,
         msi.name, msi.description, msi.price, msi.category, msi.rarity,
         msi.resale_percent, msi.badge_id, msi.role_id,
         msi.min_value, msi.max_value
       FROM market_user_items mui
       JOIN market_shop_items msi ON msi.id = mui.item_id
       WHERE mui.guild_id = $1 AND mui.user_id = $2
       ORDER BY mui.purchased_at DESC`,
      [MAIN_GUILD_ID, userId]
    );

    const allItems = itemsResult.rows;

    // Separate items by category
    const shopItems = allItems.filter(
      (i) => i.category !== 'badge' && i.category !== 'role'
    );

    const total = badges.length + discordRoles.length + shopItems.length;

    return NextResponse.json({
      badges,
      roles: discordRoles,
      items: shopItems,
      total,
    });
  } catch (err) {
    console.error('[api/shop/inventory] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load inventory.' }, { status: 500 });
  }
}
