import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, v.name_number as vehicle_name
       FROM fuel_entries f
       LEFT JOIN vehicles v ON v.id = f.vehicle_id
       WHERE f.farm_id = $1 AND f.deleted_at IS NULL
       ORDER BY f.date DESC, f.created_at DESC`,
      [req.farmId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create - any authenticated user (drivers log their own fill-ups)
router.post('/', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `INSERT INTO fuel_entries (farm_id, date, vehicle_id, fuel_type, fuel_location, gallons, logged_by_clerk_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.farmId, b.date, b.vehicle_id || null, b.fuel_type || null, b.fuel_location || null, b.gallons || null, req.clerkUserId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Edit - any authenticated user
router.put('/:id', async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await pool.query(
      `UPDATE fuel_entries SET date=$1, vehicle_id=$2, fuel_type=$3, fuel_location=$4, gallons=$5
       WHERE id=$6 AND farm_id=$7 AND deleted_at IS NULL RETURNING *`,
      [b.date, b.vehicle_id || null, b.fuel_type || null, b.fuel_location || null, b.gallons || null, req.params.id, req.farmId]
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
    await pool.query('UPDATE fuel_entries SET deleted_at=NOW() WHERE id=$1 AND farm_id=$2', [req.params.id, req.farmId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
