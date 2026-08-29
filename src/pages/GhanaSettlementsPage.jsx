import { useMemo, useState } from 'react';
import { BanknoteArrowDown, CheckCircle2, Eye, Pencil, Plus, ReceiptText } from 'lucide-react';
import { createGhanaSettlement, getGhanaSettlementDetails, receiveGhanaSettlement, updateGhanaSettlement, useGhanaSettlements } from '../hooks/useData';
import { DataError, EmptyState, FormError, KpiCard, Loader, Modal } from '../components/SharedUI';
import { formatDate, formatMoney } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

export default function GhanaSettlementsPage() {
  const { products, exchangeRate } = useSettings();
  const { data, loading, error, refetch } = useGhanaSettlements();
  const [showForm, setShowForm] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingDetails, setEditingDetails] = useState(null);
  const [paymentSettlement, setPaymentSettlement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const emptyForm = () => ({
    billingDate: new Date().toISOString().split('T')[0],
    partner: '',
    reportingRate: String(exchangeRate),
    totalProducts: '', discount: '', deliveryFees: '', vendorExpenses: '', commission: '', codFee: '', tax: '',
    lines: [{ product: products[0] || '', units: '', orders: '', netRevenue: '' }],
  });
  const [form, setForm] = useState(emptyForm);
  const [payment, setPayment] = useState({ date: new Date().toISOString().split('T')[0], exchanger: '', amount: '', notes: '' });

  const summary = useMemo(() => {
    const totalProducts = Number(form.totalProducts) || 0;
    const deliveryFees = Number(form.deliveryFees) || 0;
    const deductions = ['vendorExpenses', 'commission', 'codFee', 'tax'].reduce((total, key) => total + (Number(form[key]) || 0), 0);
    const productRevenue = totalProducts - deliveryFees - (Number(form.commission) || 0) - (Number(form.codFee) || 0);
    const lineRevenue = form.lines.reduce((total, line) => total + (Number(line.netRevenue) || 0), 0);
    return { productRevenue, deductions, expectedPayout: productRevenue - (Number(form.vendorExpenses) || 0) - (Number(form.tax) || 0), lineRevenue };
  }, [form]);

  const pending = data.filter(item => item.status === 'pending');
  const received = data.filter(item => item.status === 'received');
  const openAdd = () => { setEditingDetails(null); setForm(emptyForm()); setFormError(''); setShowForm(true); };
  const updateLine = (index, changes) => setForm(current => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line) }));

  const openDetails = async (settlement) => {
    setDetailsLoading(true);
    setFormError('');
    try {
      setDetails(await getGhanaSettlementDetails(settlement));
    } catch (loadError) {
      setFormError(`Failed to load settlement details: ${loadError.message}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openEdit = (loadedDetails) => {
    setEditingDetails(loadedDetails);
    setForm(loadedDetails.form);
    setDetails(null);
    setFormError('');
    setShowForm(true);
  };

  const editSettlement = async (settlement) => {
    setDetailsLoading(true);
    setFormError('');
    try {
      openEdit(await getGhanaSettlementDetails(settlement));
    } catch (loadError) {
      setFormError(`Failed to load settlement for editing: ${loadError.message}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.billingDate || !form.partner.trim()) return setFormError('Billing date and delivery partner are required.');
    if (Number(form.totalProducts) <= 0) return setFormError('Enter the total sum of products from the bill.');
    if (Number(form.deliveryFees) < 0 || summary.expectedPayout <= 0) return setFormError('Check delivery fees and deductions; expected payout must be greater than zero.');
    if (Number(form.reportingRate) <= 0) return setFormError('Enter a valid GHS-to-Naira reporting rate.');
    if (form.lines.some(line => !line.product || Number(line.units) <= 0 || Number(line.orders) <= 0 || Number(line.netRevenue) <= 0)) return setFormError('Each product row needs product, units, delivered orders, and net revenue.');
    if (Math.abs(summary.lineRevenue - summary.productRevenue) > 0.01) return setFormError(`Product revenue must equal GHS ${summary.productRevenue.toLocaleString()} after delivery, commission, and COD fees.`);
    setSaving(true);
    setFormError('');
    try {
      const settlement = {
        ...form,
        partner: form.partner.trim(),
        reportingRate: Number(form.reportingRate),
        expectedPayout: summary.expectedPayout,
      };
      if (editingDetails) {
        await updateGhanaSettlement(editingDetails, settlement);
      } else {
        await createGhanaSettlement(settlement);
      }
      setShowForm(false);
      setEditingDetails(null);
      refetch();
    } catch (saveError) {
      setFormError(`Failed to save settlement: ${saveError.message}`);
    } finally { setSaving(false); }
  };

  const openPayment = (settlement) => {
    setPaymentSettlement(settlement);
    setPayment({ date: new Date().toISOString().split('T')[0], exchanger: '', amount: '', notes: '' });
    setFormError('');
  };

  const handlePayment = async () => {
    if (!payment.date || !payment.exchanger.trim() || Number(payment.amount) <= 0) return setFormError('Payment date, exchanger, and actual Naira received are required.');
    setSaving(true);
    setFormError('');
    try {
      await receiveGhanaSettlement(paymentSettlement, { ...payment, exchanger: payment.exchanger.trim(), amount: Number(payment.amount) });
      setPaymentSettlement(null);
      refetch();
    } catch (saveError) {
      setFormError(`Failed to record payment: ${saveError.message}`);
    } finally { setSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><h1>Ghana Settlements</h1><p className="page-description">Record a delivery-partner bill first, then record Naira cash only when your exchanger pays.</p></div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Weekly Bill</button>
      </div>

      {loading ? <Loader /> : error ? <DataError message={error} onRetry={refetch} /> : <>
        <div className="kpi-grid kpi-grid-3">
          <KpiCard title="Awaiting Payout" value={pending.length.toLocaleString()} subtitle={pending.length ? `${formatMoney(pending.reduce((total, item) => total + Number(item.expected_amount_ghs || 0), 0), 'ghana')} expected` : 'No unpaid bills'} icon={ReceiptText} color="#F4A142" />
          <KpiCard title="Bills Recorded" value={data.length.toLocaleString()} subtitle="Weekly delivery-partner statements" icon={BanknoteArrowDown} color="#7B68EE" />
          <KpiCard title="Paid Settlements" value={received.length.toLocaleString()} subtitle="Cash received in Naira" icon={CheckCircle2} color="#4ECDC4" />
        </div>

        {data.length === 0 ? <EmptyState icon={ReceiptText} title="No Ghana settlements" message="Add the totals from your delivery partner's weekly bill." action={<button className="btn-primary" onClick={openAdd}>Add Weekly Bill</button>} /> : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Billing Date</th><th>Partner</th><th>Expected Payout</th><th>Status</th><th>Cash Received</th><th>Rate</th><th></th></tr></thead><tbody>
            {data.map(item => <tr key={item.id}>
              <td>{formatDate(item.billing_date || item.date)}</td><td className="td-product">{item.source}</td><td>{formatMoney(item.expected_amount_ghs, 'ghana')}</td>
              <td><span className={`batch-status ${item.status === 'received' ? 'received' : 'transit'}`}>{item.status === 'received' ? 'Paid' : 'Awaiting payment'}</span></td>
              <td className="td-amount positive">{item.status === 'received' ? formatMoney(item.amount) : '—'}</td>
              <td>{item.status === 'received' && item.exchange_rate ? `₦${Number(item.exchange_rate).toFixed(2)} / GHS` : '—'}</td>
              <td className="settlement-actions"><button className="btn-icon" title="View details" onClick={() => openDetails(item)}><Eye size={14} /></button><button className="btn-icon btn-edit" title="Edit settlement" onClick={() => editSettlement(item)}><Pencil size={14} /></button>{item.status === 'pending' && <button className="btn-secondary btn-sm" onClick={() => openPayment(item)}>Record Payment</button>}</td>
            </tr>)}
          </tbody></table></div>
        )}
      </>}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditingDetails(null); }} title={editingDetails ? 'Edit Ghana Weekly Bill' : 'Add Ghana Weekly Bill'}>
        <div className="form-grid">
          <label><span>Billing Date</span><input type="date" value={form.billingDate} onChange={event => setForm({ ...form, billingDate: event.target.value })} /></label>
          <label><span>Delivery Partner</span><input type="text" placeholder="e.g. Partner name" value={form.partner} onChange={event => setForm({ ...form, partner: event.target.value })} /></label>
          <label><span>Total Sum of Products (GHS)</span><input type="number" min="0" value={form.totalProducts} onChange={event => setForm({ ...form, totalProducts: event.target.value })} /></label>
          <label><span>Discount (GHS, informational)</span><input type="number" min="0" value={form.discount} onChange={event => setForm({ ...form, discount: event.target.value })} /></label>
          <label><span>Total Delivery Fees (GHS)</span><input type="number" min="0" value={form.deliveryFees} onChange={event => setForm({ ...form, deliveryFees: event.target.value })} /></label>
          <label><span>Vendor Expenses (GHS)</span><input type="number" min="0" value={form.vendorExpenses} onChange={event => setForm({ ...form, vendorExpenses: event.target.value })} /></label>
          <label><span>Commission (GHS)</span><input type="number" min="0" value={form.commission} onChange={event => setForm({ ...form, commission: event.target.value })} /></label>
          <label><span>COD Fee (GHS)</span><input type="number" min="0" value={form.codFee} onChange={event => setForm({ ...form, codFee: event.target.value })} /></label>
          <label><span>Tax (GHS)</span><input type="number" min="0" value={form.tax} onChange={event => setForm({ ...form, tax: event.target.value })} /></label>
          <label><span>Reporting Rate (NGN per GHS)</span><input type="number" min="0.01" step="0.01" value={form.reportingRate} onChange={event => setForm({ ...form, reportingRate: event.target.value })} /></label>
        </div>
        <div className="settlement-summary">Product revenue after delivery, commission & COD: {formatMoney(summary.productRevenue, 'ghana')} · Amount Due Vendor after vendor expenses & tax: {formatMoney(summary.expectedPayout, 'ghana')}</div>
        <div className="settlement-lines"><div className="settlement-lines-header"><h4>Product Revenue Breakdown</h4><button className="btn-secondary btn-sm" onClick={() => setForm({ ...form, lines: [...form.lines, { product: products[0] || '', units: '', orders: '', netRevenue: '' }] })}>Add Product</button></div>
          {form.lines.map((line, index) => <div className="settlement-line" key={index}>
            <select value={line.product} onChange={event => updateLine(index, { product: event.target.value })}>{products.map(product => <option key={product} value={product}>{product}</option>)}</select>
            <input type="number" min="1" placeholder="Units" value={line.units} onChange={event => updateLine(index, { units: event.target.value })} />
            <input type="number" min="1" placeholder="Orders" value={line.orders} onChange={event => updateLine(index, { orders: event.target.value })} />
            <input type="number" min="0" placeholder="Product revenue GHS" value={line.netRevenue} onChange={event => updateLine(index, { netRevenue: event.target.value })} />
            {form.lines.length > 1 && <button className="btn-icon" onClick={() => setForm({ ...form, lines: form.lines.filter((_, lineIndex) => lineIndex !== index) })}>×</button>}
          </div>)}
          <p className="form-hint">Discount is saved for reference only: VDL's displayed amount due does not deduct it again. Enter each product's amount after delivery, commission, and COD fees. Vendor expenses and tax stay separate for the whole bill.</p>
        </div>
        <FormError message={formError} /><div className="form-actions"><button className="btn-secondary" onClick={() => { setShowForm(false); setEditingDetails(null); }}>Cancel</button><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingDetails ? 'Save Changes' : 'Save Bill'}</button></div>
      </Modal>

      <Modal isOpen={Boolean(details) || detailsLoading} onClose={() => setDetails(null)} title="Ghana Settlement Details">
        {detailsLoading ? <Loader /> : details && <>
          <div className="settlement-detail-grid">
            <span>Partner<strong>{details.form.partner}</strong></span><span>Billing date<strong>{formatDate(details.form.billingDate)}</strong></span>
            <span>Total products<strong>{formatMoney(details.form.totalProducts, 'ghana')}</strong></span><span>Discount (info only)<strong>{formatMoney(details.form.discount, 'ghana')}</strong></span>
            <span>Delivery fees<strong>{formatMoney(details.form.deliveryFees, 'ghana')}</strong></span><span>Commission<strong>{formatMoney(details.form.commission, 'ghana')}</strong></span>
            <span>COD fee<strong>{formatMoney(details.form.codFee, 'ghana')}</strong></span><span>Vendor expenses<strong>{formatMoney(details.form.vendorExpenses, 'ghana')}</strong></span>
            <span>Tax<strong>{formatMoney(details.form.tax, 'ghana')}</strong></span><span>Amount due vendor<strong>{formatMoney(details.settlement.expected_amount_ghs, 'ghana')}</strong></span>
          </div>
          <h4 className="detail-heading">Product Revenue</h4><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Units</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>{details.lines.map(line => <tr key={line.id}><td>{line.product}</td><td>{line.quantity}</td><td>{line.delivered_orders}</td><td>{formatMoney(line.total_amount, 'ghana')}</td></tr>)}</tbody></table></div>
          <div className="form-actions"><button className="btn-secondary" onClick={() => setDetails(null)}>Close</button><button className="btn-primary" onClick={() => openEdit(details)}><Pencil size={16} /> Edit Settlement</button></div>
        </>}
      </Modal>

      <Modal isOpen={Boolean(paymentSettlement)} onClose={() => setPaymentSettlement(null)} title="Record Ghana Payment">
        <p className="form-hint">Expected payout: {formatMoney(paymentSettlement?.expected_amount_ghs, 'ghana')}. Record the actual Naira received from your exchanger.</p>
        <div className="form-grid"><label><span>Date Received</span><input type="date" value={payment.date} onChange={event => setPayment({ ...payment, date: event.target.value })} /></label><label><span>Exchanger</span><input type="text" value={payment.exchanger} onChange={event => setPayment({ ...payment, exchanger: event.target.value })} /></label><label><span>Actual Naira Received</span><input type="number" min="0" value={payment.amount} onChange={event => setPayment({ ...payment, amount: event.target.value })} /></label><label><span>Notes (optional)</span><input type="text" value={payment.notes} onChange={event => setPayment({ ...payment, notes: event.target.value })} /></label></div>
        {Number(payment.amount) > 0 && paymentSettlement?.expected_amount_ghs && <div className="form-preview">Effective rate: ₦{(Number(payment.amount) / Number(paymentSettlement.expected_amount_ghs)).toFixed(2)} per GHS</div>}
        <FormError message={formError} /><div className="form-actions"><button className="btn-secondary" onClick={() => setPaymentSettlement(null)}>Cancel</button><button className="btn-primary" onClick={handlePayment} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</button></div>
      </Modal>
    </div>
  );
}
