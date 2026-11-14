import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Pickup locations for Custom loads - kept apart from the farm's fields so
// someone else's ground never shows up on the Fields page or farm loads.
const sql = `
CREATE TABLE IF NOT EXISTS pickup_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pickup_locations_farm ON pickup_locations(farm_id) WHERE deleted_at IS NULL;
ALTER TABLE loads ADD COLUMN IF NOT EXISTS pickup_location_id UUID REFERENCES pickup_locations(id);
`;

try {
  await pool.query('BEGIN');
  await pool.query(sql);
  await pool.query('COMMIT');
  console.log('✅ pickup_locations table and loads.pickup_location_id');
} catch (err) {
  await pool.query('ROLLBACK').catch(() => {});
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
