import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Quality/grade classification for Forage stacks (Premium, Dairy Quality,
// Feeder, Utility, Certified Weed-Free, etc.) - distinct from the existing
// type_of_forage (Alfalfa, Timothy...) commodity field.
const schema = `
ALTER TABLE commodities ADD COLUMN IF NOT EXISTS forage_grade TEXT;
`;

try {
  await pool.query(schema);
  console.log('✅ Forage grade migration complete');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
