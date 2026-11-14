import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Product pick list and Delivery Location pick list for loads, plus the
// "Custom" load type (hauling someone else's product: trucking income only).
const sql = `
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_products_farm ON products(farm_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS delivery_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_farm ON delivery_locations(farm_id) WHERE deleted_at IS NULL;

ALTER TABLE loads ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS delivery_location_id UUID REFERENCES delivery_locations(id);

ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_type_check;
ALTER TABLE loads ADD CONSTRAINT loads_type_check CHECK (type IN ('Forage', 'Grain', 'Custom'));
`;

try {
  await pool.query('BEGIN');
  await pool.query(sql);
  await pool.query('COMMIT');
  console.log('✅ products, delivery_locations, load product/location columns, Custom load type');
} catch (err) {
  await pool.query('ROLLBACK').catch(() => {});
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
