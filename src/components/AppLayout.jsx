import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';
import axios from 'axios';
import { SERVER_API_URL } from '../Auth/APIConfig';
import './UITheme.css';

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const currentUser = auth?.currentUser;
    setUser(currentUser);

    // Fetch user role
    const fetchUserRole = async () => {
      if (!currentUser) return;
      
      try {
        const params = {};
        if (currentUser.uid) params.uid = currentUser.uid;
        if (currentUser.email) params.email = currentUser.email;
        
        const response = await axios.get(`${SERVER_API_URL}/orders/me`, { params });
        const userData = response.data;
        const allowedRoles = ['admin', 'director'];
        const hasAdminAccess = allowedRoles.includes(userData.role) || userData.is_admin;
        
        setUserRole({ ...userData, hasAdminAccess });
      } catch (error) {
        console.warn('Failed to fetch user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }
    try {
      localStorage.removeItem('nexgrow_uid');
    } catch (error) {
      console.error('Local storage clear error:', error);
    }
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--brand-bg)',
      color: 'var(--brand-text)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      padding: '1rem',
      borderBottom: '1px solid #e0e0e0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 700,
      background: 'linear-gradient(90deg,#128d3b,#2fbf62)',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      cursor: 'pointer',
    },
    nav: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    navButton: {
      padding: '.5rem 1rem',
      background: '#fff',
      color: 'var(--brand-green-dark)',
      border: '1px solid var(--brand-green)',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '.85rem',
      fontWeight: 500,
      textDecoration: 'none',
      transition: 'all 0.3s ease',
    },
    activeNavButton: {
      background: 'var(--brand-green)',
      color: '#fff',
    },
    userActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    },
    userName: {
      fontSize: '.85rem',
      fontWeight: 500,
      color: 'var(--brand-text-soft)',
    },
    signOutButton: {
      padding: '.5rem 1rem',
      background: '#dc3545',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '.85rem',
      fontWeight: 500,
    },
    content: {
      flex: 1,
      padding: isMobile ? '1rem' : '2rem',
      overflow: 'auto',
    }
  };

  // Navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { path: '/home', label: 'Home' },
      { path: '/order-form', label: 'New Order' },
      { path: '/orders', label: 'My Orders' },
      { path: '/dashboard', label: 'Dashboard' },
    ];

    // Add role-specific items
    if (userRole?.role === 'sales_manager') {
      baseItems.push({ path: '/manager', label: 'Team Management' });
    }

    if (userRole?.role === 'director' || userRole?.role === 'salesman') {
      baseItems.push({ path: '/forecast', label: 'Forecast' });
      baseItems.push({ path: '/forecast-view', label: 'View Forecasts' });
    }

    // Add admin items for directors and admins
    if (userRole?.hasAdminAccess) {
      baseItems.push(
        { path: '/admin/orders', label: 'Admin Orders' },
        { path: '/admin/discount-approvals', label: 'Approvals' },
        { path: '/admin/management', label: 'Data Management' },
        { path: '/admin/forecasts', label: 'All Forecasts' }
      );
    }

    return baseItems;
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div 
          style={styles.logo}
          onClick={() => navigate('/home')}
        >
          NEXGROW
        </div>
        
        {!isMobile && (
          <nav style={styles.nav}>
            {getNavItems().map((item) => (
              <button
                key={item.path}
                style={{
                  ...styles.navButton,
                  ...(isActive(item.path) ? styles.activeNavButton : {})
                }}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div style={styles.userActions}>
          <span style={styles.userName}>
            {user?.displayName || user?.email}
          </span>
          <button
            style={styles.signOutButton}
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </header>

      {isMobile && (
        <nav style={{ ...styles.nav, padding: '1rem', backgroundColor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
          {getNavItems().map((item) => (
            <button
              key={item.path}
              style={{
                ...styles.navButton,
                fontSize: '.75rem',
                padding: '.4rem .8rem',
                ...(isActive(item.path) ? styles.activeNavButton : {})
              }}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <main style={styles.content}>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;