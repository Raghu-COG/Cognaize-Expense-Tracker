-- Phase 1: Users, Expenses, Expense Items tables + Storage bucket
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employee', 'consultant', 'accountant', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed initial users
INSERT INTO users (email, name, role) VALUES
  ('admin@cognaizesys.com', 'Admin', 'admin'),
  ('accountant@cognaizesys.com', 'Accountant', 'accountant')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. EXPENSES TABLE (parent - one per submission)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  submission_date timestamptz NOT NULL DEFAULT now(),
  total_amount decimal NOT NULL DEFAULT 0,
  currency text NOT NULL CHECK (currency IN ('INR', 'USD', 'JPY', 'AED')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processed', 'paid')),
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id),
  paid_at timestamptz,
  paid_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3. EXPENSE ITEMS TABLE (line items)
-- ============================================
CREATE TABLE IF NOT EXISTS expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount decimal NOT NULL,
  currency text NOT NULL CHECK (currency IN ('INR', 'USD', 'JPY', 'AED')),
  expense_type text NOT NULL CHECK (expense_type IN ('travel', 'food', 'hotel', 'software', 'others')),
  description text,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

-- Users: allow all authenticated reads (using anon key with app-level auth)
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to expense_items" ON expense_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 5. STORAGE BUCKET FOR RECEIPTS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow all access via anon key (app handles auth)
CREATE POLICY "Allow all access to receipts" ON storage.objects
  FOR ALL USING (bucket_id = 'receipts') WITH CHECK (bucket_id = 'receipts');

-- ============================================
-- 6. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items(expense_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
