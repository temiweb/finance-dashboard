-- Ghana weekly delivery-partner settlements.
-- Uses the existing finance tables so the dashboard's current RLS policies apply.
-- Run once in the Supabase SQL Editor before deploying this feature.

ALTER TABLE public.finance_revenue
  ADD COLUMN IF NOT EXISTS settlement_id UUID;

ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS settlement_id UUID,
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS original_currency TEXT;

ALTER TABLE public.finance_cash_flow
  ADD COLUMN IF NOT EXISTS settlement_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('pending', 'received')),
  ADD COLUMN IF NOT EXISTS billing_date DATE,
  ADD COLUMN IF NOT EXISTS expected_amount_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,4);

UPDATE public.finance_cash_flow
SET status = 'received'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_cash_flow_settlement_id
  ON public.finance_cash_flow(settlement_id)
  WHERE settlement_id IS NOT NULL;
