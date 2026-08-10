-- ============================================================
-- CASH FLOW TABLE UPDATE
-- Run this in your Supabase SQL Editor only if you ran the
-- original supabase-schema.sql before May 2025.
-- Drops the old structure and recreates for payment tracking.
-- ============================================================

-- LEGACY: Do not run this file against a database with finance_cash_flow data.
-- It is retained only as a reference for the pre-May 2025 schema. Production
-- changes must use a non-destructive CRM migration that preserves staff-based RLS.
/*
-- Drop old table (only if you haven't entered data yet)
DROP TABLE IF EXISTS finance_cash_flow;

-- New structure: tracks payments received from agents/exchangers
CREATE TABLE finance_cash_flow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('nigeria', 'ghana')),
  amount NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS — require authenticated Supabase session (matches supabase-schema.sql)
-- RLS policies are intentionally not defined in this legacy migration. They are
-- owned by the shared CRM database migrations and must enforce staff-role rules.

-- Indexes
CREATE INDEX idx_cash_flow_date ON finance_cash_flow(date);
CREATE INDEX idx_cash_flow_market ON finance_cash_flow(market);
*/
