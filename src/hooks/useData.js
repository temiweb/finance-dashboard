import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getDateRange } from '../lib/utils';

export function useRevenue(period = 'month', market = 'all') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(period);

      // 1. Fetch CRM orders (only delivered = revenue)
      let crmQuery = supabase
        .from('orders')
        .select('id, product, qty, price, country, status, actual_price_collected, delivery_fee, created_at')
        .eq('status', 'delivered')
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`)
        .order('created_at', { ascending: false });

      if (market !== 'all') crmQuery = crmQuery.eq('country', market);

      // 2. Fetch manual revenue entries
      let manualQuery = supabase
        .from('finance_revenue')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });

      if (market !== 'all') manualQuery = manualQuery.eq('market', market);

      const [crmResult, manualResult] = await Promise.all([crmQuery, manualQuery]);

      if (crmResult.error) throw crmResult.error;
      if (manualResult.error) throw manualResult.error;

      // Normalize CRM orders to match revenue format
      // Net revenue = actual_price_collected - delivery_fee
      const crmRows = (crmResult.data || []).map(order => {
        const collected = Number(order.actual_price_collected) || (Number(order.price) * (order.qty || 1));
        const deliveryFee = Number(order.delivery_fee) || 0;
        const netAmount = collected - deliveryFee;
        return {
          id: order.id,
          date: order.created_at?.split('T')[0],
          product: order.product || 'Unknown',
          market: order.country || 'nigeria',
          quantity: order.qty || 1,
          unit_price: Number(order.price) || 0,
          total_amount: netAmount,
          delivery_fee: deliveryFee,
          source: 'crm',
          status: order.status,
          notes: deliveryFee > 0 ? `Delivery fee: ₦${deliveryFee.toLocaleString()}` : null,
        };
      });

      // Combine and sort by date descending
      const combined = [...crmRows, ...(manualResult.data || [])];
      combined.sort((a, b) => new Date(b.date) - new Date(a.date));

      setData(combined);
      setError(null);
    } catch (e) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, market]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useExpenses(period = 'month', market = 'all') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(period);
      let query = supabase
        .from('finance_expenses')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });

      if (market !== 'all') {
        query = query.or(`market.eq.${market},market.eq.both`);
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows || []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, market]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useCashFlow(period = 'month', market = 'all') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(period);
      let query = supabase
        .from('finance_cash_flow')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });

      if (market !== 'all') query = query.eq('market', market);

      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows || []);
      setError(null);
    } catch (e) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [period, market]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export async function addRevenue(entry) {
  const { data, error } = await supabase
    .from('finance_revenue')
    .insert([entry])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addExpense(entry) {
  const { data, error } = await supabase
    .from('finance_expenses')
    .insert([entry])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addCashFlow(entry) {
  const { data, error } = await supabase
    .from('finance_cash_flow')
    .insert([entry])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
