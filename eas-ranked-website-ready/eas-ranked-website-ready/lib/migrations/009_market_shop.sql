-- ============================================================
-- EAS Arena — Market Shop Migration
-- Run this once against your PostgreSQL database after 008.
-- ============================================================

-- ---------------------------------------------------------------------------
-- market_shop_items — master list of all shop items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_shop_items (
  id                SERIAL       PRIMARY KEY,
  guild_id          BIGINT       NOT NULL,
  item_id           TEXT         NOT NULL UNIQUE,
  name              TEXT         NOT NULL,
  description       TEXT,
  type              TEXT         NOT NULL, -- 'badge', 'role', 'cosmetic', 'title', 'trophy'
  rarity            TEXT,                  -- 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'
  badge_id          TEXT,
  role_id           TEXT,
  current_stock     INTEGER      NOT NULL DEFAULT 0,
  max_stock         INTEGER      NOT NULL DEFAULT 100,
  resale_supply     INTEGER      NOT NULL DEFAULT 0,
  is_limited        BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  is_sold_out       BOOLEAN      NOT NULL DEFAULT FALSE,
  base_value        BIGINT       NOT NULL DEFAULT 100000,
  current_value     BIGINT       NOT NULL DEFAULT 100000,
  min_value         BIGINT       NOT NULL DEFAULT 50000,
  max_value         BIGINT       NOT NULL DEFAULT 500000,
  resale_percent    INTEGER      NOT NULL DEFAULT 80,
  demand_score      DECIMAL(10,2) NOT NULL DEFAULT 1.0,
  total_bought      INTEGER      NOT NULL DEFAULT 0,
  total_resold      INTEGER      NOT NULL DEFAULT 0,
  total_traded      INTEGER      NOT NULL DEFAULT 0,
  last_value_update TIMESTAMP,
  created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_shop_items_guild_id ON market_shop_items(guild_id);
CREATE INDEX IF NOT EXISTS idx_market_shop_items_item_id  ON market_shop_items(item_id);
CREATE INDEX IF NOT EXISTS idx_market_shop_items_active   ON market_shop_items(is_active);

-- ---------------------------------------------------------------------------
-- market_item_value_history — price chart data
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_item_value_history (
  id             SERIAL       PRIMARY KEY,
  guild_id       BIGINT       NOT NULL,
  item_id        TEXT         NOT NULL,
  old_value      BIGINT       NOT NULL,
  new_value      BIGINT       NOT NULL,
  change_amount  BIGINT       NOT NULL,
  change_percent DECIMAL(10,2) NOT NULL,
  reason         TEXT,        -- 'purchase', 'resale', 'trade', 'daily_adjustment', 'manual_edit'
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_item_value_history_item_id    ON market_item_value_history(item_id);
CREATE INDEX IF NOT EXISTS idx_market_item_value_history_created_at ON market_item_value_history(created_at DESC);

-- ---------------------------------------------------------------------------
-- market_item_resales — resale transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_item_resales (
  id              SERIAL       PRIMARY KEY,
  guild_id        BIGINT       NOT NULL,
  seller_id       VARCHAR(32)  NOT NULL,
  item_id         TEXT         NOT NULL,
  payout_amount   BIGINT       NOT NULL,
  value_at_resale BIGINT       NOT NULL,
  resale_percent  INTEGER      NOT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_item_resales_item_id   ON market_item_resales(item_id);
CREATE INDEX IF NOT EXISTS idx_market_item_resales_seller_id ON market_item_resales(seller_id);

-- ---------------------------------------------------------------------------
-- market_item_trades — player-to-player trades
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_item_trades (
  id             SERIAL       PRIMARY KEY,
  guild_id       BIGINT       NOT NULL,
  seller_id      VARCHAR(32)  NOT NULL,
  buyer_id       VARCHAR(32)  NOT NULL,
  item_id        TEXT         NOT NULL,
  trade_price    BIGINT       NOT NULL,
  currency_type  TEXT         NOT NULL, -- 'sp', 'cash', 'item'
  value_at_trade BIGINT       NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_item_trades_item_id   ON market_item_trades(item_id);
CREATE INDEX IF NOT EXISTS idx_market_item_trades_seller_id ON market_item_trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_item_trades_buyer_id  ON market_item_trades(buyer_id);
