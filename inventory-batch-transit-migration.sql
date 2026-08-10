-- Upgrade inventory batches so costs can be recorded as they are paid.
-- Existing batches are treated as already received on their saved batch date.
-- Run once in the Supabase SQL Editor before deploying this update.

ALTER TABLE public.finance_expenses
  ADD COLUMN IF NOT EXISTS received_date DATE;

UPDATE public.finance_expenses
SET received_date = date
WHERE batch_id IS NOT NULL
  AND received_date IS NULL;
