-- Add inventory-batch metadata to the existing expense table.
-- The calculator uses these fields to create and group its matching expenses.
-- Run once in the Supabase SQL Editor before deploying the calculator.

ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS batch_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS units_received INTEGER
  CHECK (units_received IS NULL OR units_received > 0);

CREATE INDEX IF NOT EXISTS idx_expenses_batch_id
  ON public.finance_expenses(batch_id)
  WHERE batch_id IS NOT NULL;
