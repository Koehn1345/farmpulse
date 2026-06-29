import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE commodities ADD COLUMN IF NOT EXISTS price_per_ton NUMERIC(10,2);
  `);
  await pool.query(`
    ALTER TABLE income ADD COLUMN IF NOT EXISTS load_id UUID REFERENCES loads(id);
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_income_load_id ON income(load_id) WHERE load_id IS NOT NULL;
  `);
  console.log('✅ price_per_ton (commodities) and load_id (income) columns added');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
