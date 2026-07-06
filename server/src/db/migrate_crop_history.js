import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crop_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
      year INT NOT NULL,
      crop TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_crop_history_field ON crop_history(field_id) WHERE deleted_at IS NULL;
  `);
  console.log('✅ crop_history table created');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
