import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM crop_history WHERE farm_id = $1 AND deleted_at IS NULL ORDER BY year DESC',
      [req.farmId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { field_id, year, crop, notes } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO crop_history (farm_id, field_id, year, crop, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.farmId, field_id, year, crop, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { year, crop, notes } = req.body;
    const { rows } = await pool.query(
      'UPDATE crop_history SET year=$1, crop=$2, notes=$3 WHERE id=$4 AND farm_id=$5 AND deleted_at IS NULL RETURNING *',
      [year, crop, notes || null, req.params.id, req.farmId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE crop_history SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
      [req.params.id, req.farmId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
