import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin, requireRole } from '../middleware/auth.js';
import { syncIncomeForCommodity } from '../db/incomeSync.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM commodities WHERE farm_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.farmId]
    );
    // Financials are admin-only - strip price_per_ton for other roles
    const sanitized = req.userRole === 'admin' ? rows : rows.map(({ price_per_ton, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireRole('admin', 'employee'), async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `INSERT INTO commodities (
        farm_id, type, field_id, year, price_per_ton,
        stack_number, type_of_forage, cutting, bale_count, avg_bale_weight_lbs,
        estimated_stack_tonnage, actual_stack_tonnage, test_pdf_url, tarp, notes,
        type_crop, seed_details, estimated_tons_per_acre, estimated_total_tons,
        actual_tons, actual_tons_per_acre
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [
        req.farmId, b.type, b.field_id || null, b.year || new Date().getFullYear(), b.price_per_ton || null,
        b.stack_number, b.type_of_forage, b.cutting,
        b.bale_count || null, b.avg_bale_weight_lbs || null,
        b.estimated_stack_tonnage || null, b.actual_stack_tonnage || null, b.test_pdf_url || null,
        b.tarp || null, b.notes || null,
        b.type_crop, b.seed_details,
        b.estimated_tons_per_acre || null, b.estimated_total_tons || null,
        b.actual_tons || null, b.actual_tons_per_acre || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireRole('admin', 'employee'), async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `UPDATE commodities SET
        type=$1, field_id=$2, year=$3, price_per_ton=$4,
        stack_number=$5, type_of_forage=$6, cutting=$7, bale_count=$8,
        avg_bale_weight_lbs=$9, estimated_stack_tonnage=$10, actual_stack_tonnage=$11,
        tarp=$12, notes=$13,
        type_crop=$14, seed_details=$15, estimated_tons_per_acre=$16,
        estimated_total_tons=$17, actual_tons=$18, actual_tons_per_acre=$19
       WHERE id=$20 AND farm_id=$21 AND deleted_at IS NULL RETURNING *`,
      [
        b.type, b.field_id || null, b.year || new Date().getFullYear(), b.price_per_ton || null,
        b.stack_number, b.type_of_forage, b.cutting, b.bale_count || null,
        b.avg_bale_weight_lbs || null, b.estimated_stack_tonnage || null, b.actual_stack_tonnage || null,
        b.tarp || null, b.notes || null,
        b.type_crop, b.seed_details, b.estimated_tons_per_acre || null,
        b.estimated_total_tons || null, b.actual_tons || null, b.actual_tons_per_acre || null,
        req.params.id, req.farmId,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    await syncIncomeForCommodity(rows[0].id, req.farmId);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE commodities SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
      [req.params.id, req.farmId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
