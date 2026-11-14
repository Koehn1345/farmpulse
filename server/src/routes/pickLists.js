import { Router } from 'express';
import pool from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';

// Simple farm-scoped pick lists used on the load form: products and
// delivery locations. Anyone can read; admins and employees can add,
// rename and remove (same as customers).
function pickListRouter(table, extraCols = []) {
  const router = Router();
  const cols = ['name', ...extraCols];

  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM ${table} WHERE farm_id = $1 AND deleted_at IS NULL ORDER BY LOWER(name)`,
        [req.farmId]
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', requireRole('admin', 'employee'), async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Name is required' });
      // Re-use an existing entry with the same name instead of duplicating it
      const { rows: existing } = await pool.query(
        `SELECT * FROM ${table} WHERE farm_id = $1 AND deleted_at IS NULL AND LOWER(name) = LOWER($2) LIMIT 1`,
        [req.farmId, name]
      );
      if (existing.length) return res.json(existing[0]);
      const values = [req.farmId, name, ...extraCols.map(c => req.body[c] || null)];
      const { rows } = await pool.query(
        `INSERT INTO ${table} (farm_id, ${cols.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
        values
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id', requireRole('admin', 'employee'), async (req, res) => {
    try {
      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'Name is required' });
      const values = [name, ...extraCols.map(c => req.body[c] || null), req.params.id, req.farmId];
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${sets} WHERE id = $${values.length - 1} AND farm_id = $${values.length} AND deleted_at IS NULL RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Soft delete: loads that already use the entry keep showing its name
  router.delete('/:id', requireRole('admin', 'employee'), async (req, res) => {
    try {
      await pool.query(
        `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND farm_id = $2`,
        [req.params.id, req.farmId]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

export const productRoutes = pickListRouter('products');
export const deliveryLocationRoutes = pickListRouter('delivery_locations', ['address']);
