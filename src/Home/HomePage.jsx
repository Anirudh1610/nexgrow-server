import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';

const HomePage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('admin'); // 'admin' or 'salesman'
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="app-shell fade-in" style={{ minHeight: '100vh' }}>
      <header className="app-header">
        <div className="app-header__logo" onClick={() => navigate('/home')}>
          NEXGROW
        </div>
        <div className="nav-tabs">
          <button
            className={view === 'admin' ? 'active' : ''}
            onClick={() => setView('admin')}
          >
            ADMIN VIEW
          </button>
          <button
            className={view === 'salesman' ? 'active' : ''}
            onClick={() => setView('salesman')}
          >
            SALESMAN VIEW
          </button>
        </div>
        <div className="app-header__actions">
          {user && (
            <span
              style={{
                fontSize: '.7rem',
                letterSpacing: '.5px',
                opacity: .85,
              }}
            >
              {user.displayName || user.email}
            </span>
          )}
          <button
            className="btn danger"
            onClick={async () => {
              await signOut(auth);
              navigate('/');
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="page">
        <h1
          className="section-title"
          style={{
            fontSize: '1.65rem',
            background: 'linear-gradient(90deg,#128d3b,#2fbf62)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Welcome {user?.displayName || user?.email || 'User'}
        </h1>
        {view === 'admin' ? (
          <div className="tiles">
            <div
              className="tile"
              onClick={() => navigate('/admin/discount-approvals')}
            >
              <h3>Discount Approvals</h3>
              <p>Review, approve or reject requested order discounts.</p>
            </div>
            <div className="tile" onClick={() => navigate('/admin/orders')}>
              <h3>All Orders</h3>
              <p>Monitor every order, its status and discount performance.</p>
            </div>
            <div className="tile" onClick={() => navigate('/admin/management')}>
              <h3>Data Management</h3>
              <p>Maintain salesmen, dealers and product catalog entries.</p>
            </div>
            <div className="tile" onClick={() => navigate('/dashboard')}>
              <h3>Dashboard</h3>
              <p>High level metrics & quick sales insights (beta).</p>
            </div>
          </div>
        ) : (
          <div className="tiles">
            <div className="tile" onClick={() => navigate('/order-form')}>
              <h3>Create Order</h3>
              <p>Build a multi-product order with instant pricing.</p>
            </div>
            <div className="tile" onClick={() => navigate('/orders')}>
              <h3>My Orders</h3>
              <p>Track submitted orders and discount statuses.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;

