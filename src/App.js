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
import { SERVER_API_URL } from './Auth/APIConfig';
import SalesManager from './Home/SalesManager';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      // Auto-link Firebase UID to salesman by email (idempotent)
      (async () => {
        try {
          if (currentUser?.uid && currentUser?.email) {
            const key = `nexgrow_link_${currentUser.uid}`;
            // Optional: avoid spamming on rapid reloads
            if (!localStorage.getItem(key)) {
              await axios.post(`${SERVER_API_URL}/orders/link-uid`, {
                uid: currentUser.uid,
                email: currentUser.email
              });
              try { localStorage.setItem(key, '1'); } catch {}
            }
          }
        } catch (e) {
          // Non-blocking; proceed even if linking fails
          console.warn('Auto-link UID failed:', e?.response?.data || e?.message || e);
        }
      })();
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
        background: 'var(--brand-gradient)',
        color: '#ffffff',
        fontSize: '1.2rem'
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
