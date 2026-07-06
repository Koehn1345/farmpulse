import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE fields
    ADD COLUMN IF NOT EXISTS ownership TEXT,
    ADD COLUMN IF NOT EXISTS lease_payment NUMERIC(10,2);
  `);
  console.log('✅ ownership and lease_payment columns added to fields table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
