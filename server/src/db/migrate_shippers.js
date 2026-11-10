import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Outside shippers (e.g. a brother's farm). Fields attached to a shipper
// carry their own stacks/bags and loads, but none of it counts toward this
// farm's income or expenses - only the trucking charge is tracked, in its
// own Trucking Income section.
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shippers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_shippers_farm ON shippers(farm_id) WHERE deleted_at IS NULL;
    ALTER TABLE fields ADD COLUMN IF NOT EXISTS shipper_id UUID REFERENCES shippers(id);
  `);
  console.log('✅ shippers table and fields.shipper_id added');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
