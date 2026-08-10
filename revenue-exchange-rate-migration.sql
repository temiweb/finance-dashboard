-- Store the GH₵ → ₦ rate used for each revenue entry.
-- Existing rows remain NULL and fall back to the current dashboard rate until
-- you choose to backfill them with their historical rates.
-- Run once in the Supabase SQL Editor before deploying the matching UI.

ALTER TABLE public.finance_revenue
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,4)
  CHECK (exchange_rate IS NULL OR exchange_rate > 0);
