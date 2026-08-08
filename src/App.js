import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './Auth/AuthConfig';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './Landing/Landing';
import ChangePasswordPage from './Auth/ChangePasswordPage';
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
import MySales from './Home/MySales';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deactivatedError, setDeactivatedError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.uid && currentUser?.email) {
        try {
          const minimal = { uid: currentUser.uid, email: currentUser.email };
          localStorage.setItem('nexgrow_user', JSON.stringify(minimal));
        } catch {}

        try {
          // Check active status and must_change_password before allowing the user in
          const meResponse = await axios.get(`${SERVER_API_URL}/orders/me`, {
            params: { uid: currentUser.uid, email: currentUser.email },
          });
          if (meResponse.data.active === false) {
            await signOut(auth);
            setDeactivatedError(true);
            setLoading(false);
            return;
          }
          if (meResponse.data.must_change_password) {
            if (!window.location.pathname.includes('/change-password')) {
              setUser(currentUser);
              setLoading(false);
              window.location.replace('/change-password');
              return;
            }
          }
        } catch (e) {
          if (e?.response?.status === 403) {
            await signOut(auth);
            setDeactivatedError(true);
            setLoading(false);
            return;
          }
          console.warn('Failed to check user status:', e?.message);
        }

        // Auto-link Firebase UID (idempotent)
        try {
          const key = `nexgrow_link_${currentUser.uid}`;
          if (!localStorage.getItem(key)) {
            const payload = { uid: currentUser.uid, email: currentUser.email };
            try {
              await axios.post(`${SERVER_API_URL}/orders/link-uid`, payload);
            } catch (err) {
              const status = err?.response?.status;
              if (status === 404 || status === 405) {
                await axios.post(`${API_BASE_URL}/orders/link-uid`, payload);
              }
            }
            try { localStorage.setItem(key, '1'); } catch {}
          }
        } catch (e) {
          console.warn('Auto-link UID failed:', e?.message);
        }

        setUser(currentUser);
      } else {
        setUser(null);
        try { localStorage.removeItem('nexgrow_user'); } catch {}
      }

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
          <h2 style={{ color: 'var(--color-error)', marginBottom: '20px' }}>Access Denied</h2>
          <p style={{ marginBottom: '30px', fontSize: '1.1rem' }}>
            This admin area is restricted to Directors and Admins only.
          </p>

          {isSalesManager && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--brand-surface-alt)', borderRadius: '5px', color: 'var(--brand-green-dark)', border: '1px solid var(--brand-border)' }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Sales Manager Access</p>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                As a Sales Manager, use your dedicated manager dashboard to view and manage team orders.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {isSalesManager && (
              <button
                onClick={() => window.location.href = '/manager'}
                className="btn"
              >
                Manager Dashboard
              </button>
            )}
            <button
              onClick={() => window.location.href = '/home'}
              className="btn secondary"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }
    
    return children;
  };

  if (deactivatedError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', backgroundColor: 'var(--brand-bg)', color: 'var(--brand-text)',
        textAlign: 'center', padding: '2rem', fontFamily: "'Inter', sans-serif"
      }}>
        <h2 style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>Account Deactivated</h2>
        <p style={{ maxWidth: 400, color: 'var(--brand-text-soft)' }}>
          Your account has been deactivated. Please contact your administrator.
        </p>
        <button
          className="btn secondary"
          style={{ marginTop: '1.5rem' }}
          onClick={() => { setDeactivatedError(false); window.location.replace('/login'); }}
        >
          Back to Login
        </button>
      </div>
    );
  }

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
        <Route
          path="/change-password"
          element={
            user
              ? <ChangePasswordPage />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="/home" element={<ProtectedRoute user={user}><HomePage /></ProtectedRoute>} />
        <Route path="/order-form" element={<ProtectedRoute user={user}><OrderForm onSignOut={handleSignOut} /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute user={user}><Orders /></ProtectedRoute>} />
        <Route path="/dashboard" element={<AdminProtectedRoute user={user}><Dashboard /></AdminProtectedRoute>} />
        <Route path="/my-sales" element={<ProtectedRoute user={user}><MySales /></ProtectedRoute>} />
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
