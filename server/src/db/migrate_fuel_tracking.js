import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      name_number TEXT NOT NULL,
      make TEXT,
      fuel_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS fuel_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      vehicle_id UUID REFERENCES vehicles(id),
      fuel_type TEXT,
      fuel_location TEXT,
      gallons NUMERIC(10,2),
      logged_by_clerk_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_farm ON vehicles(farm_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_fuel_entries_farm ON fuel_entries(farm_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_fuel_entries_vehicle ON fuel_entries(vehicle_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_fuel_entries_date ON fuel_entries(farm_id, date DESC) WHERE deleted_at IS NULL;
  `);
  console.log('✅ vehicles and fuel_entries tables created');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
