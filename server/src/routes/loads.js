import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { syncLoadIncome } from '../db/incomeSync.js';
import { syncLoadExpense } from '../db/expenseSync.js';
import { syncCommodityValuation } from '../db/commodityValuation.js';

const router = Router();

// Freight Rate / Gross Pay are financials — only admins may see them.
// Strip them server-side so non-admin roles never receive them, even in
// the network tab.
function forRole(row, role) {
  if (role === 'admin') return row;
  const { freight_rate, gross_pay, ...rest } = row;
  return rest;
}

// List loads
router.get('/', async (req, res) => {
  try {
    let farmIds = [req.farmId];
    if (req.userRole === 'trucker') {
      const result = await pool.query(
        'SELECT farm_id FROM trucker_farm_links WHERE clerk_user_id = $1',
        [req.clerkUserId]
      );
      farmIds = [...new Set([...farmIds, ...result.rows.map(r => r.farm_id)])];
    }
    const placeholders = farmIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT l.*,
        c.company_name as customer_name,
        f.field_name,
        co.stack_number, co.type_of_forage, co.type_crop,
        fm.name as farm_name
       FROM loads l
       LEFT JOIN customers c ON c.id = l.customer_id
       LEFT JOIN fields f ON f.id = l.field_id
       LEFT JOIN commodities co ON co.id = l.commodity_id
       LEFT JOIN farms fm ON fm.id = l.farm_id
       WHERE l.farm_id IN (${placeholders}) AND l.deleted_at IS NULL
       ORDER BY l.date DESC, l.created_at DESC`,
      farmIds
    );
    res.json(rows.map(r => forRole(r, req.userRole)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create load - any authenticated user
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const isAdmin = req.userRole === 'admin';
    const setRate = isAdmin && ('freight_rate' in b || 'gross_pay' in b);
    const { rows } = await pool.query(
      `INSERT INTO loads (
        farm_id, date, customer_id, commodity_id, field_id,
        shipper, type, bale_count, gross_weight, tare_weight, net_weight,
        driver, truck_number, logged_by_clerk_id,
        bol_number, bol_url, scale_ticket_url, misc_url,
        freight_rate, gross_pay
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [
        req.farmId, b.date, b.customer_id || null, b.commodity_id || null, b.field_id || null,
        b.shipper, b.type, b.bale_count || null,
        b.gross_weight || null, b.tare_weight || null, b.net_weight || null,
        b.driver, b.truck_number, req.clerkUserId,
        b.bol_number || null, b.bol_url || null, b.scale_ticket_url || null, b.misc_url || null,
        setRate ? (b.freight_rate === '' ? null : b.freight_rate ?? null) : null,
        setRate ? (b.gross_pay === '' ? null : b.gross_pay ?? null) : null,
      ]
    );

    // Auto-update actual tonnage on the commodity
    if (b.commodity_id && b.net_weight) {
      await pool.query(
        `UPDATE commodities SET actual_stack_tonnage = (
          SELECT ROUND(SUM(net_weight)/2000, 2) FROM loads
          WHERE commodity_id = $1 AND deleted_at IS NULL
        ) WHERE id = $1`,
        [b.commodity_id]
      );
    }
    await Promise.all([syncLoadIncome(rows[0]), syncLoadExpense(rows[0]), syncCommodityValuation(rows[0].commodity_id)]);
    res.status(201).json(forRole(rows[0], req.userRole));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Edit - any authenticated user
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const isAdmin = req.userRole === 'admin';
    const { rows: beforeRows } = await pool.query(
      'SELECT commodity_id FROM loads WHERE id=$1 AND farm_id=$2', [req.params.id, req.farmId]
    );
    const oldCommodityId = beforeRows[0]?.commodity_id;
    const setParts = [
      'date=$1', 'customer_id=$2', 'commodity_id=$3', 'field_id=$4',
      'shipper=$5', 'type=$6', 'bale_count=$7', 'gross_weight=$8',
      'tare_weight=$9', 'net_weight=$10', 'driver=$11', 'truck_number=$12',
      'bol_number=$13', 'bol_url=$14', 'scale_ticket_url=$15', 'misc_url=$16',
    ];
    const params = [
      b.date, b.customer_id || null, b.commodity_id || null, b.field_id || null,
      b.shipper, b.type, b.bale_count || null, b.gross_weight || null,
      b.tare_weight || null, b.net_weight || null, b.driver, b.truck_number,
      b.bol_number || null, b.bol_url || null, b.scale_ticket_url || null, b.misc_url || null,
    ];
    // Only touch freight_rate/gross_pay when the request actually carries
    // them (the full edit form always does; the driver-update form never
    // does) - otherwise a non-financial edit would wipe out a rate an
    // admin already set.
    if (isAdmin && ('freight_rate' in b || 'gross_pay' in b)) {
      params.push(b.freight_rate === '' ? null : b.freight_rate ?? null);
      setParts.push(`freight_rate=$${params.length}`);
      params.push(b.gross_pay === '' ? null : b.gross_pay ?? null);
      setParts.push(`gross_pay=$${params.length}`);
    } else {
      // net_weight can change through paths that never touch financials
      // (e.g. the trucker/driver "complete this load" flow) - keep
      // gross_pay tracking the load's existing freight_rate so it
      // doesn't go stale relative to the corrected tonnage. Reusing the
      // $10 net_weight placeholder here (instead of a fresh one) made
      // Postgres unable to resolve its type ("could not determine data
      // type of parameter $10") and broke every load save on this path.
      params.push(b.net_weight || null);
      const netIdx = params.length;
      setParts.push(`gross_pay = CASE WHEN freight_rate IS NOT NULL AND $${netIdx}::numeric IS NOT NULL THEN ROUND(($${netIdx}::numeric / 2000) * freight_rate, 2) ELSE gross_pay END`);
    }
    params.push(req.params.id, req.farmId);
    const { rows } = await pool.query(
      `UPDATE loads SET ${setParts.join(', ')}
       WHERE id=$${params.length - 1} AND farm_id=$${params.length} AND deleted_at IS NULL RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    // A load can move between commodities - resync both the old and new
    // one so neither is left with stale actual/estimated value.
    const commodityIds = new Set([oldCommodityId, rows[0].commodity_id].filter(Boolean));
    await Promise.all([
      syncLoadIncome(rows[0]),
      syncLoadExpense(rows[0]),
      ...[...commodityIds].map(id => syncCommodityValuation(id)),
    ]);
    res.json(forRole(rows[0], req.userRole));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE loads SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2 RETURNING commodity_id',
      [req.params.id, req.farmId]
    );
    await pool.query(
      'UPDATE income SET deleted_at=NOW() WHERE load_id=$1 AND deleted_at IS NULL',
      [req.params.id]
    );
    await pool.query(
      'UPDATE expenses SET deleted_at=NOW() WHERE load_id=$1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (rows[0]?.commodity_id) await syncCommodityValuation(rows[0].commodity_id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
