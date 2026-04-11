import { useState, useMemo } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useCashFlow, addCashFlow, deleteRecord } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Modal, EmptyState, Loader } from '../components/SharedUI';
import { formatMoney, formatDate, MARKETS, formatMoneyShort } from '../lib/utils';

export default function CashFlowPage() {
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useCashFlow(period, market, customRange);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '',
    market: 'nigeria',
    amount: '',
    notes: '',
  });

  const stats = useMemo(() => {
    const totalCollected = data.reduce((s, c) => s + Number(c.amount || 0), 0);
    const ngCollected = data.filter(c => c.market === 'nigeria').reduce((s, c) => s + Number(c.amount || 0), 0);
    const ghCollected = data.filter(c => c.market === 'ghana').reduce((s, c) => s + Number(c.amount || 0), 0);
    const entries = data.length;

    // By source
    const bySource = {};
    data.forEach(c => {
      const key = c.source || 'Unknown';
      bySource[key] = (bySource[key] || 0) + Number(c.amount || 0);
    });

    return { totalCollected, ngCollected, ghCollected, entries, bySource };
  }, [data]);

  // Chart: payments over time
  const chartData = useMemo(() => {
    const byDate = {};
    [...data].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(c => {
      const d = formatDate(c.date).slice(0, 6);
      if (!byDate[d]) byDate[d] = { date: d, nigeria: 0, ghana: 0 };
      byDate[d][c.market] += Number(c.amount || 0);
    });
    return Object.values(byDate).slice(-14);
  }, [data]);

  const handleSave = async () => {
    if (!form.source || !form.amount) return;
    setSaving(true);
    try {
      await addCashFlow({
        date: form.date,
        source: form.source.trim(),
        market: form.market,
        amount: Number(form.amount),
        notes: form.notes || null,
      });
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split('T')[0], source: '', market: 'nigeria', amount: '', notes: '' });
      refetch();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteRecord('finance_cash_flow', id);
      refetch();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cash Flow</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : (
        <>
          <div className="kpi-grid kpi-grid-3">
            <KpiCard title="Total Received" value={formatMoney(stats.totalCollected)} subtitle={`${stats.entries} payments`} icon={Wallet} color="#4ECDC4" />
            <KpiCard title="Nigeria" value={formatMoney(stats.ngCollected)} subtitle="From delivery agents" color="#4ECDC4" />
            <KpiCard title="Ghana" value={formatMoney(stats.ghCollected)} subtitle="From exchanger" color="#F4A142" />
          </div>

          {chartData.length > 0 && (
            <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
              <h3>Payments Received</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="nigeria" name="Nigeria" stackId="a" fill="#4ECDC4" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ghana" name="Ghana" stackId="a" fill="#F4A142" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Source breakdown */}
          {Object.keys(stats.bySource).length > 0 && (
            <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
              <h3>By Source</h3>
              <div className="source-breakdown">
                {Object.entries(stats.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, amount], i) => (
                    <div key={i} className="source-row">
                      <span className="source-name">{source}</span>
                      <span className="source-amount">{formatMoney(amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {data.length === 0 ? (
            <EmptyState icon={Wallet} title="No payments recorded" message="Record payments from delivery agents and exchangers" action={<button className="btn-primary" onClick={() => setShowAdd(true)}>Record Payment</button>} />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Market</th>
                    <th>Amount</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.date)}</td>
                      <td className="td-product">{c.source}</td>
                      <td><span className={`market-badge ${c.market}`}>{c.market}</span></td>
                      <td className="td-amount positive">{formatMoney(c.amount)}</td>
                      <td className="td-desc">{c.notes || '—'}</td>
                      <td>
                        <button className="btn-icon" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Payment">
        <div className="form-grid">
          <label>
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            <span>Market</span>
            <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
              {MARKETS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </label>
          <label>
            <span>Source</span>
            <input type="text" placeholder="e.g. Dozie, Ghana Exchanger" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </label>
          <label>
            <span>Amount Received</span>
            <input type="number" min="0" placeholder="e.g. 250000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="full-width">
            <span>Notes (optional)</span>
            <input type="text" placeholder="e.g. Week 1 remittance" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.source || !form.amount}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
