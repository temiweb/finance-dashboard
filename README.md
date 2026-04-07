# Finance Dashboard

A standalone finance tracking dashboard for your e-commerce business (Nigeria & Ghana markets). Tracks revenue, expenses, profitability, ad performance, and cash flow.

## Quick Start

### 1. Database Setup
Run the SQL schema in your existing Supabase project:
- Go to **Supabase Dashboard** → **SQL Editor**
- Paste and run the contents of `supabase-schema.sql`
- This creates 4 new tables: `finance_revenue`, `finance_expenses`, `finance_cash_flow`, `finance_settings`
- Default PIN is **1234** — change it in `finance_settings` table

### 2. Environment Variables
```bash
cp .env.example .env
```
Edit `.env` and add your Supabase anon key:
```
VITE_SUPABASE_URL=https://amdcmtfuytnplrzxabip.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
```

### 3. Local Development
```bash
npm install
npm run dev
```

### 4. Deploy to Vercel
Push to GitHub, then in Vercel:
- Import the repo
- Add environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Deploy

## Features

| Module | Data Source | Description |
|--------|-----------|-------------|
| **Overview** | All tables | KPI cards, revenue by product chart, expense breakdown pie chart |
| **Revenue** | `finance_revenue` | Manual entry + auto from CRM. By product, market, time period |
| **Expenses** | `finance_expenses` | Manual entry. Categories: ad spend, import/shipping, delivery, packaging, tools, other |
| **Profitability** | Revenue - Expenses | Margin by product and market. Revenue vs cost comparison charts |
| **Ad Performance** | Revenue + Ad Spend | ROAS, cost per purchase, spend by campaign, product performance |
| **Cash Flow** | `finance_cash_flow` | COD pipeline: orders placed → delivered → cash collected → pending |

## Changing the PIN
```sql
UPDATE finance_settings SET value = '"5678"' WHERE key = 'pin';
```

## Adding Products
Update the products list in `src/lib/utils.js` → `PRODUCTS` array and `PRODUCT_COLORS` object.
