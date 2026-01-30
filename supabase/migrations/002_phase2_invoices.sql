-- Phase 2: Invoices table + Storage bucket for invoice PDFs
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  consultant_name text NOT NULL,
  amount decimal NOT NULL,
  currency text NOT NULL CHECK (currency IN ('INR', 'USD', 'JPY', 'AED')),
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year integer NOT NULL,
  invoice_url text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processed', 'paid')),
  submission_date timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id),
  paid_at timestamptz,
  paid_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. STORAGE BUCKET FOR INVOICES (PDF only, 10MB)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy
CREATE POLICY "Allow all access to invoices storage" ON storage.objects
  FOR ALL USING (bucket_id = 'invoices') WITH CHECK (bucket_id = 'invoices');

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_year, period_month);
