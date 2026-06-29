import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

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
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create load - any authenticated user
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `INSERT INTO loads (
        farm_id, date, customer_id, commodity_id, field_id,
        shipper, type, bale_count, gross_weight, tare_weight, net_weight,
        driver, truck_number, logged_by_clerk_id,
        bol_url, scale_ticket_url, misc_url
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        req.farmId, b.date, b.customer_id || null, b.commodity_id || null, b.field_id || null,
        b.shipper, b.type, b.bale_count || null,
        b.gross_weight || null, b.tare_weight || null, b.net_weight || null,
        b.driver, b.truck_number, req.clerkUserId,
        b.bol_url || null, b.scale_ticket_url || null, b.misc_url || null,
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
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Edit - admin only
router.put('/:id', requireAdmin, async (req, res) => {
  const b = req.body;
  const { rows } = await pool.query(
    `UPDATE loads SET
      date=$1, customer_id=$2, commodity_id=$3, field_id=$4,
      shipper=$5, type=$6, bale_count=$7, gross_weight=$8,
      tare_weight=$9, net_weight=$10, driver=$11, truck_number=$12,
      bol_url=$13, scale_ticket_url=$14, misc_url=$15
     WHERE id=$16 AND farm_id=$17 AND deleted_at IS NULL RETURNING *`,
    [
      b.date, b.customer_id || null, b.commodity_id || null, b.field_id || null,
      b.shipper, b.type, b.bale_count || null, b.gross_weight || null,
      b.tare_weight || null, b.net_weight || null, b.driver, b.truck_number,
      b.bol_url || null, b.scale_ticket_url || null, b.misc_url || null,
      req.params.id, req.farmId,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE loads SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
