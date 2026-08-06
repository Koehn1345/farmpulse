import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE fuel_entries ADD COLUMN IF NOT EXISTS driver TEXT;
  `);
  console.log('✅ driver column added to fuel_entries table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
