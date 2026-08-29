import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDateRange } from '../lib/utils';

const CACHE_TTL_MS = 60_000;
const queryCache = new Map();

function getCacheKey(name, period, market, customRange) {
  const { from, to } = getDateRange(period, customRange);
  return `${name}:${market}:${from}:${to}`;
}

function getCachedData(key) {
  const cached = queryCache.get(key);
  if (!cached || Date.now() - cached.updatedAt >= CACHE_TTL_MS) return null;
  return cached.data;
}

function setCachedData(key, data) {
  queryCache.set(key, { data, updatedAt: Date.now() });
}

function clearFinanceCache() {
  queryCache.clear();
}

export function useRevenue(period = 'month', market = 'all', customRange = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const key = getCacheKey('revenue', period, market, customRange);
        const cachedData = getCachedData(key);
        if (cachedData) {
          if (!ignore) {
            setData(cachedData);
            setError(null);
            setLoading(false);
          }
          return;
        }
        const { from, to } = getDateRange(period, customRange);

        let crmQuery = supabase
          .from('orders')
          .select('id, product, qty, price, country, status, actual_price_collected, actual_qty_delivered, delivery_fee, created_at')
          .eq('status', 'delivered')
          .gte('created_at', `${from}T00:00:00`)
          .lte('created_at', `${to}T23:59:59`)
          .order('created_at', { ascending: false });

        if (market !== 'all') crmQuery = crmQuery.eq('country', market);

        let manualQuery = supabase
          .from('finance_revenue')
          .select('id, date, product, market, quantity, delivered_orders, unit_price, total_amount, exchange_rate, source, notes')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: false });

        if (market !== 'all') manualQuery = manualQuery.eq('market', market);

        const [crmResult, manualResult] = await Promise.all([crmQuery, manualQuery]);
        if (ignore) return;

        if (crmResult.error) throw crmResult.error;
        if (manualResult.error) throw manualResult.error;

        const crmRows = (crmResult.data || []).map(order => {
          const deliveredQty = Number(order.actual_qty_delivered) || Number(order.qty) || 1;
          const collected = Number(order.actual_price_collected) || (Number(order.price) * deliveredQty);
          const deliveryFee = Number(order.delivery_fee) || 0;
          return {
            id: order.id,
            date: order.created_at?.split('T')[0],
            product: order.product || 'Unknown',
            market: order.country || 'nigeria',
            quantity: deliveredQty,
            unit_price: Number(order.price) || 0,
            total_amount: collected - deliveryFee,
            delivery_fee: deliveryFee,
            delivered_qty: deliveredQty,
            delivered_orders: 1,
            is_order: true,
            source: 'crm',
            status: order.status,
            notes: deliveryFee > 0 ? `Delivery fee: ₦${deliveryFee.toLocaleString()}` : null,
          };
        });

        const combined = [...crmRows, ...(manualResult.data || [])];
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        setCachedData(key, combined);
        setData(combined);
        setError(null);
      } catch (e) {
        if (!ignore) { setError(e.message); setData([]); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => { ignore = true; clearTimeout(timer); };
  }, [period, market, customRange, tick]);

  const refetch = useCallback(() => {
    clearFinanceCache();
    setTick(t => t + 1);
  }, []);
  return { data, loading, error, refetch };
}

export function useExpenses(period = 'month', market = 'all', customRange = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const key = getCacheKey('expenses', period, market, customRange);
        const cachedData = getCachedData(key);
        if (cachedData) {
          if (!ignore) {
            setData(cachedData);
            setError(null);
            setLoading(false);
          }
          return;
        }
        const { from, to } = getDateRange(period, customRange);
        let query = supabase
          .from('finance_expenses')
          .select('id, date, category, product, market, nigeria_share, platform, campaign, amount, description, batch_id')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: false });

        if (market !== 'all') query = query.or(`market.eq.${market},market.eq.both`);

        const { data: rows, error: err } = await query;
        if (ignore) return;
        if (err) throw err;
        setCachedData(key, rows || []);
        setData(rows || []);
        setError(null);
      } catch (e) {
        if (!ignore) { setError(e.message); setData([]); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => { ignore = true; clearTimeout(timer); };
  }, [period, market, customRange, tick]);

  const refetch = useCallback(() => {
    clearFinanceCache();
    setTick(t => t + 1);
  }, []);
  return { data, loading, error, refetch };
}

