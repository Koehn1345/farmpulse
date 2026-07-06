import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const schema = `
-- Farms (one per Clerk Organization)
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (linked to Clerk user IDs)
CREATE TABLE IF NOT EXISTS farm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee', 'trucker')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clerk_user_id, farm_id)
);

-- Trucker cross-farm links (truckers can see loads across farms)
CREATE TABLE IF NOT EXISTS trucker_farm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clerk_user_id, farm_id)
);

-- Fields
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  acres NUMERIC(10,2),
  google_pin TEXT,
  ownership TEXT,
  lease_payment NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  mailing_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Commodities
CREATE TABLE IF NOT EXISTS commodities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Forage', 'Grain')),
  field_id UUID REFERENCES fields(id),
  year INT,
  price_per_ton NUMERIC(10,2),
  -- Forage fields
  stack_number TEXT,
  type_of_forage TEXT,
  cutting TEXT,
  bale_count INT,
  avg_bale_weight_lbs NUMERIC(10,2),
  estimated_stack_tonnage NUMERIC(10,2),
  actual_stack_tonnage NUMERIC(10,2),
  test_pdf_url TEXT,
  tarp TEXT,
  notes TEXT,
  -- Grain fields
  type_crop TEXT,
  seed_details TEXT,
  estimated_tons_per_acre NUMERIC(10,3),
  estimated_total_tons NUMERIC(10,2),
  actual_tons NUMERIC(10,2),
  actual_tons_per_acre NUMERIC(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Loads
CREATE TABLE IF NOT EXISTS loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  commodity_id UUID REFERENCES commodities(id),
  field_id UUID REFERENCES fields(id),
  shipper TEXT,
  type TEXT NOT NULL CHECK (type IN ('Forage', 'Grain')),
  bale_count INT,
  gross_weight NUMERIC(12,2),
  tare_weight NUMERIC(12,2),
  net_weight NUMERIC(12,2),
  driver TEXT,
  truck_number TEXT,
  logged_by_clerk_id TEXT,
  bol_number TEXT,
  bol_url TEXT,
  scale_ticket_url TEXT,
  misc_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Income
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  field_id UUID REFERENCES fields(id),
  load_id UUID REFERENCES loads(id),
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vendor TEXT NOT NULL,
  field_id UUID REFERENCES fields(id),
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Crop history (lightweight year/crop log per field, separate from Commodities)
CREATE TABLE IF NOT EXISTS crop_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
  year INT NOT NULL,
  crop TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fields_farm ON fields(farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crop_history_field ON crop_history(field_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_farm ON customers(farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_commodities_farm ON commodities(farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loads_farm ON loads(farm_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loads_date ON loads(farm_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_income_farm ON income(farm_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_load_id ON income(load_id) WHERE load_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_farm ON expenses(farm_id) WHERE deleted_at IS NULL;
`;

try {
  await pool.query(schema);
  console.log('✅ Database migration complete');
} catch (err) {
  console.error('Migration failed:', err.message);
} finally {
  await pool.end();
}
