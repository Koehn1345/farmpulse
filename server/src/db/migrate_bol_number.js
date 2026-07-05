import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE loads ADD COLUMN IF NOT EXISTS bol_number TEXT;
  `);
  console.log('✅ bol_number column added to loads table');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
