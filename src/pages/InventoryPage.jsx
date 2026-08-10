import { useMemo, useState } from 'react';
import { CircleCheck, Package, Plus, ReceiptText, Trash2, Truck } from 'lucide-react';
import { addInventoryBatch, addInventoryBatchCost, deleteInventoryBatch, markInventoryBatchReceived, useInventoryBatchExpenses } from '../hooks/useData';
import { DataError, EmptyState, FormError, KpiCard, Loader, Modal } from '../components/SharedUI';
import { formatDate, formatMoney, MARKETS } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

export default function InventoryPage() {
  const { products } = useSettings();
  const { data, loading, error, refetch } = useInventoryBatchExpenses();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [costBatch, setCostBatch] = useState(null);
  const [receiptBatch, setReceiptBatch] = useState(null);
  const [costForm, setCostForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'import_shipping', amount: '', description: '' });
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    product: products[0] || '',
    batchName: '',
    supplier: '',
    market: 'both',
    nigeriaShare: '50',
    unitsReceived: '',
    stockCost: '',
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
          receivedDate: expense.received_date || null,
          stockCost: 0,
          shippingCost: 0,
          otherCost: 0,
        });
      }
      const batch = grouped.get(expense.batch_id);
      if (expense.received_date) batch.receivedDate = expense.received_date;
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

  const totalCost = Number(form.stockCost || 0);
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
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.product || !form.batchName.trim()) return setFormError('Stock purchase date, product, and batch name are required.');
    if (!Number.isInteger(Number(form.unitsReceived)) || Number(form.unitsReceived) <= 0) return setFormError('Units expected must be a whole number greater than zero.');
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
      });
      setShowModal(false);
      refetch();
    } catch (saveError) {
      setFormError(`Failed to save batch: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openAddCost = (batch) => {
    setCostBatch(batch);
    setCostForm({ date: new Date().toISOString().split('T')[0], category: 'import_shipping', amount: '', description: '' });
    setFormError('');
  };

  const handleAddCost = async () => {
    if (!costForm.date || Number(costForm.amount) <= 0) return setFormError('Enter a payment date and amount greater than zero.');
    setSaving(true);
    setFormError('');
    try {
      await addInventoryBatchCost(costBatch, { ...costForm, amount: Number(costForm.amount) });
      setCostBatch(null);
      refetch();
    } catch (saveError) {
      setFormError(`Failed to add cost: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const openReceipt = (batch) => {
    setReceiptBatch(batch);
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setFormError('');
  };

  const handleReceipt = async () => {
    if (!receivedDate) return setFormError('Enter the date the batch was received.');
    setSaving(true);
    setFormError('');
    try {
      await markInventoryBatchReceived(receiptBatch.id, receivedDate);
      setReceiptBatch(null);
      refetch();
    } catch (saveError) {
      setFormError(`Failed to update batch: ${saveError.message}`);
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
            <KpiCard title="Batches" value={batches.length.toLocaleString()} subtitle={`${batches.filter(batch => !batch.receivedDate).length} in transit`} icon={Package} color="#7B68EE" />
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
                    <th>Paid</th>
                    <th>Batch</th>
                    <th>Product</th>
                    <th>Status</th>
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
                      <td><span className={`batch-status ${batch.receivedDate ? 'received' : 'transit'}`}>{batch.receivedDate ? 'Received' : 'In transit'}</span></td>
                      <td>{batch.unitsReceived}</td>
                      <td>{formatMoney(batch.stockCost)}</td>
                      <td>{formatMoney(batch.shippingCost)}</td>
                      <td>{formatMoney(batch.otherCost)}</td>
                      <td className="td-amount">{formatMoney(batch.totalCost)}</td>
                      <td className="td-amount positive">{formatMoney(batch.unitCost)}</td>
                      <td className="inventory-actions">
                        <button className="btn-icon" title="Add a batch cost" onClick={() => openAddCost(batch)}><ReceiptText size={14} /></button>
                        {!batch.receivedDate && <button className="btn-icon" title="Mark as received" onClick={() => openReceipt(batch)}><Truck size={14} /></button>}
                        <button className="btn-icon" title="Delete batch" onClick={() => handleDelete(batch)}><Trash2 size={14} /></button>
                      </td>
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
          <label><span>Stock Purchase Date</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
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
          <label><span>Units Expected</span><input type="number" min="1" value={form.unitsReceived} onChange={(event) => setForm({ ...form, unitsReceived: event.target.value })} /></label>
          <label><span>Stock Purchase Cost</span><input type="number" min="0" value={form.stockCost} onChange={(event) => setForm({ ...form, stockCost: event.target.value })} /></label>
        </div>
        <div className="form-preview">Initial cost: {formatMoney(totalCost)} · Initial cost per unit: {unitCost > 0 ? formatMoney(unitCost) : '—'}</div>
        <p className="form-hint">Save the stock purchase now. Add freight, duty, and other costs later on their actual payment dates, then mark the batch received.</p>
        <FormError message={formError} />
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Batch'}</button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(costBatch)} onClose={() => setCostBatch(null)} title={`Add Cost — ${costBatch?.batchName || ''}`}>
        <div className="form-grid">
          <label><span>Payment Date</span><input type="date" value={costForm.date} onChange={(event) => setCostForm({ ...costForm, date: event.target.value })} /></label>
          <label><span>Cost Type</span><select value={costForm.category} onChange={(event) => setCostForm({ ...costForm, category: event.target.value })}><option value="import_shipping">Freight, Duty & Clearing</option><option value="other">Other Batch Cost</option></select></label>
          <label><span>Amount</span><input type="number" min="0" value={costForm.amount} onChange={(event) => setCostForm({ ...costForm, amount: event.target.value })} /></label>
          <label><span>Note (optional)</span><input type="text" placeholder="e.g. Air freight payment" value={costForm.description} onChange={(event) => setCostForm({ ...costForm, description: event.target.value })} /></label>
        </div>
        <p className="form-hint">This cost is added to the batch unit cost and recorded as an expense on this payment date.</p>
        <FormError message={formError} />
        <div className="form-actions"><button className="btn-secondary" onClick={() => setCostBatch(null)}>Cancel</button><button className="btn-primary" onClick={handleAddCost} disabled={saving}>{saving ? 'Saving…' : 'Add Cost'}</button></div>
      </Modal>

      <Modal isOpen={Boolean(receiptBatch)} onClose={() => setReceiptBatch(null)} title={`Mark Received — ${receiptBatch?.batchName || ''}`}>
        <div className="form-grid"><label><span>Date Received</span><input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} /></label></div>
        <p className="form-hint">This confirms the batch has arrived. Its recorded payments are unchanged.</p>
        <FormError message={formError} />
        <div className="form-actions"><button className="btn-secondary" onClick={() => setReceiptBatch(null)}>Cancel</button><button className="btn-primary" onClick={handleReceipt} disabled={saving}><CircleCheck size={16} /> {saving ? 'Saving…' : 'Mark Received'}</button></div>
      </Modal>
    </div>
  );
}