export function useCashFlow(period = 'month', market = 'all', customRange = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const key = getCacheKey('cashflow', period, market, customRange);
        const cachedData = getCachedData(key);
        if (cachedData) {
          if (!ignore) {
            setData(cachedData);
            setError(null);
            setLoading(false);
          }
          return;
        }
        const { from, to } = getDateRange(period, customRange);
        let query = supabase
          .from('finance_cash_flow')
          .select('id, date, source, market, amount, notes')
          .or('status.is.null,status.eq.received')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: false });

        if (market !== 'all') query = query.eq('market', market);

        const { data: rows, error: err } = await query;
        if (ignore) return;
        if (err) throw err;
        setCachedData(key, rows || []);
        setData(rows || []);
        setError(null);
      } catch (e) {
        if (!ignore) { setError(e.message); setData([]); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => { ignore = true; clearTimeout(timer); };
  }, [period, market, customRange, tick]);

  const refetch = useCallback(() => {
    clearFinanceCache();
    setTick(t => t + 1);
  }, []);
  return { data, loading, error, refetch };
}

export function useInventoryBatchExpenses() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchBatches() {
      setLoading(true);
      try {
        const key = 'inventory-batches';
        const cachedData = getCachedData(key);
        if (cachedData) {
          if (!ignore) {
            setData(cachedData);
            setError(null);
          }
          return;
        }
        const { data: rows, error: queryError } = await supabase
          .from('finance_expenses')
          .select('id, date, category, amount, description, batch_id, batch_name, supplier, product, market, nigeria_share, units_received, received_date')
          .not('batch_id', 'is', null)
          .order('date', { ascending: false });
        if (queryError) throw queryError;
        if (!ignore) {
          const data = rows || [];
          setCachedData(key, data);
          setData(data);
          setError(null);
        }
      } catch (fetchError) {
        if (!ignore) {
          setData([]);
          setError(fetchError.message);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchBatches();
    return () => { ignore = true; };
  }, [tick]);

  const refetch = useCallback(() => {
    clearFinanceCache();
    setTick(current => current + 1);
  }, []);
  return { data, loading, error, refetch };
}

export async function addRevenue(entry) {
  const { error } = await supabase.from('finance_revenue').insert([entry]);
  if (error) throw error;
  clearFinanceCache();
}

export async function addExpense(entry) {
  const { error } = await supabase.from('finance_expenses').insert([entry]);
  if (error) throw error;
  clearFinanceCache();
}

export async function addCashFlow(entry) {
  const { error } = await supabase.from('finance_cash_flow').insert([entry]);
  if (error) throw error;
  clearFinanceCache();
}

export function useGhanaSettlements() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function fetchSettlements() {
      setLoading(true);
      try {
        const key = 'ghana-settlements';
        const cachedData = getCachedData(key);
        if (cachedData) {
          if (!ignore) {
            setData(cachedData);
            setError(null);
          }
          return;
        }
        const { data: rows, error: queryError } = await supabase
          .from('finance_cash_flow')
          .select('id, date, billing_date, source, market, amount, settlement_id, status, expected_amount_ghs, exchange_rate, partner_name, total_products_ghs, discount_ghs, delivery_fees_ghs, vendor_expenses_ghs, commission_ghs, cod_fee_ghs, tax_ghs, reporting_exchange_rate, notes')
          .not('settlement_id', 'is', null)
          .order('billing_date', { ascending: false });
        if (queryError) throw queryError;
        if (!ignore) {
          const data = rows || [];
          setCachedData(key, data);
          setData(data);
          setError(null);
        }
      } catch (fetchError) {
        if (!ignore) { setData([]); setError(fetchError.message); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchSettlements();
    return () => { ignore = true; };
  }, [tick]);

  const refetch = useCallback(() => {
    clearFinanceCache();
    setTick(current => current + 1);
  }, []);
  return { data, loading, error, refetch };
}

function buildSettlementNote(settlement) {
  return `Ghana settlement: ${settlement.partner} · Discount GHS ${Number(settlement.discount) || 0} · Delivery GHS ${settlement.deliveryFees} · Vendor GHS ${settlement.vendorExpenses} · Commission GHS ${settlement.commission} · COD GHS ${settlement.codFee} · Tax GHS ${settlement.tax}`;
}

