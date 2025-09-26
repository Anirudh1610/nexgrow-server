import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './Auth/AuthConfig';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './Landing/Landing';
import OrderForm from './Home/OrderForm';
import Orders from './Home/Orders';
import HomePage from './Home/HomePage';
import Dashboard from './Home/Dashboard';
import AdminDiscountApprovals from './Home/AdminDiscountApprovals';
import AdminOrders from './Home/AdminOrders';
import AdminManagement from './Home/AdminManagement';
import axios from 'axios';
import { SERVER_API_URL, API_BASE_URL } from './Auth/APIConfig';
import SalesManager from './Home/SalesManager';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Auto-link Firebase UID to salesman or director by email (idempotent)
      (async () => {
        try {
          if (currentUser?.uid && currentUser?.email) {
            const key = `nexgrow_link_${currentUser.uid}`;
            // Optional: avoid spamming on rapid reloads
            if (!localStorage.getItem(key)) {
              const payload = { uid: currentUser.uid, email: currentUser.email };
              // Try primary (/api base), then fallback to non-/api base to handle deployments without the prefix
              try {
                await axios.post(`${SERVER_API_URL}/orders/link-uid`, payload);
              } catch (err) {
                const status = err?.response?.status;
                if (status === 404 || status === 405) {
                  await axios.post(`${API_BASE_URL}/orders/link-uid`, payload);
                } else {
                  throw err;
                }
              }
              try { localStorage.setItem(key, '1'); } catch {}
            }
          }
        } catch (e) {
          // Non-blocking; proceed even if linking fails
          console.warn('Auto-link UID failed:', e?.response?.data || e?.message || e);
        }
      })();
      try {
        if (currentUser) {
          const minimal = { uid: currentUser.uid, email: currentUser.email };
          localStorage.setItem('nexgrow_user', JSON.stringify(minimal));
        } else {
          localStorage.removeItem('nexgrow_user');
        }
      } catch {}
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    setUser(null);
  };

  const ProtectedRoute = ({ user, children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        backgroundColor: 'var(--brand-bg)',
        color: 'var(--brand-text)',
        fontSize: '1.2rem',
        fontFamily: "'Inter', sans-serif"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Landing />} />
        <Route path="/" element={user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
        <Route path="/home" element={<ProtectedRoute user={user}><HomePage /></ProtectedRoute>} />
        <Route path="/order-form" element={<ProtectedRoute user={user}><OrderForm onSignOut={handleSignOut} /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute user={user}><Orders /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
  <Route path="/manager" element={<ProtectedRoute user={user}><SalesManager /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute user={user}><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/discount-approvals" element={<ProtectedRoute user={user}><AdminDiscountApprovals /></ProtectedRoute>} />
        <Route path="/admin/management" element={<ProtectedRoute user={user}><AdminManagement /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
