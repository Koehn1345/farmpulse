import pool from './pool.js';

// Per-commodity estimated tonnage and tons already hauled against it, for
// either this farm's own fields (shipperId = null) or one outside
// shipper's fields. year = null means every season.
export async function inventoryRows(farmId, year, shipperId = null) {
  const { rows } = await pool.query(
    `SELECT c.type, c.field_id, f.field_name, c.cutting, c.forage_grade, c.type_of_forage, c.type_crop,
        c.estimated_stack_tonnage, c.estimated_total_tons, c.price_per_ton, c.is_closed,
        COALESCE(lh.hauled_tons, 0) as hauled_tons
      FROM commodities c
      LEFT JOIN (
        SELECT commodity_id, SUM(net_weight)/2000 as hauled_tons
        FROM loads WHERE farm_id=$1 AND deleted_at IS NULL AND commodity_id IS NOT NULL
        GROUP BY commodity_id
      ) lh ON lh.commodity_id = c.id
      LEFT JOIN fields f ON f.id = c.field_id
      WHERE c.farm_id=$1 AND c.deleted_at IS NULL
        AND ($3::uuid IS NULL AND f.shipper_id IS NULL OR f.shipper_id = $3::uuid)
        AND ($2::int IS NULL OR c.year = $2)`,
    [farmId, year, shipperId]
  );
  return rows;
}

const cuttingOrder = ['1st', '2nd', '3rd', '4th', '5th'];
const byTonsDesc = (a, b) => b.tons - a.tons;
const byCutting = (a, b) => cuttingOrder.indexOf(a.name) - cuttingOrder.indexOf(b.name);

const groupTons = (rows, key, measure) => {
  const totals = {};
  for (const r of rows) {
    if (!r[key]) continue;
    totals[r[key]] = (totals[r[key]] || 0) + r[measure];
  }
  return Object.entries(totals).map(([name, tons]) => ({ name, tons }));
};

// Tons left (open commodities only) and total estimated (closed ones
// included, so the starting figure doesn't shrink as stacks finish),
// grouped by cutting / type / commodity.
//
// Contracted inventory value is what's still physically on hand -
// remaining (unshipped) tons x current price per ton, NOT
// commodities.estimated_value (which is actual_value + remaining x price,
// i.e. total contract value including tonnage already shipped).
export function summarizeInventory(rows) {
  const withEstimate = rows.map(r => {
    const estimated = r.type === 'Forage' ? r.estimated_stack_tonnage : r.estimated_total_tons;
    if (estimated == null) return null;
    const remaining = Math.max(parseFloat(estimated) - parseFloat(r.hauled_tons), 0);
    const remainingValue = remaining * (parseFloat(r.price_per_ton) || 0);
    return { ...r, estimated: parseFloat(estimated), remaining, remainingValue };
  }).filter(Boolean);
  const withRemaining = withEstimate.filter(r => !r.is_closed);

  const forage = withRemaining.filter(r => r.type === 'Forage');
  const grain = withRemaining.filter(r => r.type === 'Grain');
  const forageEst = withEstimate.filter(r => r.type === 'Forage');
  const grainEst = withEstimate.filter(r => r.type === 'Grain');

  return {
    withRemaining,
    contractedInventoryValue: withRemaining.reduce((s, r) => s + r.remainingValue, 0),
    tonsByCutting: groupTons(forage, 'cutting', 'remaining').sort(byCutting),
    tonsByType: groupTons(forage, 'forage_grade', 'remaining').sort(byTonsDesc),
    tonsByStackCommodity: groupTons(forage, 'type_of_forage', 'remaining').sort(byTonsDesc),
    tonsByGrainCommodity: groupTons(grain, 'type_crop', 'remaining').sort(byTonsDesc),
    estByCutting: groupTons(forageEst, 'cutting', 'estimated').sort(byCutting),
    estByType: groupTons(forageEst, 'forage_grade', 'estimated').sort(byTonsDesc),
    estByCommodity: [
      ...groupTons(forageEst, 'type_of_forage', 'estimated').sort(byTonsDesc),
      ...groupTons(grainEst, 'type_crop', 'estimated').sort(byTonsDesc),
    ],
  };
}
