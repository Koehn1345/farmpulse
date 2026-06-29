import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT e.*, f.field_name FROM expenses e
     LEFT JOIN fields f ON f.id = e.field_id
     WHERE e.farm_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.date DESC`,
    [req.farmId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { date, vendor, field_id, amount, notes } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO expenses (farm_id, date, vendor, field_id, amount, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.farmId, date, vendor, field_id || null, amount, notes]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { date, vendor, field_id, amount, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE expenses SET date=$1, vendor=$2, field_id=$3, amount=$4, notes=$5
     WHERE id=$6 AND farm_id=$7 AND deleted_at IS NULL RETURNING *`,
    [date, vendor, field_id || null, amount, notes, req.params.id, req.farmId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query(
    'UPDATE expenses SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