function readLegacySettlementValue(notes, label) {
  const match = notes?.match(new RegExp(`${label} GHS\\s+([\\d.,]+)`, 'i'));
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function settlementExpenseAmount(expense, rate) {
  if (Number(expense.original_amount) > 0) return Number(expense.original_amount);
  return rate > 0 ? Number(expense.amount) / rate : 0;
}

export async function getGhanaSettlementDetails(settlement) {
  const [revenueResult, expensesResult] = await Promise.all([
    supabase.from('finance_revenue')
      .select('id, date, product, quantity, delivered_orders, total_amount, exchange_rate')
      .eq('settlement_id', settlement.settlement_id)
      .order('date'),
    supabase.from('finance_expenses')
      .select('id, date, category, amount, original_amount, original_currency, description')
      .eq('settlement_id', settlement.settlement_id)
      .order('date'),
  ]);
  if (revenueResult.error) throw revenueResult.error;
  if (expensesResult.error) throw expensesResult.error;

  const lines = revenueResult.data || [];
  const expenses = expensesResult.data || [];
  const reportingRate = Number(settlement.reporting_exchange_rate) || Number(lines[0]?.exchange_rate) || 0;
  const vendorExpense = expenses.find(expense => expense.description?.startsWith('Vendor expenses'));
  const taxExpense = expenses.find(expense => expense.description?.startsWith('VAT, NHIL, and GETFund tax'));
  const deliveryFees = Number(settlement.delivery_fees_ghs) || readLegacySettlementValue(settlement.notes, 'Delivery');
  const commission = Number(settlement.commission_ghs) || readLegacySettlementValue(settlement.notes, 'Commission');
  const codFee = Number(settlement.cod_fee_ghs) || readLegacySettlementValue(settlement.notes, 'COD');
  const vendorExpenses = Number(settlement.vendor_expenses_ghs) || settlementExpenseAmount(vendorExpense || {}, reportingRate) || readLegacySettlementValue(settlement.notes, 'Vendor');
  const tax = Number(settlement.tax_ghs) || settlementExpenseAmount(taxExpense || {}, reportingRate) || readLegacySettlementValue(settlement.notes, 'Tax');
  const productRevenue = lines.reduce((total, line) => total + Number(line.total_amount || 0), 0);

  return {
    settlement,
    lines,
    expenses,
    form: {
      billingDate: settlement.billing_date || settlement.date,
      partner: settlement.partner_name || settlement.source?.replace(/ via .+$/, '') || '',
      reportingRate: String(reportingRate),
      totalProducts: String(Number(settlement.total_products_ghs) || productRevenue + deliveryFees + commission + codFee),
      discount: String(Number(settlement.discount_ghs) || 0),
      deliveryFees: String(deliveryFees),
      vendorExpenses: String(vendorExpenses),
      commission: String(commission),
      codFee: String(codFee),
      tax: String(tax),
      lines: lines.map(line => ({
        id: line.id,
        product: line.product,
        units: String(line.quantity),
        orders: String(line.delivered_orders),
        netRevenue: String(line.total_amount),
      })),
    },
  };
}

export async function updateGhanaSettlement(details, settlement) {
  const previousRevenueIds = details.lines.map(line => line.id);
  const previousExpenseIds = details.expenses.map(expense => expense.id);
  const note = buildSettlementNote(settlement);
  const revenueRows = settlement.lines.map(line => ({
    date: settlement.billingDate,
    product: line.product,
    market: 'ghana',
    quantity: Number(line.units),
    delivered_orders: Number(line.orders),
    unit_price: Number(line.netRevenue) / Number(line.units),
    total_amount: Number(line.netRevenue),
    exchange_rate: Number(settlement.reportingRate),
    settlement_id: details.settlement.settlement_id,
    source: 'manual',
    notes: note,
  }));
  const expenseRows = [
    ['vendorExpenses', 'Vendor expenses'],
    ['tax', 'VAT, NHIL, and GETFund tax'],
  ].filter(([field]) => Number(settlement[field]) > 0).map(([field, description]) => ({
    date: settlement.billingDate,
    category: 'other',
    market: 'ghana',
    nigeria_share: 0,
    amount: Number(settlement[field]) * Number(settlement.reportingRate),
    original_amount: Number(settlement[field]),
    original_currency: 'GHS',
    settlement_id: details.settlement.settlement_id,
    description: `${description} · ${note}`,
  }));

  const [newRevenueResult, newExpensesResult] = await Promise.all([
    supabase.from('finance_revenue').insert(revenueRows).select('id'),
    expenseRows.length ? supabase.from('finance_expenses').insert(expenseRows).select('id') : Promise.resolve({ data: [], error: null }),
  ]);
  if (newRevenueResult.error) throw newRevenueResult.error;
  if (newExpensesResult.error) {
    await supabase.from('finance_revenue').delete().in('id', (newRevenueResult.data || []).map(row => row.id));
    throw newExpensesResult.error;
  }

  const headerUpdate = {
    billing_date: settlement.billingDate,
    partner_name: settlement.partner,
    total_products_ghs: Number(settlement.totalProducts),
    discount_ghs: Number(settlement.discount) || 0,
    delivery_fees_ghs: Number(settlement.deliveryFees) || 0,
    vendor_expenses_ghs: Number(settlement.vendorExpenses) || 0,
    commission_ghs: Number(settlement.commission) || 0,
    cod_fee_ghs: Number(settlement.codFee) || 0,
    tax_ghs: Number(settlement.tax) || 0,
    reporting_exchange_rate: Number(settlement.reportingRate),
    expected_amount_ghs: Number(settlement.expectedPayout),
    notes: details.settlement.status === 'pending' ? `Awaiting payout · ${note}` : details.settlement.notes,
  };
  if (details.settlement.status === 'pending') {
    headerUpdate.date = settlement.billingDate;
    headerUpdate.source = settlement.partner;
  }
  const headerResult = await supabase.from('finance_cash_flow').update(headerUpdate).eq('id', details.settlement.id);
  if (headerResult.error) throw headerResult.error;
  if (previousRevenueIds.length) await supabase.from('finance_revenue').delete().in('id', previousRevenueIds);
  if (previousExpenseIds.length) await supabase.from('finance_expenses').delete().in('id', previousExpenseIds);
  clearFinanceCache();
}

export async function createGhanaSettlement(settlement) {
  const settlementId = crypto.randomUUID();
  const created = { revenue: [], expenses: [] };
  const note = buildSettlementNote(settlement);
  const expenseRows = [
    ['vendorExpenses', 'Vendor expenses'],
    ['tax', 'VAT, NHIL, and GETFund tax'],
  ]
    .filter(([field]) => Number(settlement[field]) > 0)
    .map(([field, description]) => ({
      date: settlement.billingDate,
      category: 'other',
      market: 'ghana',
      nigeria_share: 0,
      amount: Number(settlement[field]) * settlement.reportingRate,
      original_amount: Number(settlement[field]),
      original_currency: 'GHS',
      settlement_id: settlementId,
      description: `${description} · ${note}`,
    }));

  try {
    const revenueRows = settlement.lines.map(line => ({
      date: settlement.billingDate,
      product: line.product,
      market: 'ghana',
      quantity: Number(line.units),
      delivered_orders: Number(line.orders),
      unit_price: Number(line.netRevenue) / Number(line.units),
      total_amount: Number(line.netRevenue),
      exchange_rate: settlement.reportingRate,
      settlement_id: settlementId,
      source: 'manual',
      notes: note,
    }));
    const revenueResult = await supabase.from('finance_revenue').insert(revenueRows).select('id');
    if (revenueResult.error) throw revenueResult.error;
    created.revenue = revenueResult.data || [];

    if (expenseRows.length > 0) {
      const expenseResult = await supabase.from('finance_expenses').insert(expenseRows).select('id');
      if (expenseResult.error) throw expenseResult.error;
      created.expenses = expenseResult.data || [];
    }

    const cashFlowResult = await supabase.from('finance_cash_flow').insert([{
      date: settlement.billingDate,
      billing_date: settlement.billingDate,
      source: settlement.partner,
      market: 'ghana',
      amount: 0,
      settlement_id: settlementId,
      status: 'pending',
      expected_amount_ghs: settlement.expectedPayout,
      partner_name: settlement.partner,
      total_products_ghs: Number(settlement.totalProducts),
      discount_ghs: Number(settlement.discount) || 0,
      delivery_fees_ghs: Number(settlement.deliveryFees) || 0,
      vendor_expenses_ghs: Number(settlement.vendorExpenses) || 0,
      commission_ghs: Number(settlement.commission) || 0,
      cod_fee_ghs: Number(settlement.codFee) || 0,
      tax_ghs: Number(settlement.tax) || 0,
      reporting_exchange_rate: Number(settlement.reportingRate),
      notes: `Awaiting payout · ${note}`,
    }]).select().single();
    if (cashFlowResult.error) throw cashFlowResult.error;
    clearFinanceCache();
    return cashFlowResult.data;
  } catch (createError) {
    await Promise.all([
      ...created.revenue.map(row => supabase.from('finance_revenue').delete().eq('id', row.id)),
      ...created.expenses.map(row => supabase.from('finance_expenses').delete().eq('id', row.id)),
    ]);
    throw createError;
  }
}

export async function receiveGhanaSettlement(settlement, payment) {
  const actualRate = Number(payment.amount) / Number(settlement.expected_amount_ghs);
  const { data, error } = await supabase
    .from('finance_cash_flow')
    .update({
      date: payment.date,
      source: `${settlement.source} via ${payment.exchanger}`,
      amount: Number(payment.amount),
      status: 'received',
      exchange_rate: actualRate,
      notes: payment.notes || `GHS ${Number(settlement.expected_amount_ghs).toLocaleString()} settlement paid through ${payment.exchanger}`,
    })
    .eq('id', settlement.id)
    .select()
    .single();
  if (error) throw error;
  clearFinanceCache();
  return data;
}

export async function addInventoryBatch(batch) {
  const batchId = crypto.randomUUID();
  const entry = {
    date: batch.date,
    product: batch.product,
    market: batch.market,
    nigeria_share: batch.market === 'both' ? batch.nigeriaShare : 100,
    batch_id: batchId,
    batch_name: batch.batchName,
    supplier: batch.supplier || null,
    units_received: batch.unitsReceived,
    received_date: null,
    category: 'stock_purchase',
    amount: batch.stockCost,
    description: 'Inventory purchase',
  };

  const { error } = await supabase
    .from('finance_expenses')
    .insert([entry]);
  if (error) throw error;
  clearFinanceCache();
}

export async function addInventoryBatchCost(batch, cost) {
  const { error } = await supabase
    .from('finance_expenses')
    .insert([{
      date: cost.date,
      product: batch.product,
      market: batch.market,
      nigeria_share: batch.market === 'both' ? batch.nigeriaShare : 100,
      batch_id: batch.id,
      batch_name: batch.batchName,
      supplier: batch.supplier || null,
      units_received: batch.unitsReceived,
      received_date: batch.receivedDate || null,
      category: cost.category,
      amount: cost.amount,
      description: cost.description || null,
    }]);
  if (error) throw error;
  clearFinanceCache();
}

export async function updateInventoryBatch(batch, updates) {
  const sharedUpdates = {
    product: updates.product,
    market: updates.market,
    nigeria_share: updates.market === 'both' ? Number(updates.nigeriaShare) : 100,
    batch_name: updates.batchName,
    supplier: updates.supplier || null,
    units_received: Number(updates.unitsReceived),
  };
  const { error: sharedError } = await supabase
    .from('finance_expenses')
    .update(sharedUpdates)
    .eq('batch_id', batch.id);
  if (sharedError) throw sharedError;

  const { error: stockError } = await supabase
    .from('finance_expenses')
    .update({ date: updates.date, amount: Number(updates.stockCost) })
    .eq('batch_id', batch.id)
    .eq('category', 'stock_purchase');
  if (stockError) throw stockError;
  clearFinanceCache();
}

export async function updateInventoryBatchCost(id, cost) {
  const { error } = await supabase
    .from('finance_expenses')
    .update({
      date: cost.date,
      category: cost.category,
      amount: Number(cost.amount),
      description: cost.description || null,
    })
    .eq('id', id);
  if (error) throw error;
  clearFinanceCache();
}

export async function markInventoryBatchReceived(batchId, receivedDate) {
  const { error } = await supabase
    .from('finance_expenses')
    .update({ received_date: receivedDate })
    .eq('batch_id', batchId);
  if (error) throw error;
  clearFinanceCache();
}

export async function deleteInventoryBatch(batchId) {
  const { error } = await supabase
    .from('finance_expenses')
    .delete()
    .eq('batch_id', batchId);
  if (error) throw error;
  clearFinanceCache();
}

export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  clearFinanceCache();
}

export async function updateRecord(table, id, updates) {
  const { error } = await supabase.from(table).update(updates).eq('id', id);
  if (error) throw error;
  clearFinanceCache();
}
