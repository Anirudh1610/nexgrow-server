import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import logo from '../assets/Logo.png';
import './UITheme.css';

const NAV_ITEMS = [
  { path: '/home', label: 'Home' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/admin/orders', label: 'Orders' },
  { path: '/admin/discount-approvals', label: 'Approvals' },
  { path: '/admin/management', label: 'Management' },
  { path: '/admin/forecasts', label: 'Forecasts' },
];

const TITLES = {
  '/home': 'Home',
  '/dashboard': 'Dashboard',
  '/admin/orders': 'All Orders',
  '/admin/discount-approvals': 'Discount Approvals',
  '/admin/management': 'Data Management',
  '/admin/forecasts': 'Sales Forecasts',
};

const initialsOf = (name, email) => {
  const src = (name || '').trim();
  if (src) {
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  }
  return (email || 'A').slice(0, 2).toUpperCase();
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 860);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try { await signOut(auth); } catch {}
    try { localStorage.removeItem('nexgrow_uid'); } catch {}
    navigate('/');
  };

  const user = auth?.currentUser;
  const displayName = user?.displayName || user?.email || 'Admin';
  const email = user?.email || '';

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
  const screenTitle = TITLES[location.pathname] || 'NexGrow';

  const sidebarStyle = {
    width: isMobile ? 240 : 248,
    flex: 'none',
    background: 'linear-gradient(195deg,#123c26,#0d2e1c 65%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '22px 16px',
    position: isMobile ? 'fixed' : 'sticky',
    top: 0,
    left: 0,
    height: '100vh',
    zIndex: 60,
    transition: 'transform .25s ease',
    boxShadow: isMobile ? '0 0 40px rgba(0,0,0,.35)' : 'none',
    transform: isMobile ? (mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {isMobile && mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 55 }}
        />
      )}

      <aside style={sidebarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 24px' }}>
          <img src={logo} alt="NexGrow" style={{ width: 34, height: 34, objectFit: 'contain', background: '#fff', borderRadius: 9, padding: 3 }} />
          <div>
            <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#fff', letterSpacing: '.2px', lineHeight: 1.1 }}>NexGrow</div>
            <div style={{ fontSize: '10.5px', color: '#8fb89e', letterSpacing: '.5px', textTransform: 'uppercase' }}>Admin</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
                  borderRadius: 10, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                  color: active ? '#0d2e1c' : '#cfe4d7',
                  background: active ? '#fff' : 'transparent',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#16a34a' : '#5a8a6c', display: 'inline-block' }} />
                {item.label}
              </div>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 8, borderRadius: 10, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#22c55e', color: '#0d2e1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12.5px', fontWeight: 800, flex: 'none' }}>
              {initialsOf(user?.displayName, email)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
              <div style={{ fontSize: '10.5px', color: '#8fb89e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{ width: '100%', padding: 9, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9, color: '#fff', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: 64, flex: 'none', background: '#ffffff', borderBottom: '1px solid var(--brand-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 14px' : '0 28px', position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {isMobile && (
              <button
                onClick={() => setMobileNavOpen((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, border: '1px solid var(--brand-border)', background: '#fff', cursor: 'pointer', marginRight: 10, flex: 'none' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ width: 16, height: 2, background: '#152018', display: 'block' }} />
                  <span style={{ width: 16, height: 2, background: '#152018', display: 'block' }} />
                  <span style={{ width: 16, height: 2, background: '#152018', display: 'block' }} />
                </span>
              </button>
            )}
            <div style={{ fontSize: isMobile ? '15px' : '17px', fontWeight: 700, color: 'var(--brand-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {screenTitle}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--brand-text-muted)', background: 'var(--brand-surface-alt)', padding: '6px 12px', borderRadius: 999 }}>
              {todayLabel}
            </span>
          </div>
        </header>

        <div className="fade-in" style={{ flex: 1, padding: isMobile ? '18px 14px' : '28px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
