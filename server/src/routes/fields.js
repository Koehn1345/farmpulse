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
  const { field_name, acres, google_pin } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO fields (farm_id, field_name, acres, google_pin) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.farmId, field_name, acres, google_pin]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { field_name, acres, google_pin } = req.body;
  const { rows } = await pool.query(
    `UPDATE fields SET field_name=$1, acres=$2, google_pin=$3
     WHERE id=$4 AND farm_id=$5 AND deleted_at IS NULL RETURNING *`,
    [field_name, acres, google_pin, req.params.id, req.farmId]
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
