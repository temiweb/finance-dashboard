-- Track the number of delivered COD orders behind each manual revenue entry.
-- Existing rows remain NULL, so historical reports can identify entries that
-- need backfilling rather than treating units sold as delivered orders.
-- Run once in the Supabase SQL Editor before deploying the matching UI.

ALTER TABLE public.finance_revenue
  ADD COLUMN IF NOT EXISTS delivered_orders INTEGER
  CHECK (delivered_orders IS NULL OR delivered_orders > 0);
