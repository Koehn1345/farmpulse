import pool from './pool.js';
import { syncCommodityValuation } from './commodityValuation.js';

// One-off data backfill (no schema change) - recomputes
// actual_stack_tonnage/actual_tons, and as a side effect
// actual_value/estimated_value, for every existing commodity from its
// current loads.
//
// Needed because the old tonnage rollup only ever ran on load creation
// with net_weight already present. Most loads are created empty and get
// net_weight added later via Driver Update (a PUT), which never
// triggered any rollup - so nearly every commodity was left at NULL.
// See server/src/routes/loads.js and server/src/db/commodityValuation.js
// for the ongoing fix (now applied on load create/edit/delete alike).
//
// Reuses syncCommodityValuation directly rather than reimplementing the
// SQL, so this backfill can't drift from what the live code path does.
try {
  const { rows } = await pool.query('SELECT id FROM commodities WHERE deleted_at IS NULL');
  for (const { id } of rows) {
    await syncCommodityValuation(id);
  }
  const { rows: summary } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'Forage' AND actual_stack_tonnage IS NOT NULL) AS forage_with_tonnage,
       COUNT(*) FILTER (WHERE type = 'Forage') AS forage_total,
       COUNT(*) FILTER (WHERE type = 'Grain' AND actual_tons IS NOT NULL) AS grain_with_tonnage,
       COUNT(*) FILTER (WHERE type = 'Grain') AS grain_total
     FROM commodities WHERE deleted_at IS NULL`
  );
  const s = summary[0];
  console.log(`✅ Backfilled ${rows.length} commodities.`);
  console.log(`   Forage: ${s.forage_with_tonnage}/${s.forage_total} now have actual_stack_tonnage`);
  console.log(`   Grain:  ${s.grain_with_tonnage}/${s.grain_total} now have actual_tons`);
} catch (err) {
  console.error('Backfill failed:', err.message);
} finally {
  await pool.end();
}
