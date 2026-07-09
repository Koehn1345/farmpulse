import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE farms
    ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
  `);
  // Grandfather in every farm that already existed before this feature shipped -
  // only farms created from now on should start a real trial countdown.
  await pool.query(`UPDATE farms SET billing_status = 'active' WHERE billing_status = 'trial';`);
  console.log('✅ billing_status/trial_ends_at added to farms; existing farms grandfathered as active');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
