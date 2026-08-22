import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Dashboard - admin only
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const fid = req.farmId;

    // Projected income is the commodity's full estimated tonnage x its
    // price per ton - it reflects what the whole stack/crop should be
    // worth, not what's accrued so far from loads actually hauled.
    const estTonsExpr = `(CASE WHEN c.type = 'Forage' THEN c.estimated_stack_tonnage ELSE c.estimated_total_tons END)`;

    const [incomeRes, expenseRes, loadsRes, recentRes, fieldIncomeRes, tonsByCuttingRes, tonsByTypeRes, tonsByStackCommodityRes, tonsByGrainCommodityRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(${estTonsExpr} * c.price_per_ton), 0) as total
        FROM commodities c WHERE c.farm_id=$1 AND c.deleted_at IS NULL`, [fid]),
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE farm_id=$1 AND deleted_at IS NULL', [fid]),
      pool.query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type='Forage') as forage,
        COUNT(*) FILTER (WHERE type='Grain') as grain,
        COALESCE(SUM(net_weight)/2000, 0) as net_tons
        FROM loads WHERE farm_id=$1 AND deleted_at IS NULL`, [fid]),
      pool.query(`SELECT l.*, c.company_name as customer_name, f.field_name
        FROM loads l
        LEFT JOIN customers c ON c.id = l.customer_id
        LEFT JOIN fields f ON f.id = l.field_id
        WHERE l.farm_id=$1 AND l.deleted_at IS NULL
        ORDER BY l.date DESC, l.created_at DESC LIMIT 5`, [fid]),
      pool.query(`SELECT f.field_name, COALESCE(SUM(${estTonsExpr} * c.price_per_ton), 0) as value
        FROM commodities c JOIN fields f ON f.id = c.field_id
        WHERE c.farm_id=$1 AND c.deleted_at IS NULL
        GROUP BY f.field_name ORDER BY value DESC`, [fid]),
      pool.query(`SELECT co.cutting as name, COALESCE(SUM(l.net_weight)/2000, 0) as tons
        FROM loads l JOIN commodities co ON co.id = l.commodity_id
        WHERE l.farm_id=$1 AND l.deleted_at IS NULL AND l.type='Forage' AND co.cutting IS NOT NULL
        GROUP BY co.cutting ORDER BY co.cutting`, [fid]),
      pool.query(`SELECT co.forage_grade as name, COALESCE(SUM(l.net_weight)/2000, 0) as tons
        FROM loads l JOIN commodities co ON co.id = l.commodity_id
        WHERE l.farm_id=$1 AND l.deleted_at IS NULL AND l.type='Forage' AND co.forage_grade IS NOT NULL
        GROUP BY co.forage_grade ORDER BY tons DESC`, [fid]),
      pool.query(`SELECT co.type_of_forage as name, COALESCE(SUM(l.net_weight)/2000, 0) as tons
        FROM loads l JOIN commodities co ON co.id = l.commodity_id
        WHERE l.farm_id=$1 AND l.deleted_at IS NULL AND l.type='Forage' AND co.type_of_forage IS NOT NULL
        GROUP BY co.type_of_forage ORDER BY tons DESC`, [fid]),
      pool.query(`SELECT co.type_crop as name, COALESCE(SUM(l.net_weight)/2000, 0) as tons
        FROM loads l JOIN commodities co ON co.id = l.commodity_id
        WHERE l.farm_id=$1 AND l.deleted_at IS NULL AND l.type='Grain' AND co.type_crop IS NOT NULL
        GROUP BY co.type_crop ORDER BY tons DESC`, [fid]),
    ]);

    const totalIncome = parseFloat(incomeRes.rows[0].total);
    const totalExpenses = parseFloat(expenseRes.rows[0].total);
    const loads = loadsRes.rows[0];
    const tonsMap = (rows) => rows.map(r => ({ name: r.name, tons: parseFloat(r.tons) }));

    res.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      totalLoads: parseInt(loads.total),
      forageLoads: parseInt(loads.forage),
      grainLoads: parseInt(loads.grain),
      totalNetTons: parseFloat(loads.net_tons).toFixed(1),
      incomeByField: fieldIncomeRes.rows.map(r => ({ name: r.field_name, value: parseFloat(r.value) })),
      recentLoads: recentRes.rows,
      tonsByCutting: tonsMap(tonsByCuttingRes.rows),
      tonsByType: tonsMap(tonsByTypeRes.rows),
      tonsByStackCommodity: tonsMap(tonsByStackCommodityRes.rows),
      tonsByGrainCommodity: tonsMap(tonsByGrainCommodityRes.rows),
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
