import { useState } from 'react';
import { Plus, Trash2, Pencil, TrendingUp } from 'lucide-react';
import { useRevenue, addRevenue, deleteRecord, updateRecord } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Modal, EmptyState, Loader } from '../components/SharedUI';
import { formatMoney, formatDate, MARKETS } from '../lib/utils';
import { useSettings } from '../lib/settings';

export default function RevenuePage() {
  const { products: PRODUCTS, convertToNaira } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useRevenue(period, market, customRange);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    product: PRODUCTS[0],
    market: 'nigeria',
    quantity: '',
    unit_price: '',
    total_amount: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

 // Always calculate in naira (converted for Ghana)
  const totalRevenueNaira = data.reduce((s, r) => s + convertToNaira(r.total_amount, r.market), 0);
  const totalOrders = data.reduce((s, r) => s + (r.quantity || 1), 0);

  // Original cedis total (only meaningful when Ghana filter is active)
  const totalCedis = market === 'ghana'
    ? data.reduce((s, r) => s + Number(r.total_amount), 0)
    : 0;

// Compute display total: if total_amount is filled use that, else qty × unit_price
  const computedTotal = form.total_amount
    ? Number(form.total_amount)
    : (Number(form.quantity) || 0) * (Number(form.unit_price) || 0);
  const canSave = computedTotal > 0;
  
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const entry = {
        date: form.date,
        product: form.product,
        market: form.market,
        quantity: Number(form.quantity) || 1,
        unit_price: Number(form.unit_price) || computedTotal,
        total_amount: computedTotal,
        source: 'manual',
        notes: form.notes || null,
      };
      if (editingId) {
        await updateRecord('finance_revenue', editingId, entry);
      } else {
        await addRevenue(entry);
      }
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      refetch();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      product: entry.product,
      market: entry.market,
      quantity: String(entry.quantity || ''),
      unit_price: String(entry.unit_price || ''),
      total_amount: String(entry.total_amount || ''),
      notes: entry.notes || '',
    });
    setShowModal(true);
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
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Revenue
        </button>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : (
        <>
          <div className="kpi-grid kpi-grid-2">
            <KpiCard
              title="Total Revenue"
              value={formatMoney(totalRevenueNaira)}
              subtitle={market === 'ghana' ? `GH₵${totalCedis.toLocaleString()} · ${totalOrders} units` : `${totalOrders} units sold`}
              icon={TrendingUp}
              color="#4ECDC4"
              />
            <KpiCard
              title="Avg Order Value"
              value={totalOrders > 0 ? formatMoney(totalRevenueNaira / totalOrders) : '—'}
              subtitle={`${totalOrders} units across ${data.length} entries`}
              color="#7B68EE"
              />
          </div>

          {data.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No revenue data" message="Add your first revenue entry to start tracking" action={<button className="btn-primary" onClick={openAdd}>Add Revenue</button>} />
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
                    <th>Status</th>
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
                      <td><span className={`status-badge ${r.status || ''}`}>{r.status || '—'}</span></td>
                      <td className="td-actions">
                        {r.source === 'manual' && (
                          <>
                            <button className="btn-icon btn-edit" onClick={() => openEdit(r)}><Pencil size={14} /></button>
                            <button className="btn-icon" onClick={() => handleDelete(r.id)}><Trash2 size={14} /></button>
                          </>
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

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingId(null); }} title={editingId ? 'Edit Revenue' : 'Add Revenue'}>
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
            <span>Total Amount</span>
            <input type="number" min="0" placeholder="e.g. 250000 (lump sum)" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
          </label>
          <label>
            <span>Qty Sold (optional)</span>
            <input type="number" min="1" placeholder="e.g. 15" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </label>
          <label>
            <span>Unit Price (optional)</span>
            <input type="number" min="0" placeholder="Auto if total + qty given" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
          </label>
          <label className="full-width">
            <span>Notes (optional)</span>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
        </div>
        <p className="form-hint">Enter a total amount directly, or fill qty × unit price to calculate it.</p>
        {computedTotal > 0 && (
          <div className="form-preview">
            Total: {formatMoney(computedTotal, form.market)}
            {form.quantity && computedTotal > 0 ? ` (${form.quantity} units)` : ''}
          </div>
        )}
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
