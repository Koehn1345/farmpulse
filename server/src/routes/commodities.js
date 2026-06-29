import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM commodities WHERE farm_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
    [req.farmId]
  );
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const b = req.body;
  const { rows } = await pool.query(
    `INSERT INTO commodities (
      farm_id, type, field_id, year,
      stack_number, type_of_forage, cutting, bale_count, avg_bale_weight_lbs,
      estimated_stack_tonnage, actual_stack_tonnage, test_pdf_url,
      type_crop, seed_details, estimated_tons_per_acre, estimated_total_tons,
      actual_tons, actual_tons_per_acre
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    [
      req.farmId, b.type, b.field_id || null, b.year || new Date().getFullYear(),
      b.stack_number, b.type_of_forage, b.cutting,
      b.bale_count || null, b.avg_bale_weight_lbs || null,
      b.estimated_stack_tonnage || null, b.actual_stack_tonnage || null, b.test_pdf_url || null,
      b.type_crop, b.seed_details,
      b.estimated_tons_per_acre || null, b.estimated_total_tons || null,
      b.actual_tons || null, b.actual_tons_per_acre || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const b = req.body;
  const { rows } = await pool.query(
    `UPDATE commodities SET
      type=$1, field_id=$2, year=$3,
      stack_number=$4, type_of_forage=$5, cutting=$6, bale_count=$7,
      avg_bale_weight_lbs=$8, estimated_stack_tonnage=$9, actual_stack_tonnage=$10,
      type_crop=$11, seed_details=$12, estimated_tons_per_acre=$13,
      estimated_total_tons=$14, actual_tons=$15, actual_tons_per_acre=$16
     WHERE id=$17 AND farm_id=$18 AND deleted_at IS NULL RETURNING *`,
    [
      b.type, b.field_id || null, b.year || new Date().getFullYear(),
      b.stack_number, b.type_of_forage, b.cutting, b.bale_count || null,
      b.avg_bale_weight_lbs || null, b.estimated_stack_tonnage || null, b.actual_stack_tonnage || null,
      b.type_crop, b.seed_details, b.estimated_tons_per_acre || null,
      b.estimated_total_tons || null, b.actual_tons || null, b.actual_tons_per_acre || null,
      req.params.id, req.farmId,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE commodities SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
