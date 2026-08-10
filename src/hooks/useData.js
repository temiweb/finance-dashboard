import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDateRange } from '../lib/utils';

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
          .select('*')
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

  const refetch = useCallback(() => setTick(t => t + 1), []);
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
        const { from, to } = getDateRange(period, customRange);
        let query = supabase
          .from('finance_expenses')
          .select('*')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: false });

        if (market !== 'all') query = query.or(`market.eq.${market},market.eq.both`);

        const { data: rows, error: err } = await query;
        if (ignore) return;
        if (err) throw err;
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

  const refetch = useCallback(() => setTick(t => t + 1), []);
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
        const { from, to } = getDateRange(period, customRange);
        let query = supabase
          .from('finance_cash_flow')
          .select('*')
          .or('status.is.null,status.eq.received')
          .gte('date', from)
          .lte('date', to)
          .order('date', { ascending: false });

        if (market !== 'all') query = query.eq('market', market);

        const { data: rows, error: err } = await query;
        if (ignore) return;
        if (err) throw err;
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

  const refetch = useCallback(() => setTick(t => t + 1), []);
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
        const { data: rows, error: queryError } = await supabase
          .from('finance_expenses')
          .select('*')
          .not('batch_id', 'is', null)
          .order('date', { ascending: false });
        if (queryError) throw queryError;
        if (!ignore) {
          setData(rows || []);
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

  const refetch = useCallback(() => setTick(current => current + 1), []);
  return { data, loading, error, refetch };
}

export async function addRevenue(entry) {
  const { data, error } = await supabase.from('finance_revenue').insert([entry]).select().single();
  if (error) throw error;
  return data;
}

export async function addExpense(entry) {
  const { data, error } = await supabase.from('finance_expenses').insert([entry]).select().single();
  if (error) throw error;
  return data;
}

export async function addCashFlow(entry) {
  const { data, error } = await supabase.from('finance_cash_flow').insert([entry]).select().single();
  if (error) throw error;
  return data;
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
        const { data: rows, error: queryError } = await supabase
          .from('finance_cash_flow')
          .select('*')
          .not('settlement_id', 'is', null)
          .order('billing_date', { ascending: false });
        if (queryError) throw queryError;
        if (!ignore) { setData(rows || []); setError(null); }
      } catch (fetchError) {
        if (!ignore) { setData([]); setError(fetchError.message); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchSettlements();
    return () => { ignore = true; };
  }, [tick]);

  const refetch = useCallback(() => setTick(current => current + 1), []);
  return { data, loading, error, refetch };
}

export async function createGhanaSettlement(settlement) {
  const settlementId = crypto.randomUUID();
  const created = { revenue: [], expenses: [], cashFlow: null };
  const note = `Ghana settlement: ${settlement.partner}`;
  const expenseRows = [
    ['vendorExpenses', 'other', 'Vendor expenses'],
    ['commission', 'delivery_commission', 'Delivery partner commission'],
    ['codFee', 'delivery_commission', 'COD fee'],
    ['tax', 'other', 'VAT, NHIL, and GETFund tax'],
  ]
    .filter(([field]) => Number(settlement[field]) > 0)
    .map(([field, category, description]) => ({
      date: settlement.billingDate,
      category,
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
      notes: `Awaiting payout · ${note}`,
    }]).select().single();
    if (cashFlowResult.error) throw cashFlowResult.error;
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

  const { data, error } = await supabase
    .from('finance_expenses')
    .insert([entry])
    .select();
  if (error) throw error;
  return data;
}

export async function addInventoryBatchCost(batch, cost) {
  const { data, error } = await supabase
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
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markInventoryBatchReceived(batchId, receivedDate) {
  const { error } = await supabase
    .from('finance_expenses')
    .update({ received_date: receivedDate })
    .eq('batch_id', batchId);
  if (error) throw error;
}

export async function deleteInventoryBatch(batchId) {
  const { error } = await supabase
    .from('finance_expenses')
    .delete()
    .eq('batch_id', batchId);
  if (error) throw error;
}

export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function updateRecord(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
