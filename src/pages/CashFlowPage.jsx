import { useState } from 'react';
import { Plus, Trash2, Wallet, Package, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCashFlow, addCashFlow, deleteRecord } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Modal, EmptyState, Loader } from '../components/SharedUI';
import { formatMoney, formatDate, MARKETS, formatMoneyShort } from '../lib/utils';

export default function CashFlowPage() {
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useCashFlow(period, market);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    market: 'nigeria',
    orders_placed: '',
    orders_delivered: '',
    cash_collected: '',
    pending_amount: '',
    notes: '',
  });

  const totals = data.reduce(
    (acc, c) => ({
      placed: acc.placed + (c.orders_placed || 0),
      delivered: acc.delivered + (c.orders_delivered || 0),
      collected: acc.collected + Number(c.cash_collected || 0),
      pending: acc.pending + Number(c.pending_amount || 0),
    }),
    { placed: 0, delivered: 0, collected: 0, pending: 0 }
  );

  const deliveryRate = totals.placed > 0 ? ((totals.delivered / totals.placed) * 100) : 0;
  const collectionRate = (totals.collected + totals.pending) > 0
    ? ((totals.collected / (totals.collected + totals.pending)) * 100) : 0;

  // Chart data - last entries by date
  const chartData = [...data]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-14)
    .map(c => ({
      date: formatDate(c.date).slice(0, 6),
      collected: Number(c.cash_collected),
      pending: Number(c.pending_amount),
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await addCashFlow({
        date: form.date,
        market: form.market,
        orders_placed: Number(form.orders_placed) || 0,
        orders_delivered: Number(form.orders_delivered) || 0,
        cash_collected: Number(form.cash_collected) || 0,
        pending_amount: Number(form.pending_amount) || 0,
        notes: form.notes || null,
      });
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split('T')[0], market: 'nigeria', orders_placed: '', orders_delivered: '', cash_collected: '', pending_amount: '', notes: '' });
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
          <Plus size={16} /> Add Entry
        </button>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} />

      {loading ? <Loader /> : (
        <>
          <div className="kpi-grid">
            <KpiCard title="Cash Collected" value={formatMoney(totals.collected)} icon={Wallet} color="#4ECDC4" />
            <KpiCard title="Pending" value={formatMoney(totals.pending)} subtitle="In the pipeline" icon={Package} color="#F4A142" />
            <KpiCard title="Orders Placed" value={totals.placed.toLocaleString()} subtitle={`${totals.delivered} delivered`} icon={CheckCircle} color="#7B68EE" />
            <KpiCard title="Delivery Rate" value={`${deliveryRate.toFixed(1)}%`} subtitle={`Collection: ${collectionRate.toFixed(1)}%`} color="#45B7D1" />
          </div>

          {chartData.length > 0 && (
            <div className="chart-card">
              <h3>Collection Timeline</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Legend />
                  <Bar dataKey="collected" name="Collected" stackId="a" fill="#4ECDC4" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#F4A142" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.length === 0 ? (
            <EmptyState icon={Wallet} title="No cash flow data" message="Track your COD collections to see the pipeline" action={<button className="btn-primary" onClick={() => setShowAdd(true)}>Add Entry</button>} />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Market</th>
                    <th>Placed</th>
                    <th>Delivered</th>
                    <th>Collected</th>
                    <th>Pending</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td>{formatDate(c.date)}</td>
                      <td><span className={`market-badge ${c.market}`}>{c.market}</span></td>
                      <td>{c.orders_placed}</td>
                      <td>{c.orders_delivered}</td>
                      <td className="td-amount positive">{formatMoney(c.cash_collected, c.market)}</td>
                      <td className="td-amount">{formatMoney(c.pending_amount, c.market)}</td>
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

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Cash Flow Entry">
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
            <span>Orders Placed</span>
            <input type="number" min="0" value={form.orders_placed} onChange={(e) => setForm({ ...form, orders_placed: e.target.value })} />
          </label>
          <label>
            <span>Orders Delivered</span>
            <input type="number" min="0" value={form.orders_delivered} onChange={(e) => setForm({ ...form, orders_delivered: e.target.value })} />
          </label>
          <label>
            <span>Cash Collected</span>
            <input type="number" min="0" placeholder="e.g. 250000" value={form.cash_collected} onChange={(e) => setForm({ ...form, cash_collected: e.target.value })} />
          </label>
          <label>
            <span>Pending Amount</span>
            <input type="number" min="0" placeholder="e.g. 100000" value={form.pending_amount} onChange={(e) => setForm({ ...form, pending_amount: e.target.value })} />
          </label>
          <label className="full-width">
            <span>Notes (optional)</span>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
