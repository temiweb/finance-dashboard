import { useState, useMemo } from 'react';
import { PieChart as PieIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRevenue, useExpenses } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, Loader, DataError } from '../components/SharedUI';
import { formatMoney, formatMoneyShort, getExpenseAmount } from '../lib/utils';
import { useSettings } from '../lib/useSettings';

function ProfitabilityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0]?.payload?.fullName || label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} style={{ color: item.color }}>{item.name}: {formatMoney(item.value)}</p>
      ))}
    </div>
  );
}

export default function ProfitabilityPage() {
  const { convertToNaira } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);

  const { data: revenue, loading: rl, error: revenueError, refetch: refetchRevenue } = useRevenue(period, market, customRange);
  const { data: expenses, loading: el, error: expensesError, refetch: refetchExpenses } = useExpenses(period, market, customRange);
  const loading = rl || el;
  const error = revenueError || expensesError;

  const { overall, byProduct, byMarket } = useMemo(() => {
    const totalRev = revenue.reduce((s, r) => s + convertToNaira(r.total_amount, r.market, r.exchange_rate), 0);
    const totalExp = expenses.reduce((sum, expense) => sum + getExpenseAmount(expense, market), 0);
    const profit = totalRev - totalExp;
    const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;

    // By product (all converted to ₦)
    const prodRevMap = {};
    const prodExpMap = {};
    revenue.forEach(r => {
      prodRevMap[r.product] = (prodRevMap[r.product] || 0) + convertToNaira(r.total_amount, r.market, r.exchange_rate);
    });
    expenses.forEach(expense => {
      if (expense.product) {
        prodExpMap[expense.product] = (prodExpMap[expense.product] || 0) + getExpenseAmount(expense, market);
      }
    });

    const allProducts = [...new Set([...Object.keys(prodRevMap), ...Object.keys(prodExpMap)])];
    const byProduct = allProducts.map(p => {
      const rev = prodRevMap[p] || 0;
      const exp = prodExpMap[p] || 0;
      return {
        name: p.length > 12 ? p.slice(0, 11) + '…' : p,
        fullName: p,
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
      };
    });

    // By market (all converted to ₦)
    const mktRevMap = {};
    const mktExpMap = {};
    revenue.forEach(r => {
      mktRevMap[r.market] = (mktRevMap[r.market] || 0) + convertToNaira(r.total_amount, r.market, r.exchange_rate);
    });
    const visibleMarkets = market === 'all' ? ['nigeria', 'ghana'] : [market];
    expenses.forEach(expense => {
      visibleMarkets.forEach(currentMarket => {
        mktExpMap[currentMarket] = (mktExpMap[currentMarket] || 0) + getExpenseAmount(expense, currentMarket);
      });
    });

    const byMarket = visibleMarkets.map(m => {
      const rev = mktRevMap[m] || 0;
      const exp = mktExpMap[m] || 0;
      return { name: m.charAt(0).toUpperCase() + m.slice(1), revenue: rev, expenses: exp, profit: rev - exp };
    });

    return { overall: { totalRev, totalExp, profit, margin }, byProduct, byMarket };
  }, [revenue, expenses, convertToNaira, market]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profitability</h1>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : error ? <DataError message={error} onRetry={() => { refetchRevenue(); refetchExpenses(); }} /> : (
        <>
          <div className="kpi-grid kpi-grid-3">
            <KpiCard title="Revenue" value={formatMoney(overall.totalRev)} icon={TrendingUp} color="#4ECDC4" />
            <KpiCard
              title="Total Costs"
              value={formatMoney(overall.totalExp)}
              icon={TrendingDown}
              color="#E8594F"
            />
            <KpiCard
              title="Net Profit"
              value={formatMoney(overall.profit)}
              subtitle={`${overall.margin.toFixed(1)}% margin`}
              icon={PieIcon}
              color={overall.profit >= 0 ? '#4ECDC4' : '#E8594F'}
            />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>By Product</h3>
              {byProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byProduct} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                    <Tooltip content={<ProfitabilityTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#E8594F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No data to compare</div>
              )}
            </div>

            <div className="chart-card">
              <h3>By Market</h3>
              {byMarket.some(m => m.revenue > 0 || m.expenses > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byMarket} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                    <Tooltip content={<ProfitabilityTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#E8594F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#7B68EE" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No data to compare</div>
              )}
            </div>
          </div>

          {/* Profit table */}
          {byProduct.length > 0 && (
            <div className="chart-card">
              <h3>Profit Summary</h3>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Product</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Margin</th></tr>
                  </thead>
                  <tbody>
                    {byProduct.map((p, i) => (
                      <tr key={i}>
                        <td className="td-product">{p.fullName}</td>
                        <td>{formatMoney(p.revenue)}</td>
                        <td>{formatMoney(p.expenses)}</td>
                        <td className={`td-amount ${p.profit >= 0 ? 'positive' : 'negative'}`}>{formatMoney(p.profit)}</td>
                        <td>{p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
