import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { inventoryRows, summarizeInventory } from '../db/inventory.js';

const router = Router();

// Dashboard - admin only
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const fid = req.farmId;
    // Optional ?year= filter. Income/expenses/loads are matched on their
    // date's calendar year; inventory on the commodity's season year.
    // $2 is NULL when no year is given, which disables every filter.
    const year = parseInt(req.query.year, 10) || null;
    const inYear = (col) => `($2::int IS NULL OR EXTRACT(YEAR FROM ${col}) = $2)`;

    const [incomeRes, expenseRes, loadsRes, recentRes, fieldIncomeRes, invRows, yearsRes] = await Promise.all([
      // Realized income - actual money received, one row per hauled load
      // (plus any manual entries). This is real, not projected.
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM income WHERE farm_id=$1 AND deleted_at IS NULL AND ${inYear('date')}`, [fid, year]),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE farm_id=$1 AND deleted_at IS NULL AND ${inYear('date')}`, [fid, year]),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type='Forage') as forage,
        COUNT(*) FILTER (WHERE type='Grain') as grain,
        COALESCE(SUM(net_weight)/2000, 0) as net_tons
        FROM loads WHERE farm_id=$1 AND deleted_at IS NULL AND ${inYear('date')}`, [fid, year]),
      pool.query(`SELECT l.*, c.company_name as customer_name, f.field_name
        FROM loads l
        LEFT JOIN customers c ON c.id = l.customer_id
        LEFT JOIN fields f ON f.id = l.field_id
        WHERE l.farm_id=$1 AND l.deleted_at IS NULL AND ${inYear('l.date')}
        ORDER BY l.date DESC, l.created_at DESC LIMIT 5`, [fid, year]),
      pool.query(`SELECT i.field_id, f.field_name, COALESCE(SUM(i.amount),0) as value
        FROM income i LEFT JOIN fields f ON f.id = i.field_id
        WHERE i.farm_id=$1 AND i.deleted_at IS NULL AND ${inYear('i.date')}
        GROUP BY i.field_id, f.field_name ORDER BY value DESC`, [fid, year]),
      // Own-farm commodities only (outside shippers' fields excluded)
      inventoryRows(fid, year),
      // Every year that has any data, for the dashboard's year picker
      pool.query(`SELECT DISTINCT y FROM (
          SELECT EXTRACT(YEAR FROM date)::int AS y FROM income WHERE farm_id=$1 AND deleted_at IS NULL
          UNION SELECT EXTRACT(YEAR FROM date)::int FROM expenses WHERE farm_id=$1 AND deleted_at IS NULL
          UNION SELECT EXTRACT(YEAR FROM date)::int FROM loads WHERE farm_id=$1 AND deleted_at IS NULL
          UNION SELECT year FROM commodities WHERE farm_id=$1 AND deleted_at IS NULL AND year IS NOT NULL
        ) t ORDER BY y DESC`, [fid]),
    ]);

    // Freight on loads hauled off this farm's own fields, plus Custom hauls
    // (someone else's product). Loads off an outside shipper's field are
    // reported on the Outside Shippers page.
    const { rows: truckingRows } = await pool.query(
      `SELECT COALESCE(SUM(l.gross_pay), 0) AS total,
         COALESCE(SUM(l.gross_pay) FILTER (WHERE l.type = 'Custom'), 0) AS custom
       FROM loads l
       LEFT JOIN commodities co ON co.id = l.commodity_id
       LEFT JOIN fields f ON f.id = COALESCE(l.field_id, co.field_id)
       WHERE l.farm_id = $1 AND l.deleted_at IS NULL AND f.shipper_id IS NULL AND ${inYear('l.date')}`,
      [fid, year]
    );
    const totalIncome = parseFloat(incomeRes.rows[0].total);
    const totalExpenses = parseFloat(expenseRes.rows[0].total);
    const loads = loadsRes.rows[0];

    const inv = summarizeInventory(invRows);
    const { withRemaining, contractedInventoryValue } = inv;

    // Realized income and unshipped inventory value side by side per field,
    // so the farm's projected income for the season can be broken down by
    // field. Rows with no field land in a "No Field" bucket so the per-field
    // totals always add up to the stat cards.
    const byField = {};
    const fieldEntry = (id, name) => (byField[id ?? 'none'] ??= { name: name || 'No Field', realized: 0, inventory: 0 });
    for (const r of fieldIncomeRes.rows) fieldEntry(r.field_id, r.field_name).realized += parseFloat(r.value);
    for (const r of withRemaining) fieldEntry(r.field_id, r.field_name).inventory += r.remainingValue;
    const fieldIncome = Object.values(byField)
      .filter(f => f.realized || f.inventory)
      .sort((a, b) => (b.realized + b.inventory) - (a.realized + a.inventory));

    res.json({
      years: yearsRes.rows.map(r => r.y),
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      contractedInventoryValue,
      projectedIncome: totalIncome + contractedInventoryValue,
      projectedNetProfit: totalIncome + contractedInventoryValue - totalExpenses,
      totalLoads: parseInt(loads.total),
      forageLoads: parseInt(loads.forage),
      grainLoads: parseInt(loads.grain),
      totalNetTons: parseFloat(loads.net_tons).toFixed(1),
      fieldIncome,
      truckingIncome: parseFloat(truckingRows[0].total),
      customTruckingIncome: parseFloat(truckingRows[0].custom),
      recentLoads: recentRes.rows,
      tonsByCutting: inv.tonsByCutting,
      tonsByType: inv.tonsByType,
      tonsByStackCommodity: inv.tonsByStackCommodity,
      tonsByGrainCommodity: inv.tonsByGrainCommodity,
      estByCutting: inv.estByCutting,
      estByType: inv.estByType,
      estByCommodity: inv.estByCommodity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Team management - admin only
router.get('/team', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM farm_users WHERE farm_id=$1 ORDER BY created_at',
    [req.farmId]
  );
  res.json(rows);
});

router.put('/team/:clerkUserId/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'employee', 'trucker'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (role !== 'admin') {
    const { rows: target } = await pool.query(
      'SELECT role FROM farm_users WHERE clerk_user_id=$1 AND farm_id=$2',
      [req.params.clerkUserId, req.farmId]
    );
    if (target[0]?.role === 'admin') {
      const { rows: adminCount } = await pool.query(
        "SELECT COUNT(*) FROM farm_users WHERE farm_id=$1 AND role='admin'",
        [req.farmId]
      );
      if (parseInt(adminCount[0].count, 10) <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin on this farm' });
      }
    }
  }
  const { rows } = await pool.query(
    'UPDATE farm_users SET role=$1 WHERE clerk_user_id=$2 AND farm_id=$3 RETURNING *',
    [role, req.params.clerkUserId, req.farmId]
  );
  res.json(rows[0]);
});

// Farm info
router.get('/farm', async (req, res) => {
  res.json({
    ...req.farm,
    role: req.userRole,
  });
});

router.put('/farm', requireAdmin, async (req, res) => {
  const { name } = req.body;
  const { rows } = await pool.query(
    'UPDATE farms SET name=$1 WHERE id=$2 RETURNING *',
    [name, req.farmId]
  );
  res.json(rows[0]);
});

export default router;
