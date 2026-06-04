/**
 * Daily Market Adjustment Cron Job
 *
 * This module exports a handler that can be called from a Next.js API route
 * (e.g. /api/cron/daily-market-adjustment) or from an external scheduler.
 *
 * It recalculates all market shop item values based on 24-hour activity:
 *   - Buy pressure    (+1.5% per purchase in last 24h)
 *   - Resale pressure (-1.25% per resale in last 24h)
 *   - Trade pressure  (deviation of avg trade price from current value)
 *   - Scarcity bonus  (+2–8% depending on stock level)
 *   - Inactivity dip  (-2% if no activity in 24h)
 *
 * Values are clamped between min_value and max_value, and daily moves are
 * capped by rarity tier.
 */

import { runDailyAdjustment } from "@/lib/market-shop";

export interface DailyAdjustmentResult {
  success: boolean;
  processed: number;
  errors: number;
  log: Array<{ item_id: string; old_value: number; new_value: number; pressure: number }>;
  ran_at: string;
}

export async function runDailyMarketAdjustment(): Promise<DailyAdjustmentResult> {
  console.log("[daily-market-adjustment] Starting daily value recalculation…");
  const start = Date.now();

  try {
    const result = await runDailyAdjustment();
    const elapsed = Date.now() - start;

    console.log(
      `[daily-market-adjustment] Done in ${elapsed}ms — ` +
      `processed: ${result.processed}, errors: ${result.errors}, ` +
      `changed: ${result.log.length}`
    );

    return {
      success: true,
      processed: result.processed,
      errors: result.errors,
      log: result.log,
      ran_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[daily-market-adjustment] Fatal error:", err);
    return {
      success: false,
      processed: 0,
      errors: 1,
      log: [],
      ran_at: new Date().toISOString(),
    };
  }
}
