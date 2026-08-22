import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Adds Freight Rate / Gross Pay to loads, and the load_id link on expenses
// so an auto-created expense can be matched back to the load that spawned
// it (never by date/vendor/amount, which can collide or drift).
const schema = `
ALTER TABLE loads ADD COLUMN IF NOT EXISTS freight_rate NUMERIC(10,2);
ALTER TABLE loads ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(12,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS load_id UUID REFERENCES loads(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_load_id ON expenses(load_id) WHERE load_id IS NOT NULL;
`;

try {
  await pool.query(schema);
  console.log('✅ Freight rate / gross pay migration complete');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
