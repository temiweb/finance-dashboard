import { useState, useMemo } from 'react';
import { Megaphone, Target, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useRevenue, useExpenses } from '../hooks/useData';
import { KpiCard, PeriodSelector, MarketFilter, EmptyState, Loader } from '../components/SharedUI';
import { formatMoney, formatMoneyShort } from '../lib/utils';
import { useSettings } from '../lib/settings';

export default function AdsPage() {
  const { convertToNaira } = useSettings();
  const [period, setPeriod] = useState('month');
  const [market, setMarket] = useState('all');
  const [customRange, setCustomRange] = useState(null);

  const { data: revenue, loading: rl } = useRevenue(period, market, customRange);
  const { data: expenses, loading: el } = useExpenses(period, market, customRange);
  const loading = rl || el;

  const adData = useMemo(() => {
    const adExpenses = expenses.filter(e => e.category === 'ad_spend');
    const totalAdSpend = adExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalRevenue = revenue.reduce((s, r) => s + convertToNaira(r.total_amount, r.market), 0);
    const totalOrders = revenue.reduce((s, r) => s + (r.quantity || 1), 0);
    const roas = totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0;
    const costPerPurchase = totalOrders > 0 ? totalAdSpend / totalOrders : 0;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // By product
    const prodAdMap = {};
    const prodRevMap = {};
    const prodOrdMap = {};
    adExpenses.forEach(e => { if (e.product) prodAdMap[e.product] = (prodAdMap[e.product] || 0) + Number(e.amount); });
    revenue.forEach(r => {
      prodRevMap[r.product] = (prodRevMap[r.product] || 0) + convertToNaira(r.total_amount, r.market);
      prodOrdMap[r.product] = (prodOrdMap[r.product] || 0) + (r.quantity || 1);
    });

    const allProducts = [...new Set([...Object.keys(prodAdMap), ...Object.keys(prodRevMap)])];
    const byProduct = allProducts.map(p => {
      const spend = prodAdMap[p] || 0;
      const rev = prodRevMap[p] || 0;
      const orders = prodOrdMap[p] || 0;
      return {
        name: p.length > 12 ? p.slice(0, 11) + '…' : p,
        fullName: p,
        adSpend: spend,
        revenue: rev,
        roas: spend > 0 ? rev / spend : 0,
        cpp: orders > 0 ? spend / orders : 0,
        orders,
      };
    });

    // By campaign
    const campMap = {};
    adExpenses.forEach(e => {
      const key = e.campaign || 'Uncategorized';
      campMap[key] = (campMap[key] || 0) + Number(e.amount);
    });
    const byCampaign = Object.entries(campMap)
      .map(([name, spend]) => ({ name, spend }))
      .sort((a, b) => b.spend - a.spend);

    return { totalAdSpend, totalRevenue, totalOrders, roas, costPerPurchase, aov, byProduct, byCampaign };
  }, [revenue, expenses, convertToNaira]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{d.fullName || d.name}</p>
        <p>Ad Spend: {formatMoney(d.adSpend || d.spend)}</p>
        {d.revenue !== undefined && <p>Revenue: {formatMoney(d.revenue)}</p>}
        {d.roas !== undefined && <p>ROAS: {d.roas.toFixed(1)}x</p>}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Ad Performance</h1>
      </div>

      <div className="page-filters">
        <MarketFilter value={market} onChange={setMarket} />
      </div>
      <PeriodSelector value={period} onChange={setPeriod} customRange={customRange} onCustomRange={setCustomRange} />

      {loading ? <Loader /> : (
        <>
          <div className="kpi-grid kpi-grid-3">
            <KpiCard title="ROAS" value={adData.roas > 0 ? `${adData.roas.toFixed(1)}x` : '—'} subtitle={`Ad spend: ${formatMoney(adData.totalAdSpend)}`} icon={Megaphone} color="#F4A142" />
            <KpiCard title="Cost / Purchase" value={adData.costPerPurchase > 0 ? formatMoney(adData.costPerPurchase) : '—'} subtitle={`${adData.totalOrders} orders`} icon={Target} color="#E8594F" />
            <KpiCard title="Revenue from Ads" value={formatMoney(adData.totalRevenue)} subtitle={`AOV: ${adData.aov > 0 ? formatMoney(adData.aov) : '—'}`} icon={TrendingUp} color="#4ECDC4" />
          </div>

          {adData.byProduct.length === 0 && adData.byCampaign.length === 0 ? (
            <EmptyState icon={Megaphone} title="No ad data yet" message="Add ad spend entries in the Expenses page to see performance here" />
          ) : (
            <div className="charts-grid">
              {adData.byProduct.length > 0 && (
                <div className="chart-card">
                  <h3>ROAS by Product</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={adData.byProduct} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="adSpend" name="Ad Spend" fill="#E8594F" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" name="Revenue" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {adData.byCampaign.length > 0 && (
                <div className="chart-card">
                  <h3>Spend by Campaign</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={adData.byCampaign} layout="vertical" margin={{ top: 10, right: 10, bottom: 10, left: 80 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatMoneyShort} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="spend" fill="#F4A142" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ROAS Table */}
          {adData.byProduct.length > 0 && (
            <div className="chart-card">
              <h3>Product Performance</h3>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Product</th><th>Ad Spend</th><th>Revenue</th><th>Orders</th><th>ROAS</th><th>Cost/Purchase</th></tr>
                  </thead>
                  <tbody>
                    {adData.byProduct.map((p, i) => (
                      <tr key={i}>
                        <td className="td-product">{p.fullName}</td>
                        <td>{formatMoney(p.adSpend)}</td>
                        <td>{formatMoney(p.revenue)}</td>
                        <td>{p.orders}</td>
                        <td className={p.roas >= 2 ? 'positive' : p.roas >= 1 ? '' : 'negative'}>{p.roas > 0 ? `${p.roas.toFixed(1)}x` : '—'}</td>
                        <td>{p.cpp > 0 ? formatMoney(p.cpp) : '—'}</td>
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
