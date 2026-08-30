import { useMemo, useState } from 'react';
import { Calculator, Package, Pencil, TrendingUp } from 'lucide-react';
import { useExpenses, useInventoryBatchExpenses, useRevenue } from '../hooks/useData';
import { DataError, EmptyState, FormError, KpiCard, Loader, MarketFilter, Modal, PeriodSelector } from '../components/SharedUI';
import { formatDate, formatMoney, getDateRange, getExpenseAmount } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

const INVENTORY_CATEGORIES = new Set(['stock_purchase', 'import_shipping']);

function latestOverride(overrides, product, endDate) {
  return overrides
    .filter(item => item.product === product && item.effective_date <= endDate)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0] || null;
}

export default function UnitEconomicsPage() {
  const { products, convertToNaira, unitCostOverrides, saveUnitCostOverride } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [customCost, setCustomCost] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: revenue, loading: revenueLoading, error: revenueError, refetch: refetchRevenue } = useRevenue(period, market, customRange);
  const { data: expenses, loading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useExpenses(period, market, customRange);
  const { data: inventoryRows, loading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = useInventoryBatchExpenses();
  const { to: endDate } = getDateRange(period, customRange);

  const receivedBatches = useMemo(() => {
    const batches = new Map();
    inventoryRows.forEach(row => {
      if (!batches.has(row.batch_id)) {
        batches.set(row.batch_id, {
          id: row.batch_id,
          product: row.product,
          name: row.batch_name || 'Unnamed batch',
          receivedDate: row.received_date,
          units: Number(row.units_received) || 0,
          total: 0,
        });
      }
      const batch = batches.get(row.batch_id);
      if (row.received_date) batch.receivedDate = row.received_date;
      if (INVENTORY_CATEGORIES.has(row.category) || row.category === 'other') batch.total += Number(row.amount) || 0;
    });
    return Array.from(batches.values())
      .filter(batch => batch.receivedDate && batch.receivedDate <= endDate && batch.units > 0)
      .map(batch => ({ ...batch, unitCost: batch.total / batch.units }))
      .sort((a, b) => b.receivedDate.localeCompare(a.receivedDate));
  }, [inventoryRows]);

  const economics = useMemo(() => {
    const productRevenue = new Map();
    revenue.forEach(row => {
      const sales = productRevenue.get(row.product) || { product: row.product, units: 0, orders: 0, revenue: 0 };
      sales.units += Number(row.quantity) || 0;
      sales.orders += Number(row.delivered_orders) || 0;
      sales.revenue += convertToNaira(row.total_amount, row.market, row.exchange_rate);
      productRevenue.set(row.product, sales);
    });
    const adSpend = new Map();
    const directCosts = new Map();
    expenses.forEach(expense => {
      if (!expense.product) return;
      const amount = getExpenseAmount(expense, market);
      if (expense.category === 'ad_spend') adSpend.set(expense.product, (adSpend.get(expense.product) || 0) + amount);
      if (!expense.batch_id && !INVENTORY_CATEGORIES.has(expense.category) && expense.category !== 'ad_spend') {
        directCosts.set(expense.product, (directCosts.get(expense.product) || 0) + amount);
      }
    });
    const productNames = [...new Set([...products, ...productRevenue.keys(), ...adSpend.keys(), ...directCosts.keys()])];
    return productNames.map(product => {
      const sales = productRevenue.get(product) || { product, units: 0, orders: 0, revenue: 0 };
      const override = latestOverride(unitCostOverrides, product, endDate);
      const batch = receivedBatches.find(item => item.product === product);
      const cogsPerUnit = override ? Number(override.cost) : (batch?.unitCost || 0);
      const cogsSource = override
        ? `Custom cost from ${formatDate(override.effective_date)}`
        : batch ? `${batch.name}, received ${formatDate(batch.receivedDate)}` : 'No received batch or custom cost';
      const productAdSpend = adSpend.get(product) || 0;
      const productDirectCosts = directCosts.get(product) || 0;
      const revenuePerUnit = sales.units > 0 ? sales.revenue / sales.units : 0;
      const adPerUnit = sales.units > 0 ? productAdSpend / sales.units : 0;
      const directPerUnit = sales.units > 0 ? productDirectCosts / sales.units : 0;
      return {
        ...sales,
        cogsPerUnit,
        cogsSource,
        revenuePerUnit,
        adPerUnit,
        directPerUnit,
        cogsForSoldUnits: cogsPerUnit * sales.units,
        contributionProfit: cogsPerUnit ? sales.revenue - (cogsPerUnit * sales.units) - productAdSpend - productDirectCosts : 0,
        profitPerUnit: cogsPerUnit && sales.units > 0 ? revenuePerUnit - cogsPerUnit - adPerUnit - directPerUnit : null,
      };
    }).filter(row => row.units > 0 || row.cogsPerUnit > 0).sort((a, b) => b.revenue - a.revenue);
  }, [revenue, expenses, products, convertToNaira, market, unitCostOverrides, endDate, receivedBatches]);

  const totals = useMemo(() => economics.reduce((total, row) => ({
    units: total.units + row.units,
    costedUnits: total.costedUnits + (row.cogsPerUnit ? row.units : 0),
    cogs: total.cogs + row.cogsForSoldUnits,
    profit: total.profit + row.contributionProfit,
  }), { units: 0, costedUnits: 0, cogs: 0, profit: 0 }), [economics]);

  const openCustomCost = product => {
    const current = latestOverride(unitCostOverrides, product, endDate);
    setEditingProduct(product);
    setCustomCost(current ? String(current.cost) : '');
    setEffectiveDate(current?.effective_date || new Date().toISOString().slice(0, 10));
    setFormError('');
  };

  const handleSaveCustomCost = async () => {
    setSaving(true);
    setFormError('');
    const result = await saveUnitCostOverride({ product: editingProduct, cost: customCost, effectiveDate });
    setSaving(false);
    if (!result.success) return setFormError(result.error);
    setEditingProduct(null);
  };

  const loading = revenueLoading || expensesLoading || inventoryLoading;
  const error = revenueError || expensesError || inventoryError;
  const retry = () => { refetchRevenue(); refetchExpenses(); refetchInventory(); };

  return (
    <div className="page">
      <div className="page-header"><div><h1>Unit Economics</h1><p className="form-hint">Estimated profit on delivered units, separate from the cash-based Profitability page.</p></div></div>
      <div className="page-filters"><MarketFilter value={market} onChange={setMarket} /></div>
      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />
      {loading ? <Loader /> : error ? <DataError message={error} onRetry={retry} /> : economics.length === 0 ? <EmptyState icon={Calculator} title="No unit economics yet" message="Add delivered revenue, then record a received inventory batch or set a custom unit cost." /> : <>
        <div className="kpi-grid kpi-grid-3">
          <KpiCard title="Delivered Units" value={totals.units.toLocaleString()} subtitle="Units in the selected period" icon={Package} color="#7B68EE" />
          <KpiCard title="COGS on Delivered Units" value={formatMoney(totals.cogs)} subtitle="Only units already delivered" icon={Calculator} color="#F4A142" />
          <KpiCard title="Contribution Profit" value={formatMoney(totals.profit)} subtitle={totals.costedUnits ? `${formatMoney(totals.profit / totals.costedUnits)} across ${totals.costedUnits} costed units` : 'Set a unit cost to calculate'} icon={TrendingUp} color={totals.profit >= 0 ? '#4ECDC4' : '#E8594F'} />
        </div>
        <div className="chart-card" style={{ marginBottom: '1.5rem' }}><p className="form-hint" style={{ margin: 0 }}>Net revenue is the revenue already recorded for each product. COGS is applied only to delivered units. Advertising and product-specific operating costs are included; general expenses, Ghana settlement tax, and vendor expenses are not allocated here.</p></div>
        <div className="data-table-wrap"><table className="data-table">
          <thead><tr><th>Product</th><th>Delivered Units</th><th>Net Revenue / Unit</th><th>COGS / Unit</th><th>Ad Cost / Unit</th><th>Other Direct / Unit</th><th>Profit / Unit</th><th>Delivered Orders</th><th>Units / Order</th><th></th></tr></thead>
          <tbody>{economics.map(row => <tr key={row.product}>
            <td className="td-product">{row.product}<div className="form-hint" style={{ margin: '0.2rem 0 0' }}>{row.cogsSource}</div></td>
            <td>{row.units}</td><td>{formatMoney(row.revenuePerUnit)}</td><td>{row.cogsPerUnit ? formatMoney(row.cogsPerUnit) : '-'}</td><td>{formatMoney(row.adPerUnit)}</td><td>{formatMoney(row.directPerUnit)}</td>
            <td className={row.profitPerUnit === null || row.profitPerUnit >= 0 ? 'positive' : 'negative'}>{row.profitPerUnit === null ? '-' : formatMoney(row.profitPerUnit)}</td><td>{row.orders || '-'}</td><td>{row.orders ? (row.units / row.orders).toFixed(1) : '-'}</td>
            <td><button className="btn-icon btn-edit" title="Set custom unit cost" onClick={() => openCustomCost(row.product)}><Pencil size={14} /></button></td>
          </tr>)}</tbody>
        </table></div>
      </>}
      <Modal isOpen={Boolean(editingProduct)} onClose={() => setEditingProduct(null)} title={`Custom Unit Cost - ${editingProduct || ''}`}>
        <div className="form-grid"><label><span>Cost per Unit (Naira)</span><input type="number" min="0" value={customCost} onChange={event => setCustomCost(event.target.value)} /></label><label><span>Effective From</span><input type="date" value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} /></label></div>
        <p className="form-hint">This overrides the received-batch cost for this product from the selected date onward. It does not edit historical expenses or inventory batches.</p><FormError message={formError} />
        <div className="form-actions"><button className="btn-secondary" onClick={() => setEditingProduct(null)}>Cancel</button><button className="btn-primary" onClick={handleSaveCustomCost} disabled={saving}>{saving ? 'Saving...' : 'Save Custom Cost'}</button></div>
      </Modal>
    </div>
  );
}
