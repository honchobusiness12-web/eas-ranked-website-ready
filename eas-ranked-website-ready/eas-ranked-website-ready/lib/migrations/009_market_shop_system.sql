-- ============================================================
-- EAS Arena — Market Shop System Migration
-- Run this once against your PostgreSQL database after 008.
-- ============================================================

-- ---------------------------------------------------------------------------
-- market_shop_items — master list of all shop items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_shop_items (
  id                SERIAL          PRIMARY KEY,
  guild_id          BIGINT          NOT NULL,
  item_id           TEXT            NOT NULL,
  name              TEXT            NOT NULL,
  description       TEXT,
  type              TEXT            NOT NULL, -- 'badge', 'title', 'cosmetic', 'trophy', 'role'
  rarity            TEXT,                     -- 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'
  badge_id          TEXT,
  role_id           TEXT,
  current_stock     INTEGER         NOT NULL DEFAULT 0,
  max_stock         INTEGER         NOT NULL DEFAULT 100,
  resale_supply     INTEGER         NOT NULL DEFAULT 0,
  is_limited        BOOLEAN         NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
  is_sold_out       BOOLEAN         NOT NULL DEFAULT FALSE,
  base_value        DECIMAL(12,2)   NOT NULL DEFAULT 0,
  current_value     DECIMAL(12,2)   NOT NULL DEFAULT 0,
  min_value         DECIMAL(12,2)   NOT NULL DEFAULT 0,
  max_value         DECIMAL(12,2)   NOT NULL DEFAULT 1000000,
  resale_percent    INTEGER         NOT NULL DEFAULT 80,
  demand_score      DECIMAL(10,2)   NOT NULL DEFAULT 0,
  total_bought      INTEGER         NOT NULL DEFAULT 0,
  total_resold      INTEGER         NOT NULL DEFAULT 0,
  total_traded      INTEGER         NOT NULL DEFAULT 0,
  last_value_update TIMESTAMP,
  created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
  UNIQUE(guild_id, item_id)
);

-- ---------------------------------------------------------------------------
-- market_item_value_history — price chart data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_item_value_history (
  id             SERIAL          PRIMARY KEY,
  guild_id       BIGINT          NOT NULL,
  item_id        TEXT            NOT NULL,
  old_value      DECIMAL(12,2)   NOT NULL,
  new_value      DECIMAL(12,2)   NOT NULL,
  change_amount  DECIMAL(12,2)   NOT NULL,
  change_percent DECIMAL(10,4)   NOT NULL,
  reason         TEXT,           -- 'purchase', 'sold_out', 'resale', 'trade', 'daily_adjustment'
  created_at     TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- market_item_resales — resale transaction log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_item_resales (
  id               SERIAL          PRIMARY KEY,
  guild_id         BIGINT          NOT NULL,
  seller_id        VARCHAR(32)     NOT NULL,
  item_id          TEXT            NOT NULL,
  payout_amount    DECIMAL(12,2)   NOT NULL,
  value_at_resale  DECIMAL(12,2)   NOT NULL,
  resale_percent   INTEGER         NOT NULL,
  created_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- market_item_trades — player-to-player trade log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_item_trades (
  id              SERIAL          PRIMARY KEY,
  guild_id        BIGINT          NOT NULL,
  seller_id       VARCHAR(32)     NOT NULL,
  buyer_id        VARCHAR(32)     NOT NULL,
  item_id         TEXT            NOT NULL,
  trade_price     DECIMAL(12,2)   NOT NULL,
  currency_type   TEXT,           -- 'sp', 'cash', 'item'
  value_at_trade  DECIMAL(12,2)   NOT NULL,
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_market_shop_items_guild_id
  ON market_shop_items(guild_id);

CREATE INDEX IF NOT EXISTS idx_market_shop_items_item_id
  ON market_shop_items(item_id);

CREATE INDEX IF NOT EXISTS idx_market_item_value_history_item_id
  ON market_item_value_history(item_id);

CREATE INDEX IF NOT EXISTS idx_market_item_value_history_created_at
  ON market_item_value_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_item_resales_item_id
  ON market_item_resales(item_id);

CREATE INDEX IF NOT EXISTS idx_market_item_trades_item_id
  ON market_item_trades(item_id);
