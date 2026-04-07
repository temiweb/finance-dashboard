import { useState } from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { useRevenue, addRevenue, deleteRecord } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Modal, EmptyState, Loader } from '../components/SharedUI';
import { formatMoney, formatDate, PRODUCTS, MARKETS } from '../lib/utils';

export default function RevenuePage() {
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useRevenue(period, market);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    product: PRODUCTS[0],
    market: 'nigeria',
    quantity: 1,
    unit_price: '',
    notes: '',
  });

  const totalRevenue = data.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalOrders = data.reduce((s, r) => s + (r.quantity || 1), 0);

  const handleSave = async () => {
    if (!form.unit_price) return;
    setSaving(true);
    try {
      await addRevenue({
        ...form,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        total_amount: Number(form.quantity) * Number(form.unit_price),
        source: 'manual',
      });
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split('T')[0], product: PRODUCTS[0], market: 'nigeria', quantity: 1, unit_price: '', notes: '' });
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
      await deleteRecord('finance_revenue', id);
      refetch();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Revenue</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Revenue
        </button>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} />

      {loading ? <Loader /> : (
        <>
          <div className="kpi-grid kpi-grid-2">
            <KpiCard title="Total Revenue" value={formatMoney(totalRevenue)} subtitle={`${totalOrders} orders`} icon={TrendingUp} color="#4ECDC4" />
            <KpiCard title="Avg Order Value" value={totalOrders > 0 ? formatMoney(totalRevenue / totalOrders) : '—'} subtitle={`${data.length} entries`} color="#7B68EE" />
          </div>

          {data.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No revenue data" message="Add your first revenue entry to start tracking" action={<button className="btn-primary" onClick={() => setShowAdd(true)}>Add Revenue</button>} />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Market</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Source</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.date)}</td>
                      <td className="td-product">{r.product}</td>
                      <td><span className={`market-badge ${r.market}`}>{r.market}</span></td>
                      <td>{r.quantity}</td>
                      <td>{formatMoney(r.unit_price, r.market)}</td>
                      <td className="td-amount">{formatMoney(r.total_amount, r.market)}</td>
                      <td><span className={`source-badge ${r.source}`}>{r.source}</span></td>
                      <td>
                        {r.source === 'manual' && (
                          <button className="btn-icon" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Revenue">
        <div className="form-grid">
          <label>
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            <span>Product</span>
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>
            <span>Market</span>
            <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
              {MARKETS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </label>
          <label>
            <span>Quantity</span>
            <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </label>
          <label>
            <span>Unit Price</span>
            <input type="number" min="0" placeholder="e.g. 15000" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          </label>
          <label className="full-width">
            <span>Notes (optional)</span>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        {form.unit_price && (
          <div className="form-preview">
            Total: {formatMoney(Number(form.quantity) * Number(form.unit_price), form.market)}
          </div>
        )}
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.unit_price}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
