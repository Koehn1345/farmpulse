import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// All income routes require admin
router.use(requireAdmin);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, c.company_name as customer_name, f.field_name
     FROM income i
     LEFT JOIN customers c ON c.id = i.customer_id
     LEFT JOIN fields f ON f.id = i.field_id
     WHERE i.farm_id = $1 AND i.deleted_at IS NULL
     ORDER BY i.date DESC`,
    [req.farmId]
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { date, customer_id, field_id, amount, notes } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO income (farm_id, date, customer_id, field_id, amount, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.farmId, date, customer_id || null, field_id || null, amount, notes]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { date, customer_id, field_id, amount, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE income SET date=$1, customer_id=$2, field_id=$3, amount=$4, notes=$5
     WHERE id=$6 AND farm_id=$7 AND deleted_at IS NULL RETURNING *`,
    [date, customer_id || null, field_id || null, amount, notes, req.params.id, req.farmId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query(
    'UPDATE income SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
