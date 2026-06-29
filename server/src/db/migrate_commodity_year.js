import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE commodities
    ADD COLUMN IF NOT EXISTS year INT;
  `);
  await pool.query(`
    UPDATE commodities SET year = EXTRACT(YEAR FROM created_at)::INT WHERE year IS NULL;
  `);
  console.log('✅ year column added to commodities table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
