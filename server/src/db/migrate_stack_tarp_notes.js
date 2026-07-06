import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE commodities
    ADD COLUMN IF NOT EXISTS tarp TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;
  `);
  console.log('✅ tarp and notes columns added to commodities table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
