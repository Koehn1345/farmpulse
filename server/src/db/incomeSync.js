import pool from './pool.js';

// Keeps the income row linked to a load in sync with that load's
// tons hauled x the commodity's price_per_ton. Loads without a priced
// commodity (or without net_weight yet) have no derivable amount, so
// any previously auto-generated income for them is soft-deleted.
export async function syncLoadIncome(load) {
  let amount = null;
  if (load.commodity_id && load.net_weight) {
    const { rows } = await pool.query(
      'SELECT price_per_ton FROM commodities WHERE id = $1',
      [load.commodity_id]
    );
    const price = rows[0]?.price_per_ton;
    if (price) {
      amount = (parseFloat(load.net_weight) / 2000) * parseFloat(price);
    }
  }

  if (amount === null) {
    await pool.query(
      'UPDATE income SET deleted_at = NOW() WHERE load_id = $1 AND deleted_at IS NULL',
      [load.id]
    );
    return;
  }

  const { rows: existing } = await pool.query('SELECT id FROM income WHERE load_id = $1', [load.id]);
  if (existing.length) {
    await pool.query(
      'UPDATE income SET date=$1, customer_id=$2, field_id=$3, amount=$4, deleted_at=NULL WHERE id=$5',
      [load.date, load.customer_id, load.field_id, amount.toFixed(2), existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO income (farm_id, date, customer_id, field_id, amount, load_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [load.farm_id, load.date, load.customer_id, load.field_id, amount.toFixed(2), load.id]
    );
  }
}

// Re-syncs income for every load tied to a commodity — used when a
// commodity's price_per_ton changes so already-logged loads catch up.
export async function syncIncomeForCommodity(commodityId, farmId) {
  const { rows } = await pool.query(
    'SELECT * FROM loads WHERE commodity_id = $1 AND farm_id = $2 AND deleted_at IS NULL',
    [commodityId, farmId]
  );
  for (const load of rows) {
    await syncLoadIncome(load);
  }
}
