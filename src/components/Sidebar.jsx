import {
  LayoutDashboard, TrendingUp, Receipt,
  PieChart, Megaphone, Wallet, Package, ClipboardCheck, LogOut, Menu, X, Settings
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/useAuth';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'profitability', label: 'Profitability', icon: PieChart },
  { id: 'ads', label: 'Ad Performance', icon: Megaphone },
  { id: 'cashflow', label: 'Cash Flow', icon: Wallet },
  { id: 'inventory', label: 'Inventory Costs', icon: Package },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${collapsed ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Wallet size={22} />
            <span>FinDash</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const NavIcon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => { onNavigate(item.id); setCollapsed(false); }}
              >
                <NavIcon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={logout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {collapsed && <div className="sidebar-overlay" onClick={() => setCollapsed(false)} />}
    </>
  );
}
