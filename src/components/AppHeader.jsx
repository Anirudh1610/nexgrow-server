import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import '../components/UITheme.css';

const AppHeader = ({
  centerContent = null,
  rightContent = null,
  onLogoClick = '/home',
  showUser = true,
  showSignOut = true,
}) => {
  const navigate = useNavigate();
  const user = auth?.currentUser;

  const defaultRight = (
    <>
      {showUser && (
        <span style={{ fontSize: '.8rem', fontWeight: 500 }}>
          {user?.displayName || user?.email}
        </span>
      )}
      {showSignOut && (
        <button
          className="btn danger"
          onClick={async () => {
            try { await signOut(auth); } catch {}
            try { localStorage.removeItem('nexgrow_uid'); } catch {}
            navigate('/');
          }}
        >
          Sign Out
        </button>
      )}
    </>
  );

  return (
    <header className="app-header">
      <div className="app-header__logo" onClick={() => {
        if (typeof onLogoClick === 'string') navigate(onLogoClick);
        else if (typeof onLogoClick === 'function') onLogoClick();
      }}>
        NEXGROW
      </div>
      {centerContent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {centerContent}
        </div>
      )}
      <div className="app-header__actions">
        {rightContent || defaultRight}
      </div>
    </header>
  );
};

export default AppHeader;
