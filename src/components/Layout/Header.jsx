import { useAuth } from '../../context/AuthContext';

export default function Header({ pageTitle, onMenuToggle }) {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="btn btn-ghost btn-icon mobile-menu-btn"
          onClick={onMenuToggle}
          style={{ display: 'none' }}
        >
          ☰
        </button>
        <h2 className="header-title">{pageTitle}</h2>
      </div>
      <div className="header-right">
        <div className="header-user" onClick={logout} title="Klik untuk logout">
          <div className="header-avatar">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {user?.username || 'User'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🚪</span>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
