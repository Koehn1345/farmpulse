import pool from './pool.js';

// Recomputes a commodity's actual_value and estimated_value.
//
// actual_value is the sum, over every shipped load against this
// commodity, of (net tons x the price effective on that load's date) -
// resolved against commodity_price_history, never today's price. A load
// dated before the earliest history row falls back to that earliest
// row's price (via the COALESCE below) rather than going unpriced -
// every commodity has at least one seeded history row, so this only
// matters for a load that somehow predates the seed itself.
//
// estimated_value is actual_value plus whatever tonnage hasn't shipped
// yet (estimated - shipped, floored at 0), valued at the commodity's
// current price.
export async function syncCommodityValuation(commodityId) {
  if (!commodityId) return;

  const { rows: cRows } = await pool.query(
    'SELECT type, estimated_stack_tonnage, estimated_total_tons, price_per_ton, is_closed FROM commodities WHERE id=$1',
    [commodityId]
  );
  const commodity = cRows[0];
  if (!commodity) return;

  // Same-day price corrections break ties on created_at DESC (latest entry
  // wins) - must match the tiebreak used by GET /:id/price-history and the
  // client's priceAtDate, or the persisted value can silently disagree
  // with what the UI displays for that date.
  const { rows: valRows } = await pool.query(
    `SELECT
       COALESCE(SUM(
         (l.net_weight / 2000) * COALESCE(
           (SELECT h.price_per_ton FROM commodity_price_history h
            WHERE h.commodity_id = l.commodity_id AND h.effective_date <= l.date
            ORDER BY h.effective_date DESC, h.created_at DESC LIMIT 1),
           (SELECT h2.price_per_ton FROM commodity_price_history h2
            WHERE h2.commodity_id = l.commodity_id
            ORDER BY h2.effective_date ASC, h2.created_at ASC LIMIT 1)
         )
       ), 0) AS actual_value,
       COALESCE(SUM(l.net_weight) / 2000, 0) AS shipped_tons
     FROM loads l
     WHERE l.commodity_id = $1 AND l.deleted_at IS NULL AND l.net_weight IS NOT NULL`,
    [commodityId]
  );
  const actualValue = parseFloat(valRows[0].actual_value);
  const shippedTons = parseFloat(valRows[0].shipped_tons);

  // A closed stack's value is final - shortfall from spoilage/feed-out is
  // expected, not an estimate still to be realized, so don't keep valuing
  // its unshipped remainder at current price once it's closed.
  const estimatedTons = commodity.type === 'Forage' ? commodity.estimated_stack_tonnage : commodity.estimated_total_tons;
  const remainingTons = !commodity.is_closed && estimatedTons != null ? Math.max(parseFloat(estimatedTons) - shippedTons, 0) : 0;
  const currentPrice = parseFloat(commodity.price_per_ton) || 0;
  const estimatedValue = actualValue + remainingTons * currentPrice;

  await pool.query(
    'UPDATE commodities SET actual_value=$1, estimated_value=$2 WHERE id=$3',
    [actualValue.toFixed(2), estimatedValue.toFixed(2), commodityId]
  );
}

// Re-resolves the commodity's "current" price/buyer (as of today) from
// its price history and writes them onto the commodities row, so the
// rest of the app can keep reading commodities.price_per_ton directly
// instead of re-resolving history on every read.
export async function refreshCurrentPrice(commodityId) {
  const { rows } = await pool.query(
    `SELECT price_per_ton, buyer_customer_id FROM commodity_price_history
     WHERE commodity_id=$1 AND effective_date <= CURRENT_DATE
     ORDER BY effective_date DESC, created_at DESC LIMIT 1`,
    [commodityId]
  );
  let current = rows[0];
  if (!current) {
    // Nothing is effective yet (e.g. every history row is future-dated).
    // Only backfill from the earliest row when it's the commodity's ONLY
    // entry - otherwise a legitimate current price already exists from an
    // earlier row, and adopting a future price early would be wrong.
    const { rows: all } = await pool.query(
      `SELECT price_per_ton, buyer_customer_id FROM commodity_price_history
       WHERE commodity_id=$1 ORDER BY effective_date ASC, created_at ASC`,
      [commodityId]
    );
    if (all.length === 1) current = all[0];
  }
  if (!current) return;
  await pool.query(
    'UPDATE commodities SET price_per_ton=$1, buyer_customer_id=$2 WHERE id=$3',
    [current.price_per_ton, current.buyer_customer_id, commodityId]
  );
}
