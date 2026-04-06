import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useData } from '../../context/DataContext';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/trades': 'Daftar Transaksi',
  '/trades/new': 'Catat Transaksi',
  '/analytics': 'Analitik & Statistik',
  '/portfolio': 'Portfolio',
  '/watchlist': 'Watchlist',
  '/notes': 'Catatan Trading',
  '/calculator': 'Kalkulator Saham',
  '/settings': 'Pengaturan',
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { toasts } = useData();

  const pageTitle = PAGE_TITLES[location.pathname] || 'Jurnal Saham';

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header pageTitle={pageTitle} onMenuToggle={() => setSidebarOpen(v => !v)} />
        <div className="page-container">
          {children}
        </div>
      </div>
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span>{toast.type === 'success' ? '✅' : '❌'}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
