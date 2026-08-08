import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE fields ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log('✅ is_active column added to fields table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
