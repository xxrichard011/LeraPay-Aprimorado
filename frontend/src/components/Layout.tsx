import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

export type Section = 'gateway' | 'checkout' | 'orders' | 'wallet' | 'withdrawals' | 'webhooks';

const NAV: { key: Section; label: string }[] = [
  { key: 'gateway', label: 'Conta no gateway' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'orders', label: 'Transações' },
  { key: 'wallet', label: 'Carteira' },
  { key: 'withdrawals', label: 'Saques' },
  { key: 'webhooks', label: 'Notificações' },
];

export function Layout({
  section,
  onNavigate,
  children,
}: {
  section: Section;
  onNavigate: (s: Section) => void;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // fecha o menu mobile assim que o usuario escolhe uma seção
  function handleNavigate(s: Section) {
    onNavigate(s);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button
          className="menu-toggle"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
        <BrandLogo />
      </div>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <BrandLogo className="brand-desktop" />
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${section === item.key ? 'active' : ''}`}
            onClick={() => handleNavigate(item.key)}
          >
            <span className="tick" />
            {item.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <div className="hint" style={{ marginBottom: 8 }}>
            {user?.name} · {user?.email}
          </div>
          <button className="btn btn-block" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
