import pool from './pool.js';

// Keeps the expense row linked to a load in sync with that load's Gross
// Pay. Loads without a Gross Pay have no derivable expense, so any
// previously auto-generated expense for them is soft-deleted. Matching is
// always done on load_id, never date/vendor/amount, so edits never spawn
// duplicates and never latch onto the wrong row.
export async function syncLoadExpense(load) {
  const amount = load.gross_pay;

  if (amount === null || amount === undefined) {
    await pool.query(
      'UPDATE expenses SET deleted_at = NOW() WHERE load_id = $1 AND deleted_at IS NULL',
      [load.id]
    );
    return;
  }

  const { rows: existing } = await pool.query('SELECT id FROM expenses WHERE load_id = $1', [load.id]);
  if (existing.length) {
    await pool.query(
      'UPDATE expenses SET date=$1, vendor=$2, field_id=$3, amount=$4, deleted_at=NULL WHERE id=$5',
      [load.date, load.shipper || '', load.field_id, amount, existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO expenses (farm_id, date, vendor, field_id, amount, load_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [load.farm_id, load.date, load.shipper || '', load.field_id, amount, load.id]
    );
  }
}
