import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Contracted-value tracking for commodities: a buyer, current price, and
// server-computed estimated/actual dollar value, plus a manual closed
// flag. price_per_ton already exists on commodities (pre-existing
// column) - only buyer/value/closed are new.
const schema = `
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS buyer_customer_id UUID REFERENCES customers(id);
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(12,2);
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS actual_value NUMERIC(12,2);
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;

-- Forward-only price/buyer history. Price changes never overwrite this
-- table, only append to it, so a load's value can always be resolved
-- against the price that was actually effective on its date.
CREATE TABLE IF NOT EXISTS commodity_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id UUID NOT NULL REFERENCES commodities(id) ON DELETE CASCADE,
  price_per_ton NUMERIC(10,2) NOT NULL,
  buyer_customer_id UUID REFERENCES customers(id),
  effective_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_clerk_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_commodity_price_history_commodity ON commodity_price_history(commodity_id, effective_date DESC);
`;

// Seed one history row per existing priced commodity, using its
// created_at date as the effective date - the best available guess for
// "when this price became effective" given no real history exists yet.
// Idempotent (skips commodities that already have a history row), so
// re-running this migration is harmless.
const seed = `
INSERT INTO commodity_price_history (commodity_id, price_per_ton, buyer_customer_id, effective_date, note)
SELECT c.id, c.price_per_ton, c.buyer_customer_id, COALESCE(c.created_at::date, CURRENT_DATE),
  'Seeded from existing price at migration time'
FROM commodities c
WHERE c.price_per_ton IS NOT NULL AND c.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM commodity_price_history h WHERE h.commodity_id = c.id);
`;

// Backfills estimated_value/actual_value for every existing commodity, so
// the Dashboard's Contracted Inventory Value and the Commodities page's
// new columns aren't silently blank until something else happens to
// touch each row. Mirrors syncCommodityValuation's logic as a single
// set-based query rather than looping per commodity.
const backfillValuation = `
WITH commodity_actuals AS (
  SELECT c.id,
    COALESCE(SUM(
      (l.net_weight / 2000) * COALESCE(
        (SELECT h.price_per_ton FROM commodity_price_history h
         WHERE h.commodity_id = c.id AND h.effective_date <= l.date
         ORDER BY h.effective_date DESC, h.created_at DESC LIMIT 1),
        (SELECT h2.price_per_ton FROM commodity_price_history h2
         WHERE h2.commodity_id = c.id
         ORDER BY h2.effective_date ASC, h2.created_at ASC LIMIT 1)
      )
    ), 0) AS actual_value,
    COALESCE(SUM(l.net_weight) / 2000, 0) AS shipped_tons
  FROM commodities c
  LEFT JOIN loads l ON l.commodity_id = c.id AND l.deleted_at IS NULL AND l.net_weight IS NOT NULL
  WHERE c.deleted_at IS NULL
  GROUP BY c.id
)
UPDATE commodities c SET
  actual_value = ca.actual_value,
  estimated_value = ca.actual_value + (
    CASE WHEN c.is_closed THEN 0
    ELSE GREATEST(
      COALESCE(CASE WHEN c.type = 'Forage' THEN c.estimated_stack_tonnage ELSE c.estimated_total_tons END, 0) - ca.shipped_tons,
      0
    )
    END
  ) * COALESCE(c.price_per_ton, 0)
FROM commodity_actuals ca
WHERE c.id = ca.id;
`;

try {
  await pool.query(schema);
  const { rowCount: seeded } = await pool.query(seed);
  const { rowCount: valued } = await pool.query(backfillValuation);
  console.log(`✅ Commodity valuation migration complete (${seeded} price history rows seeded, ${valued} commodities valued)`);
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
