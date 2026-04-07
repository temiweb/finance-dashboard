import { useState } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenses, addExpense, deleteRecord } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Modal, EmptyState, Loader } from '../components/SharedUI';
import { formatMoney, formatDate, MARKETS, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../lib/utils';
import { useSettings } from '../lib/settings';

export default function ExpensesPage() {
  const { products: PRODUCTS } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useExpenses(period, market);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'ad_spend',
    product: '',
    market: 'nigeria',
    campaign: '',
    amount: '',
    description: '',
  });

  const totalExpenses = data.reduce((s, e) => s + Number(e.amount), 0);
  const adSpend = data.filter(e => e.category === 'ad_spend').reduce((s, e) => s + Number(e.amount), 0);

  const categoryData = Object.entries(
    data.reduce((acc, e) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category;
      acc[e.category] = { name: cat, value: (acc[e.category]?.value || 0) + Number(e.amount), fill: CATEGORY_COLORS[e.category] };
      return acc;
    }, {})
  ).map(([, v]) => v);

  const handleSave = async () => {
    if (!form.amount) return;
    setSaving(true);
    try {
      const entry = {
        date: form.date,
        category: form.category,
        market: form.market,
        amount: Number(form.amount),
        description: form.description || null,
        product: form.product || null,
        campaign: form.campaign || null,
      };
      await addExpense(entry);
      setShowAdd(false);
      setForm({ date: new Date().toISOString().split('T')[0], category: 'ad_spend', product: '', market: 'nigeria', campaign: '', amount: '', description: '' });
      refetch();
    } catch (e) {
      alert('Error: ' + e.message);
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
      alert('Error: ' + e.message);
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{payload[0].name}</p>
        <p className="chart-tooltip-value">{formatMoney(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Expenses</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} />

      {loading ? <Loader /> : (
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
                    <Tooltip content={<CustomTooltip />} />
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
            <EmptyState icon={Receipt} title="No expenses recorded" message="Track your costs to see profitability" action={<button className="btn-primary" onClick={() => setShowAdd(true)}>Add Expense</button>} />
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Product</th>
                    <th>Market</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((e) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.date)}</td>
                      <td>
                        <span className="category-badge" style={{ '--cat-color': CATEGORY_COLORS[e.category] }}>
                          {EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category}
                        </span>
                      </td>
                      <td>{e.product || '—'}</td>
                      <td><span className={`market-badge ${e.market}`}>{e.market}</span></td>
                      <td className="td-amount">{formatMoney(e.amount, e.market === 'both' ? 'nigeria' : e.market)}</td>
                      <td className="td-desc">{e.description || '—'}</td>
                      <td>
                        <button className="btn-icon" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
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
          <label>
            <span>Product (optional)</span>
            <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
              <option value="">— General —</option>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
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
        <div className="form-actions">
          <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.amount}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
