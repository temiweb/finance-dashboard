-- ============================================================
-- FINANCE DASHBOARD — Supabase Schema
-- Run this in your existing Supabase project's SQL Editor
-- These tables sit alongside your existing CRM tables
-- ============================================================

-- Manual revenue entries (for Ghana orders or manual overrides)
CREATE TABLE IF NOT EXISTS finance_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  product TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('nigeria', 'ghana')),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'crm')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses (ad spend, import costs, delivery, etc.)
CREATE TABLE IF NOT EXISTS finance_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN (
    'ad_spend', 'import_shipping', 'delivery_commission',
    'packaging', 'tools_subscriptions', 'other'
  )),
  product TEXT,  -- nullable for general expenses
  market TEXT CHECK (market IN ('nigeria', 'ghana', 'both')),
  campaign TEXT, -- for ad spend tracking
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash collection tracking — payments received from delivery agents / exchangers
CREATE TABLE IF NOT EXISTS finance_cash_flow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('nigeria', 'ghana')),
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard settings (PIN, products list, etc.)
CREATE TABLE IF NOT EXISTS finance_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
-- Default PIN is SHA-256("1234") — change via the app's Settings page after first login
INSERT INTO finance_settings (key, value) VALUES
  ('pin', '"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"'),
  ('products', '["Net Repair Tape", "Mesh Tape", "Car Scratch Remover", "Deep Edge Crevice Brush"]'),
  ('currency', '{"nigeria": "₦", "ghana": "GH₵"}')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE finance_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;

-- Open policies — auth is PIN-based (not Supabase Auth). The anon key is the
-- access boundary; PIN hashing protects the dashboard UI from unauthorised use.
CREATE POLICY "Allow all on finance_revenue" ON finance_revenue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on finance_expenses" ON finance_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on finance_cash_flow" ON finance_cash_flow FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on finance_settings" ON finance_settings FOR ALL USING (true) WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_revenue_date ON finance_revenue(date);
CREATE INDEX idx_revenue_market ON finance_revenue(market);
CREATE INDEX idx_revenue_product ON finance_revenue(product);
CREATE INDEX idx_expenses_date ON finance_expenses(date);
CREATE INDEX idx_expenses_category ON finance_expenses(category);
CREATE INDEX idx_cash_flow_date ON finance_cash_flow(date);
