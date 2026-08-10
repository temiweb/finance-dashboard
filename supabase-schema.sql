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
  delivered_orders INTEGER CHECK (delivered_orders IS NULL OR delivered_orders > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  exchange_rate NUMERIC(12,4) CHECK (exchange_rate IS NULL OR exchange_rate > 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'crm')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses (ad spend, import costs, delivery, etc.)
CREATE TABLE IF NOT EXISTS finance_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN (
    'ad_spend', 'stock_purchase', 'import_shipping', 'delivery_commission',
    'packaging', 'tools_subscriptions', 'other'
  )),
  product TEXT,  -- nullable for general expenses
  market TEXT CHECK (market IN ('nigeria', 'ghana', 'both')),
  nigeria_share NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (nigeria_share >= 0 AND nigeria_share <= 100),
  platform TEXT CHECK (platform IN ('TikTok', 'Meta', 'Google', 'YouTube', 'Other')),
  campaign TEXT, -- for ad spend tracking
  amount NUMERIC(12,2) NOT NULL,
  batch_id UUID,
  batch_name TEXT,
  supplier TEXT,
  units_received INTEGER CHECK (units_received IS NULL OR units_received > 0),
  received_date DATE,
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

-- Dashboard settings (products list, exchange rate, feature flags, etc.)
CREATE TABLE IF NOT EXISTS finance_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO finance_settings (key, value) VALUES
  ('products', '["Net Repair Tape", "Mesh Tape", "Car Scratch Remover", "Deep Edge Crevice Brush"]'),
  ('currency', '{"nigeria": "₦", "ghana": "GH₵"}')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE finance_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies are deliberately not included in this bootstrap schema.
-- IMPORTANT: This shared project uses Supabase email/password authentication and
-- staff-based RLS. Its policies must be maintained with the CRM's database
-- migrations, where the staff-table relationship is defined. Do not add permissive
-- USING (true) policies here, and do not run this bootstrap schema against an
-- existing production database.

-- Indexes for common queries
CREATE INDEX idx_revenue_date ON finance_revenue(date);
CREATE INDEX idx_revenue_market ON finance_revenue(market);
CREATE INDEX idx_revenue_product ON finance_revenue(product);
CREATE INDEX idx_expenses_date ON finance_expenses(date);
CREATE INDEX idx_expenses_category ON finance_expenses(category);
CREATE INDEX idx_cash_flow_date ON finance_cash_flow(date);
