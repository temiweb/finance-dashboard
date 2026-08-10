import { createElement, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Package, Receipt, TrendingUp } from 'lucide-react';
import { DataError, KpiCard, Loader, MarketFilter, PeriodSelector } from '../components/SharedUI';
import { useExpenses, useInventoryBatchExpenses, useRevenue } from '../hooks/useData';
import { formatDate, formatMoney } from '../lib/utils';

function ReviewSection({ icon, title, description, items, renderItem }) {
  return (
    <section className="review-section">
      <div className="review-section-header">
        <div>
          <h2>{createElement(icon, { size: 18 })} {title}</h2>
          <p>{description}</p>
        </div>
        <span className={`review-count ${items.length === 0 ? 'clear' : ''}`}>
          {items.length === 0 ? 'All clear' : `${items.length} to review`}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="review-clear"><CheckCircle2 size={18} /> Nothing needs attention here.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table review-table">
            <tbody>{items.map(renderItem)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ReviewPage() {
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);
  const { data: revenue, loading: revenueLoading, error: revenueError, refetch: refetchRevenue } = useRevenue(period, market, customRange);
  const { data: expenses, loading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useExpenses(period, market, customRange);
  const { data: inventoryExpenses, loading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = useInventoryBatchExpenses();

  const checks = useMemo(() => {
    const manualRevenue = revenue.filter(item => item.source === 'manual');
    const revenueMissingOrders = manualRevenue.filter(item => !Number(item.delivered_orders));
    const ghanaMissingRate = manualRevenue.filter(item => item.market === 'ghana' && !Number(item.exchange_rate));
    const sharedExpensesMissingAllocation = expenses.filter(item => item.market === 'both' && (item.nigeria_share === null || item.nigeria_share === undefined));

    const batches = new Map();
    inventoryExpenses.forEach(item => {
      if (!batches.has(item.batch_id)) batches.set(item.batch_id, item);
    });
    const incompleteBatches = [...batches.values()].filter(item => !item.batch_name || !item.product || !Number(item.units_received));

    return { revenueMissingOrders, ghanaMissingRate, sharedExpensesMissingAllocation, incompleteBatches };
  }, [revenue, expenses, inventoryExpenses]);

  const loading = revenueLoading || expensesLoading || inventoryLoading;
  const error = revenueError || expensesError || inventoryError;
  const issueCount = checks.revenueMissingOrders.length + checks.ghanaMissingRate.length + checks.sharedExpensesMissingAllocation.length + checks.incompleteBatches.length;
  const refetchAll = () => { refetchRevenue(); refetchExpenses(); refetchInventory(); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Review</h1>
          <p className="page-description">Check for entries that could make reports less accurate. This page never changes your records.</p>
        </div>
        <div className="page-filters"><MarketFilter value={market} onChange={setMarket} /></div>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : error ? <DataError message={error} onRetry={refetchAll} /> : (
        <>
          <div className="kpi-grid kpi-grid-3">
            <KpiCard title="Items to Review" value={issueCount.toLocaleString()} subtitle={issueCount === 0 ? 'Your selected period looks complete' : 'Fix these from Revenue, Expenses, or Inventory'} icon={ClipboardCheck} color={issueCount === 0 ? '#4ECDC4' : '#F4A142'} />
            <KpiCard title="Revenue Entries" value={revenue.length.toLocaleString()} subtitle="Delivered CRM orders and manual entries" icon={TrendingUp} color="#7B68EE" />
            <KpiCard title="Expense Entries" value={expenses.length.toLocaleString()} subtitle="Recorded for the selected period" icon={Receipt} color="#E8594F" />
          </div>

          <div className="review-intro">
            <AlertTriangle size={18} />
            <span>These are reminders, not errors. Older records may legitimately lack newer fields.</span>
          </div>

          <div className="review-grid">
            <ReviewSection
              icon={TrendingUp}
              title="Manual revenue details"
              description="Manual Ghana entries need delivered orders for reliable order-based metrics."
              items={checks.revenueMissingOrders}
              renderItem={item => <tr key={item.id}><td>{formatDate(item.date)}</td><td className="td-product">{item.product || 'Unknown product'}</td><td>{item.market}</td><td className="review-action">Add delivered orders in Revenue</td></tr>}
            />
            <ReviewSection
              icon={TrendingUp}
              title="Ghana exchange rates"
              description="A saved rate keeps historical Naira totals accurate when exchange rates change."
              items={checks.ghanaMissingRate}
              renderItem={item => <tr key={item.id}><td>{formatDate(item.date)}</td><td className="td-product">{item.product || 'Unknown product'}</td><td>{formatMoney(item.total_amount)}</td><td className="review-action">Add the rate in Revenue</td></tr>}
            />
            <ReviewSection
              icon={Receipt}
              title="Shared expense allocation"
              description="Expenses used by both markets need a Nigeria percentage for market profitability reports."
              items={checks.sharedExpensesMissingAllocation}
              renderItem={item => <tr key={item.id}><td>{formatDate(item.date)}</td><td className="td-product">{item.description || item.category.replace(/_/g, ' ')}</td><td>{formatMoney(item.amount)}</td><td className="review-action">Set allocation in Expenses</td></tr>}
            />
            <ReviewSection
              icon={Package}
              title="Inventory batch details"
              description="Each batch needs a name, product, and units received to calculate its unit cost."
              items={checks.incompleteBatches}
              renderItem={item => <tr key={item.batch_id}><td>{formatDate(item.date)}</td><td className="td-product">{item.batch_name || 'Unnamed batch'}</td><td>{item.product || 'No product'}</td><td className="review-action">Recreate in Inventory Costs</td></tr>}
            />
          </div>
        </>
      )}
    </div>
  );
}
