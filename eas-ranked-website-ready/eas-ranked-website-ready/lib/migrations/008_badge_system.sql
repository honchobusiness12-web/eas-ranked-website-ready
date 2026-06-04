-- ============================================================
-- EAS Arena — Badge System Migration
-- Run this once against your PostgreSQL database after 007.
-- ============================================================

-- ---------------------------------------------------------------------------
-- badge_definitions — canonical registry of all badge types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badge_definitions (
  id          TEXT         PRIMARY KEY,
  name        TEXT         NOT NULL,
  icon        TEXT         NOT NULL,
  rarity      TEXT         NOT NULL,
  category    TEXT         NOT NULL,
  description TEXT,
  color       TEXT,
  stackable   BOOLEAN      NOT NULL DEFAULT FALSE,
  source      TEXT         NOT NULL DEFAULT 'admin',
  price       INTEGER,
  enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- player_badges — per-player badge assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_badges (
  id           SERIAL       PRIMARY KEY,
  guild_id     BIGINT       NOT NULL,
  user_id      VARCHAR(32)  NOT NULL,
  badge_id     TEXT         NOT NULL REFERENCES badge_definitions(id),
  source       TEXT         NOT NULL DEFAULT 'admin',
  purchased_at TIMESTAMP,
  added_by     VARCHAR(32),
  added_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (guild_id, user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_player_badges_user_id  ON player_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_guild_id ON player_badges(guild_id);
CREATE INDEX IF NOT EXISTS idx_player_badges_badge_id ON player_badges(badge_id);

-- ---------------------------------------------------------------------------
-- badge_audit_log — immutable record of every badge add/remove action
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badge_audit_log (
  id           SERIAL       PRIMARY KEY,
  guild_id     BIGINT       NOT NULL,
  user_id      VARCHAR(32)  NOT NULL,
  badge_id     TEXT         NOT NULL REFERENCES badge_definitions(id),
  action       TEXT         NOT NULL,   -- 'add' | 'remove' | 'purchase'
  performed_by VARCHAR(32)  NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_audit_log_user_id    ON badge_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_audit_log_badge_id   ON badge_audit_log(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_audit_log_created_at ON badge_audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- badge_purchases — market purchase receipts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badge_purchases (
  id           SERIAL       PRIMARY KEY,
  guild_id     BIGINT       NOT NULL,
  user_id      VARCHAR(32)  NOT NULL,
  badge_id     TEXT         NOT NULL REFERENCES badge_definitions(id),
  price_paid   INTEGER      NOT NULL,
  purchased_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_purchases_user_id ON badge_purchases(user_id);

-- ---------------------------------------------------------------------------
-- Seed badge_definitions from the manifest
-- ---------------------------------------------------------------------------
INSERT INTO badge_definitions (id, name, icon, rarity, category, description, color, stackable, source, price)
VALUES
  ('staff',              'Staff',                '/badges/staff.svg',              'legendary', 'staff',           'EAS Arena Staff Member',                '#ff6b6b', FALSE, 'admin',  NULL),
  ('owner',              'Owner',                '/badges/owner.svg',              'mythic',    'owner',           'EAS Arena Owner',                       '#ffd700', FALSE, 'admin',  NULL),
  ('developer',          'Developer',            '/badges/developer.svg',          'legendary', 'developer',       'EAS Arena Developer',                   '#00d4ff', FALSE, 'admin',  NULL),
  ('content_creator',    'Content Creator',      '/badges/content_creator.svg',    'epic',      'content_creator', 'EAS Arena Content Creator',             '#a855f7', FALSE, 'admin',  NULL),
  ('investor',           'Investor',             '/badges/investor.svg',           'rare',      'investor',        'EAS Market Investor',                   '#10b981', FALSE, 'market', NULL),
  ('market_badge_bronze','Bronze Investor Badge','/badges/market_badge_bronze.svg','common',    'market',          'Bronze Investor Badge from Market Shop','#cd7f32', TRUE,  'market', 250000),
  ('market_badge_silver','Silver Investor Badge','/badges/market_badge_silver.svg','uncommon',  'market',          'Silver Investor Badge from Market Shop','#c0c0c0', TRUE,  'market', 500000),
  ('market_badge_gold',  'Gold Investor Badge',  '/badges/market_badge_gold.svg',  'rare',      'market',          'Gold Investor Badge from Market Shop',  '#ffd700', TRUE,  'market', 1000000)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  icon        = EXCLUDED.icon,
  rarity      = EXCLUDED.rarity,
  category    = EXCLUDED.category,
  description = EXCLUDED.description,
  color       = EXCLUDED.color,
  stackable   = EXCLUDED.stackable,
  source      = EXCLUDED.source,
  price       = EXCLUDED.price,
  updated_at  = NOW();
