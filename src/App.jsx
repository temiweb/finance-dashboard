import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import RevenuePage from './pages/RevenuePage';
import ExpensesPage from './pages/ExpensesPage';
import ProfitabilityPage from './pages/ProfitabilityPage';
import AdsPage from './pages/AdsPage';
import CashFlowPage from './pages/CashFlowPage';
import { Loader } from './components/SharedUI';
import './index.css';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (loading) return <Loader />;
  if (!isAuthenticated) return <LoginScreen />;

  const pages = {
    dashboard: DashboardPage,
    revenue: RevenuePage,
    expenses: ExpensesPage,
    profitability: ProfitabilityPage,
    ads: AdsPage,
    cashflow: CashFlowPage,
  };

  const PageComponent = pages[activePage] || DashboardPage;

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        <PageComponent />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
