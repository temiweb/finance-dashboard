import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── KPI Card ──
export function KpiCard({ title, value, subtitle, change, icon: Icon, color }) {
  const changeDir = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return (
    <div className="kpi-card" style={{ '--accent': color || 'var(--primary)' }}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {Icon && <div className="kpi-icon"><Icon size={18} /></div>}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-footer">
        {change !== undefined && (
          <span className={`kpi-change ${changeDir}`}>
            {changeDir === 'up' && <TrendingUp size={13} />}
            {changeDir === 'down' && <TrendingDown size={13} />}
            {changeDir === 'flat' && <Minus size={13} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}

// ── Period Selector ──
import { useState as usePeriodState } from 'react';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last3months', label: 'Last 3 Months' },
  { value: 'all', label: 'All Time' },
];

export function PeriodSelector({ value, onChange, customRange, onCustomRange }) {
  const [showCustom, setShowCustom] = usePeriodState(value === 'custom');
  const [fromDate, setFromDate] = usePeriodState(customRange?.from || '');
  const [toDate, setToDate] = usePeriodState(customRange?.to || '');

  const handlePreset = (v) => {
    setShowCustom(false);
    onChange(v);
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    if (fromDate && toDate && onCustomRange) {
      onChange('custom');
      onCustomRange({ from: fromDate, to: toDate });
    }
  };

  const handleApply = () => {
    if (fromDate && toDate && onCustomRange) {
      onChange('custom');
      onCustomRange({ from: fromDate, to: toDate });
    }
  };

  return (
    <div className="period-selector-wrap">
      <div className="period-selector">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`period-btn ${value === p.value && !showCustom ? 'active' : ''}`}
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </button>
        ))}
        <button
          className={`period-btn ${showCustom ? 'active' : ''}`}
          onClick={handleCustomToggle}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="custom-range">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="custom-range-sep">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="btn-primary btn-sm" onClick={handleApply} disabled={!fromDate || !toDate}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// ── Market Filter ──
export function MarketFilter({ value, onChange }) {
  return (
    <div className="market-filter">
      {['all', 'nigeria', 'ghana'].map((m) => (
        <button
          key={m}
          className={`market-btn ${value === m ? 'active' : ''}`}
          onClick={() => onChange(m)}
        >
          {m === 'all' ? 'All Markets' : m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Modal ──
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Empty State ──
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={40} strokeWidth={1.2} />}
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

// ── Loading Spinner ──
export function Loader() {
  return (
    <div className="loader-wrap">
      <div className="loader" />
    </div>
  );
}
