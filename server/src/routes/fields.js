import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM fields WHERE farm_id = $1 AND deleted_at IS NULL ORDER BY field_name',
    [req.farmId]
  );
  res.json(rows);
});

// Per-field P&L - admin only, mirrors the dashboard's figures for one field.
// Optional ?year= filters income/expenses by their date's calendar year and
// inventory by the commodity's season year.
router.get('/:id/pnl', requireAdmin, async (req, res) => {
  try {
    const params = [req.params.id, req.farmId, parseInt(req.query.year, 10) || null];
    const inYear = (col) => `($3::int IS NULL OR EXTRACT(YEAR FROM ${col}) = $3)`;
    const [incomeRes, expenseRes, inventoryRes, yearsRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM income
        WHERE field_id=$1 AND farm_id=$2 AND deleted_at IS NULL AND ${inYear('date')}`, params),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses
        WHERE field_id=$1 AND farm_id=$2 AND deleted_at IS NULL AND ${inYear('date')}`, params),
      // Same definition as the dashboard's contracted inventory value:
      // unshipped tons on open commodities x current price per ton.
      pool.query(`SELECT COALESCE(SUM(
          GREATEST(CASE WHEN c.type = 'Forage' THEN c.estimated_stack_tonnage ELSE c.estimated_total_tons END
            - COALESCE(lh.hauled_tons, 0), 0) * COALESCE(c.price_per_ton, 0)
        ), 0) as total
        FROM commodities c
        LEFT JOIN (
          SELECT commodity_id, SUM(net_weight)/2000 as hauled_tons
          FROM loads WHERE farm_id=$2 AND deleted_at IS NULL AND commodity_id IS NOT NULL
          GROUP BY commodity_id
        ) lh ON lh.commodity_id = c.id
        WHERE c.field_id=$1 AND c.farm_id=$2 AND c.deleted_at IS NULL AND c.is_closed = false
          AND ($3::int IS NULL OR c.year = $3)`, params),
      // Years with any income/expense for this field, for the year picker
      // (commodity years are already known client-side)
      pool.query(`SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS y FROM income WHERE field_id=$1 AND farm_id=$2 AND deleted_at IS NULL
        UNION SELECT EXTRACT(YEAR FROM date)::int FROM expenses WHERE field_id=$1 AND farm_id=$2 AND deleted_at IS NULL`, params.slice(0, 2)),
    ]);
    const realizedIncome = parseFloat(incomeRes.rows[0].total);
    const expenses = parseFloat(expenseRes.rows[0].total);
    const inventoryValue = parseFloat(inventoryRes.rows[0].total);
    res.json({
      years: yearsRes.rows.map(r => r.y),
      realizedIncome,
      expenses,
      netProfit: realizedIncome - expenses,
      inventoryValue,
      projectedIncome: realizedIncome + inventoryValue,
      projectedNetProfit: realizedIncome + inventoryValue - expenses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { field_name, acres, google_pin, ownership, lease_payment } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO fields (farm_id, field_name, acres, google_pin, ownership, lease_payment) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.farmId, field_name, acres, google_pin, ownership || 'Own', lease_payment || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { field_name, acres, google_pin, ownership, lease_payment } = req.body;
  const { rows } = await pool.query(
    `UPDATE fields SET field_name=$1, acres=$2, google_pin=$3, ownership=$4, lease_payment=$5
     WHERE id=$6 AND farm_id=$7 AND deleted_at IS NULL RETURNING *`,
    [field_name, acres, google_pin, ownership || 'Own', lease_payment || null, req.params.id, req.farmId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.put('/:id/active', requireAdmin, async (req, res) => {
  const { is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE fields SET is_active=$1 WHERE id=$2 AND farm_id=$3 AND deleted_at IS NULL RETURNING *',
    [!!is_active, req.params.id, req.farmId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE fields SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
