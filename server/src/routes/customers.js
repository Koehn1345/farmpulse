import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM customers WHERE farm_id = $1 AND deleted_at IS NULL ORDER BY company_name',
    [req.farmId]
  );
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { company_name, contact_name, phone, email, mailing_address } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO customers (farm_id, company_name, contact_name, phone, email, mailing_address)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.farmId, company_name, contact_name, phone, email, mailing_address]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const { company_name, contact_name, phone, email, mailing_address } = req.body;
  const { rows } = await pool.query(
    `UPDATE customers SET company_name=$1, contact_name=$2, phone=$3, email=$4, mailing_address=$5
     WHERE id=$6 AND farm_id=$7 AND deleted_at IS NULL RETURNING *`,
    [company_name, contact_name, phone, email, mailing_address, req.params.id, req.farmId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await pool.query(
    'UPDATE customers SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2',
    [req.params.id, req.farmId]
  );
  res.json({ success: true });
});

export default router;
