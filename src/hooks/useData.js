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
      let query = supabase
        .from('finance_revenue')
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
