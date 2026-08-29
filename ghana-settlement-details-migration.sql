-- Store Ghana settlement figures explicitly so past bills can be reviewed and edited.
-- Discount is informational because VDL's Amount Due Vendor does not deduct it again.
-- Run once in the Supabase SQL Editor before deploying this update.

ALTER TABLE public.finance_cash_flow
  ADD COLUMN IF NOT EXISTS partner_name TEXT,
  ADD COLUMN IF NOT EXISTS total_products_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS discount_ghs NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fees_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vendor_expenses_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS commission_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS cod_fee_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_ghs NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS reporting_exchange_rate NUMERIC(12,4);
