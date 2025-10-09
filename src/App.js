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
import ForecastForm from './Home/ForecastForm';
import ForecastView from './Home/ForecastView';
import DirectorForecasts from './Home/DirectorForecasts';
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

  const AdminProtectedRoute = ({ user, children }) => {
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const checkAdminAccess = async () => {
        if (!user) {
          setLoading(false);
          return;
        }
        
        try {
          const params = {};
          if (user.uid) params.uid = user.uid;
          if (user.email) params.email = user.email;
          
          const response = await axios.get(`${SERVER_API_URL}/orders/me`, { params });
          const userData = response.data;
          
          // Check if user is admin or director only (sales_manager should not have admin access)
          const allowedRoles = ['admin', 'director'];
          const hasAccess = allowedRoles.includes(userData.role) || userData.is_admin;
          
          setUserRole({ ...userData, hasAdminAccess: hasAccess });
        } catch (error) {
          console.error('Failed to check admin access:', error);
          setUserRole({ hasAdminAccess: false });
        } finally {
          setLoading(false);
        }
      };
      
      checkAdminAccess();
    }, [user]);
    
    if (!user) return <Navigate to="/login" replace />;
    
    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: 'var(--brand-bg)',
          color: 'var(--brand-text)',
          fontSize: '1.2rem'
        }}>
          Verifying access...
        </div>
      );
    }
    
    if (!userRole?.hasAdminAccess) {
      const isSalesManager = userRole?.role === 'sales_manager';
      
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: 'var(--brand-bg)',
          color: 'var(--brand-text)',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h2 style={{ color: '#E74C3C', marginBottom: '20px' }}>🔒 Access Denied</h2>
          <p style={{ marginBottom: '30px', fontSize: '1.1rem' }}>
            This admin area is restricted to Directors and Admins only.
          </p>
          
          {isSalesManager && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#E8F6F3', borderRadius: '5px', color: '#1E8449' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>💡 Sales Manager Access</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                As a Sales Manager, use your dedicated manager dashboard to view and manage team orders.
              </p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {isSalesManager && (
              <button 
                onClick={() => window.location.href = '/manager'}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2E86C1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                📊 Manager Dashboard
              </button>
            )}
            <button 
              onClick={() => window.location.href = '/home'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2C3E50',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '5px',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    
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
        <Route path="/forecast" element={<ProtectedRoute user={user}><ForecastForm /></ProtectedRoute>} />
        <Route path="/forecast-view" element={<ProtectedRoute user={user}><ForecastView /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<AdminProtectedRoute user={user}><AdminOrders /></AdminProtectedRoute>} />
        <Route path="/admin/discount-approvals" element={<AdminProtectedRoute user={user}><AdminDiscountApprovals /></AdminProtectedRoute>} />
        <Route path="/admin/management" element={<AdminProtectedRoute user={user}><AdminManagement /></AdminProtectedRoute>} />
        <Route path="/admin/forecasts" element={<AdminProtectedRoute user={user}><DirectorForecasts /></AdminProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
