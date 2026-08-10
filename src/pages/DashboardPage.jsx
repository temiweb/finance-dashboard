import { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, ShoppingCart, Wallet, PieChart, Megaphone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts';
import { KpiCard, PeriodSelector, MarketFilter, Loader, DataError } from '../components/SharedUI';
import { useRevenue, useExpenses, useCashFlow } from '../hooks/useData';
import { formatMoney, formatMoneyShort, CATEGORY_COLORS, getExpenseAmount } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

function DashboardTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0].payload.fullName || payload[0].payload.name}</p>
      <p className="chart-tooltip-value">{formatMoney(payload[0].value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { productColors: PRODUCT_COLORS, convertToNaira } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);

  const { data: revenue, loading: rl, error: revenueError, refetch: refetchRevenue } = useRevenue(period, market, customRange);
  const { data: expenses, loading: el, error: expensesError, refetch: refetchExpenses } = useExpenses(period, market, customRange);
  const { data: cashflow, loading: cl, error: cashFlowError, refetch: refetchCashFlow } = useCashFlow(period, market, customRange);

  const loading = rl || el || cl;
  const error = revenueError || expensesError || cashFlowError;

  const stats = useMemo(() => {
    const totalRevenue = revenue.reduce((s, r) => s + convertToNaira(r.total_amount, r.market, r.exchange_rate), 0);
    const totalAdSpend = expenses
      .filter(expense => expense.category === 'ad_spend')
      .reduce((sum, expense) => sum + getExpenseAmount(expense, market), 0);
    const cashCollected = cashflow.reduce((s, c) => s + Number(c.amount || 0), 0);

    // Units are sold quantities; delivered order counts come from CRM or manual Ghana entries.
    const totalUnits = revenue.reduce((s, r) => s + (r.quantity || 1), 0);
    const deliveredOrders = revenue.reduce((sum, item) => sum + (Number(item.delivered_orders) || 0), 0);
    const hasUnknownDeliveredOrders = revenue.some(item => item.source === 'manual' && !Number(item.delivered_orders));
    const deliveredUnits = totalUnits;
    const avgUnitsPerOrder = !hasUnknownDeliveredOrders && deliveredOrders > 0 ? deliveredUnits / deliveredOrders : 0;

    // Cost-based profit when the feature is on; otherwise the original revenue − all expenses.
    const totalExpenses = expenses.reduce((sum, expense) => sum + getExpenseAmount(expense, market), 0);
    const totalProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;

    return { totalRevenue, totalExpenses, totalAdSpend, totalProfit, margin, roas, totalUnits,
      deliveredOrders, deliveredUnits, avgUnitsPerOrder, hasUnknownDeliveredOrders, cashCollected };
  }, [revenue, expenses, cashflow, convertToNaira, market]);

  // Revenue by product chart data (converted to ₦)
  const revenueByProduct = useMemo(() => {
    const map = {};
    revenue.forEach(r => {
      map[r.product] = (map[r.product] || 0) + convertToNaira(r.total_amount, r.market, r.exchange_rate);
    });
    return Object.entries(map).map(([name, value]) => ({
      name: name.length > 15 ? name.slice(0, 14) + '…' : name,
      fullName: name,
      value,
      fill: PRODUCT_COLORS[name] || '#7B68EE',
    }));
  }, [revenue, convertToNaira, PRODUCT_COLORS]);

  // Expenses by category chart data
  const expensesByCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const label = e.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      map[e.category] = { name: label, value: (map[e.category]?.value || 0) + getExpenseAmount(e, market), fill: CATEGORY_COLORS[e.category] || '#95A5A6' };
    });
    return Object.values(map);
  }, [expenses, market]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Overview</h1>
        <div className="page-filters">
          <MarketFilter value={market} onChange={setMarket} />
        </div>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : error ? <DataError message={error} onRetry={() => { refetchRevenue(); refetchExpenses(); refetchCashFlow(); }} /> : (
        <>
          <div className="kpi-grid">
            <KpiCard title="Revenue" value={formatMoney(stats.totalRevenue)} subtitle={`${stats.totalUnits.toLocaleString()} units sold`} icon={TrendingUp} color="#4ECDC4" />
            <KpiCard
              title="Expenses"
              value={formatMoney(stats.totalExpenses)}
              subtitle={`Ad spend: ${formatMoney(stats.totalAdSpend)}`}
              icon={DollarSign}
              color="#E8594F"
            />
            <KpiCard title="Profit" value={formatMoney(stats.totalProfit)} subtitle={`${stats.margin.toFixed(1)}% margin`} icon={PieChart} color={stats.totalProfit >= 0 ? '#4ECDC4' : '#E8594F'} />
            <KpiCard title="Blended ROAS" value={stats.roas > 0 ? `${stats.roas.toFixed(1)}x` : '—'} subtitle="Period revenue ÷ ad spend" icon={Megaphone} color="#F4A142" />
            <KpiCard title="Cash Received" value={formatMoney(stats.cashCollected)} subtitle="From agents & exchangers" icon={Wallet} color="#7B68EE" />
            <KpiCard title="Units" value={stats.totalUnits.toLocaleString()} subtitle={`${stats.deliveredUnits.toLocaleString()} delivered`} icon={ShoppingCart} color="#26A69A" />
            <KpiCard
              title="Delivered Orders"
              value={stats.deliveredOrders.toLocaleString()}
              subtitle={stats.hasUnknownDeliveredOrders ? 'Add delivered orders to manual entries' : `${stats.avgUnitsPerOrder.toFixed(1)} units/order`}
              icon={ShoppingCart}
              color="#45B7D1"
            />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Revenue by Product</h3>
              {revenueByProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByProduct} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                    <Tooltip content={<DashboardTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {revenueByProduct.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No revenue data yet</div>
              )}
            </div>

            <div className="chart-card">
              <h3>Expenses Breakdown</h3>
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RPieChart>
                    <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3}>
                      {expensesByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardTooltip />} />
                  </RPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No expense data yet</div>
              )}
              {expensesByCategory.length > 0 && (
                <div className="chart-legend">
                  {expensesByCategory.map((e, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: e.fill }} />
                      <span>{e.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
