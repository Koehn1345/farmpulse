import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Optional scheduled time on a load, so a day's loads can be ordered and
// shown on the calendar as a schedule.
try {
  await pool.query(`ALTER TABLE loads ADD COLUMN IF NOT EXISTS load_time TIME;`);
  console.log('✅ load_time column added to loads');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
