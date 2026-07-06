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

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE fields SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
