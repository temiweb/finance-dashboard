-- ============================================================
-- Add 'stock_purchase' to the allowed expense categories
-- Run this in your Supabase SQL Editor before using the new
-- "Stock Purchase" category. Additive, idempotent, reversible.
-- ============================================================

alter table public.finance_expenses drop constraint if exists finance_expenses_category_check;

alter table public.finance_expenses add constraint finance_expenses_category_check
  check (category in (
    'ad_spend', 'stock_purchase', 'import_shipping', 'delivery_commission',
    'packaging', 'tools_subscriptions', 'other'
  ));
