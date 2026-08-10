import { useMemo, useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { addInventoryBatch, deleteInventoryBatch, useInventoryBatchExpenses } from '../hooks/useData';
import { DataError, EmptyState, FormError, KpiCard, Loader, Modal } from '../components/SharedUI';
import { formatDate, formatMoney, MARKETS } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

export default function InventoryPage() {
  const { products } = useSettings();
  const { data, loading, error, refetch } = useInventoryBatchExpenses();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    product: products[0] || '',
    batchName: '',
    supplier: '',
    market: 'both',
    nigeriaShare: '50',
    unitsReceived: '',
    stockCost: '',
    shippingCost: '',
    otherCost: '',
  });

  const batches = useMemo(() => {
    const grouped = new Map();
    data.forEach(expense => {
      if (!grouped.has(expense.batch_id)) {
        grouped.set(expense.batch_id, {
          id: expense.batch_id,
          date: expense.date,
          product: expense.product,
          batchName: expense.batch_name || 'Unnamed batch',
          supplier: expense.supplier,
          market: expense.market,
          nigeriaShare: Number(expense.nigeria_share ?? 50),
          unitsReceived: Number(expense.units_received) || 0,
          stockCost: 0,
          shippingCost: 0,
          otherCost: 0,
        });
      }
      const batch = grouped.get(expense.batch_id);
      const amount = Number(expense.amount) || 0;
      if (expense.category === 'stock_purchase') batch.stockCost += amount;
      if (expense.category === 'import_shipping') batch.shippingCost += amount;
      if (expense.category === 'other') batch.otherCost += amount;
    });
    return Array.from(grouped.values())
      .map(batch => ({
        ...batch,
        totalCost: batch.stockCost + batch.shippingCost + batch.otherCost,
        unitCost: batch.unitsReceived > 0
          ? (batch.stockCost + batch.shippingCost + batch.otherCost) / batch.unitsReceived
          : 0,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data]);

  const totalCost = Number(form.stockCost || 0) + Number(form.shippingCost || 0) + Number(form.otherCost || 0);
  const unitCost = Number(form.unitsReceived) > 0 ? totalCost / Number(form.unitsReceived) : 0;

  const openAdd = () => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      product: products[0] || '',
      batchName: '',
      supplier: '',
      market: 'both',
      nigeriaShare: '50',
      unitsReceived: '',
      stockCost: '',
      shippingCost: '',
      otherCost: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.product || !form.batchName.trim()) return setFormError('Date, product, and batch name are required.');
    if (!Number.isInteger(Number(form.unitsReceived)) || Number(form.unitsReceived) <= 0) return setFormError('Units received must be a whole number greater than zero.');
    if (Number(form.stockCost) <= 0) return setFormError('Enter a stock purchase cost greater than zero.');
    if (form.market === 'both' && (Number(form.nigeriaShare) < 0 || Number(form.nigeriaShare) > 100)) return setFormError('Nigeria allocation must be between 0% and 100%.');

    setSaving(true);
    setFormError('');
    try {
      await addInventoryBatch({
        date: form.date,
        product: form.product,
        batchName: form.batchName.trim(),
        supplier: form.supplier.trim(),
        market: form.market,
        nigeriaShare: Number(form.nigeriaShare),
        unitsReceived: Number(form.unitsReceived),
        stockCost: Number(form.stockCost),
        shippingCost: Number(form.shippingCost) || 0,
        otherCost: Number(form.otherCost) || 0,
      });
      setShowModal(false);
      refetch();
    } catch (saveError) {
      setFormError(`Failed to save batch: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!confirm(`Delete ${batch.batchName} and its linked expense entries?`)) return;
    try {
      await deleteInventoryBatch(batch.id);
      refetch();
    } catch (deleteError) {
      setFormError(`Failed to delete batch: ${deleteError.message}`);
    }
  };

  const totalInventoryCost = batches.reduce((sum, batch) => sum + batch.totalCost, 0);
  const totalUnits = batches.reduce((sum, batch) => sum + batch.unitsReceived, 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory Costs</h1>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Inventory Batch</button>
      </div>

      {loading ? <Loader /> : error ? <DataError message={error} onRetry={refetch} /> : (
        <>
          <div className="kpi-grid kpi-grid-3">
            <KpiCard title="Batches" value={batches.length.toLocaleString()} subtitle="Saved inventory purchases" icon={Package} color="#7B68EE" />
            <KpiCard title="Inventory Spend" value={formatMoney(totalInventoryCost)} subtitle="Stock, freight, and other costs" color="#E8594F" />
            <KpiCard title="Units Received" value={totalUnits.toLocaleString()} subtitle="Across saved batches" color="#4ECDC4" />
          </div>

          {batches.length === 0 ? (
            <EmptyState icon={Package} title="No inventory batches" message="Add a batch to calculate its landed cost per unit and record its expenses." action={<button className="btn-primary" onClick={openAdd}>Add Inventory Batch</button>} />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Units</th>
                    <th>Stock</th>
                    <th>Freight / Duty</th>
                    <th>Other</th>
                    <th>Landed Cost</th>
                    <th>Cost / Unit</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => (
                    <tr key={batch.id}>
                      <td>{formatDate(batch.date)}</td>
                      <td className="td-product">{batch.batchName}{batch.supplier ? ` · ${batch.supplier}` : ''}</td>
                      <td>{batch.product}</td>
                      <td>{batch.unitsReceived}</td>
                      <td>{formatMoney(batch.stockCost)}</td>
                      <td>{formatMoney(batch.shippingCost)}</td>
                      <td>{formatMoney(batch.otherCost)}</td>
                      <td className="td-amount">{formatMoney(batch.totalCost)}</td>
                      <td className="td-amount positive">{formatMoney(batch.unitCost)}</td>
                      <td><button className="btn-icon" onClick={() => handleDelete(batch)}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Inventory Batch">
        <div className="form-grid">
          <label><span>Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label>
            <span>Product</span>
            <select value={form.product} onChange={(event) => setForm({ ...form, product: event.target.value })}>
              {products.map(product => <option key={product} value={product}>{product}</option>)}
            </select>
          </label>
          <label><span>Batch Name</span><input type="text" placeholder="e.g. March shipment" value={form.batchName} onChange={(event) => setForm({ ...form, batchName: event.target.value })} /></label>
          <label><span>Supplier (optional)</span><input type="text" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} /></label>
          <label>
            <span>Market</span>
            <select value={form.market} onChange={(event) => setForm({ ...form, market: event.target.value })}>
              {[...MARKETS, 'both'].map(currentMarket => <option key={currentMarket} value={currentMarket}>{currentMarket.charAt(0).toUpperCase() + currentMarket.slice(1)}</option>)}
            </select>
          </label>
          {form.market === 'both' && <label><span>Nigeria Allocation (%)</span><input type="number" min="0" max="100" value={form.nigeriaShare} onChange={(event) => setForm({ ...form, nigeriaShare: event.target.value })} /></label>}
          <label><span>Units Received</span><input type="number" min="1" value={form.unitsReceived} onChange={(event) => setForm({ ...form, unitsReceived: event.target.value })} /></label>
          <label><span>Stock Purchase Cost</span><input type="number" min="0" value={form.stockCost} onChange={(event) => setForm({ ...form, stockCost: event.target.value })} /></label>
          <label><span>Freight, Duty & Clearing</span><input type="number" min="0" value={form.shippingCost} onChange={(event) => setForm({ ...form, shippingCost: event.target.value })} /></label>
          <label><span>Other Batch Costs</span><input type="number" min="0" value={form.otherCost} onChange={(event) => setForm({ ...form, otherCost: event.target.value })} /></label>
        </div>
        <div className="form-preview">Landed cost: {formatMoney(totalCost)} · Cost per unit: {unitCost > 0 ? formatMoney(unitCost) : '—'}</div>
        <p className="form-hint">Saving creates matching expense entries automatically. Manage this batch from Inventory Costs, not the Expenses page.</p>
        <FormError message={formError} />
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Batch'}</button>
        </div>
      </Modal>
    </div>
  );
}
