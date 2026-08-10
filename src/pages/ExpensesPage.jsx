import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenses, addExpense, deleteRecord, updateRecord } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Modal, EmptyState, Loader, FormError, Pagination, DataError } from '../components/SharedUI';
import { formatMoney, formatDate, getExpenseAmount, MARKETS, EXPENSE_CATEGORIES, CATEGORY_COLORS, AD_PLATFORMS } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

function ExpenseTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0].name}</p>
      <p className="chart-tooltip-value">{formatMoney(payload[0].value)}</p>
    </div>
  );
}

export default function ExpensesPage() {
  const { products: PRODUCTS } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const { data, loading, error, refetch } = useExpenses(period, market, customRange);
  useEffect(() => { setPage(1); }, [period, market, customRange]);
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    category: 'ad_spend',
    product: '',
    market: 'nigeria',
    nigeria_share: '50',
    platform: '',
    campaign: '',
    amount: '',
    description: '',
  };
  const [form, setForm] = useState(emptyForm);

  const totalExpenses = data.reduce((sum, expense) => sum + getExpenseAmount(expense, market), 0);
  const adSpend = data
    .filter(expense => expense.category === 'ad_spend')
    .reduce((sum, expense) => sum + getExpenseAmount(expense, market), 0);

  const categoryData = Object.entries(
    data.reduce((acc, e) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category;
      acc[e.category] = { name: cat, value: (acc[e.category]?.value || 0) + getExpenseAmount(e, market), fill: CATEGORY_COLORS[e.category] };
      return acc;
    }, {})
  ).map(([, v]) => v);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setEditingId(entry.id);
    setFormError('');
    setForm({
      date: entry.date,
      category: entry.category,
      product: entry.product || '',
      market: entry.market,
      nigeria_share: String(entry.nigeria_share ?? 50),
      platform: entry.platform || '',
      campaign: entry.campaign || '',
      amount: String(entry.amount),
      description: entry.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.date) return setFormError('Date is required.');
    if (!form.amount || Number(form.amount) <= 0) return setFormError('Enter a valid amount greater than zero.');
    if (form.market === 'both' && (!form.nigeria_share || Number(form.nigeria_share) < 0 || Number(form.nigeria_share) > 100)) {
      return setFormError('Nigeria allocation must be between 0% and 100%.');
    }
    setFormError('');
    setSaving(true);
    try {
      const entry = {
        date: form.date,
        category: form.category,
        market: form.market,
        nigeria_share: form.market === 'both' ? Number(form.nigeria_share) : 100,
        amount: Number(form.amount),
        description: form.description || null,
        product: form.product || null,
        platform: form.category === 'ad_spend' ? (form.platform || null) : null,
        campaign: form.category === 'ad_spend' ? (form.campaign || null) : null,
      };
      if (editingId) {
        await updateRecord('finance_expenses', editingId, entry);
      } else {
        await addExpense(entry);
      }
      setShowModal(false);
      setEditingId(null);
      setForm(emptyForm);
      refetch();
    } catch (e) {
      setFormError('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteRecord('finance_expenses', id);
      refetch();
    } catch (e) {
      setFormError('Failed to delete: ' + e.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : error ? <DataError message={error} onRetry={refetch} /> : (
        <>
          <div className="kpi-grid kpi-grid-2">
            <KpiCard title="Total Expenses" value={formatMoney(totalExpenses)} subtitle={`${data.length} entries`} icon={Receipt} color="#E8594F" />
            <KpiCard title="Ad Spend" value={formatMoney(adSpend)} subtitle={`${((adSpend / totalExpenses) * 100 || 0).toFixed(0)}% of total`} color="#F4A142" />
          </div>

          {categoryData.length > 0 && (
            <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
              <h3>By Category</h3>
              <div className="chart-with-legend">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {categoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip content={<ExpenseTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {categoryData.map((e, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: e.fill }} />
                      <span>{e.name}: {formatMoney(e.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {data.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses recorded" message="Track your costs to see profitability" action={<button className="btn-primary" onClick={openAdd}>Add Expense</button>} />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Platform</th>
                    <th>Product</th>
                    <th>Market</th>
                    <th>Allocation</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((e) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td>
                        <span className="category-badge" style={{ '--cat-color': CATEGORY_COLORS[e.category] }}>
                          {EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                        </span>
                      </td>
                      <td>{e.platform || '—'}</td>
                      <td>{e.product || '—'}</td>
                      <td><span className={`market-badge ${e.market}`}>{e.market}</span></td>
                      <td>{e.market === 'both' ? `NG ${Number(e.nigeria_share ?? 50)}% / GH ${100 - Number(e.nigeria_share ?? 50)}%` : '—'}</td>
                      <td className="td-amount">{formatMoney(getExpenseAmount(e, market))}</td>
                      <td className="td-desc">{e.description || '—'}</td>
                      <td className="td-actions">
                        {e.batch_id ? (
                          <span className="td-desc">Inventory</span>
                        ) : (
                          <>
                            <button className="btn-icon btn-edit" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                            <button className="btn-icon" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} total={data.length} pageSize={pageSize} onChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingId(null); }} title={editingId ? 'Edit Expense' : 'Add Expense'}>
        <div className="form-grid">
          <label>
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            <span>Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>
            <span>Market</span>
            <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
              {[...MARKETS, 'both'].map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </label>
          <label>
            <span>Amount</span>
            <input type="number" min="0" placeholder="e.g. 50000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          {form.market === 'both' && (
            <label>
              <span>Nigeria Allocation (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={form.nigeria_share} onChange={(e) => setForm({ ...form, nigeria_share: e.target.value })} />
              <small>Ghana receives {100 - (Number(form.nigeria_share) || 0)}%</small>
            </label>
          )}
          <label>
            <span>Product (optional)</span>
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
              <option value="">— General —</option>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          {form.category === 'ad_spend' && (
            <label>
              <span>Platform</span>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="">— Select platform —</option>
                {AD_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          )}
          {form.category === 'ad_spend' && (
            <label>
              <span>Campaign Name</span>
              <input type="text" placeholder="e.g. Net Tape - Pain Hook" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} />
            </label>
          )}
          <label className="full-width">
            <span>Description</span>
            <input type="text" placeholder="Optional details" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </div>
        <FormError message={formError} />
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => { setShowModal(false); setEditingId(null); }}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.amount}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
