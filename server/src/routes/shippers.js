import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { shipperStats } from '../db/shippers.js';

const router = Router();
router.use(requireAdmin);

// List with trucking totals; optional ?year=
router.get('/', async (req, res) => {
  try {
    res.json(await shipperStats(req.farmId, parseInt(req.query.year, 10) || null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, contact_name, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    'INSERT INTO shippers (farm_id, name, contact_name, phone, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.farmId, name, contact_name || null, phone || null, notes || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, contact_name, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { rows } = await pool.query(
    `UPDATE shippers SET name=$1, contact_name=$2, phone=$3, notes=$4
     WHERE id=$5 AND farm_id=$6 AND deleted_at IS NULL RETURNING *`,
    [name, contact_name || null, phone || null, notes || null, req.params.id, req.farmId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Refuse while fields are still attached - silently detaching them would
// suddenly pull the brother's stacks and loads into this farm's income.
router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS n FROM fields WHERE shipper_id=$1 AND farm_id=$2 AND deleted_at IS NULL',
    [req.params.id, req.farmId]
  );
  if (rows[0].n > 0) {
    return res.status(400).json({ error: 'This shipper still has fields. Move or delete them first.' });
  }
  await pool.query('UPDATE shippers SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2', [req.params.id, req.farmId]);
  res.json({ success: true });
});

export default router;
