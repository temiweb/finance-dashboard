-- Add a Nigeria allocation percentage for shared ('both') expenses.
-- Existing and future rows default to 50% Nigeria / 50% Ghana.
-- Run once in the Supabase SQL Editor before deploying the matching UI.

ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS nigeria_share NUMERIC(5,2) NOT NULL DEFAULT 50
  CHECK (nigeria_share >= 0 AND nigeria_share <= 100);
