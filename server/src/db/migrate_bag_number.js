import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE commodities ADD COLUMN IF NOT EXISTS bag_number TEXT;
  `);
  console.log('✅ bag_number column added to commodities table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
