import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NavBar = ({ title = "App" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const styles = {
    tabs: { 
      display:'flex', 
      justifyContent:'center', 
      gap:'.5rem', 
      marginBottom:'1rem', 
      flexWrap:'wrap', 
      position:'sticky', 
      top:'0', 
      zIndex:50, 
      backgroundColor:'#ffffff', 
      paddingTop:'.5rem', 
      paddingBottom:'.75rem', 
      borderBottom:'1px solid #e0e0e0', 
      width:'100%', 
      maxWidth:'100%' 
    },
    tab: { 
      padding:'.5rem .8rem', 
      background:'#fff', 
      color:'var(--brand-green-dark)', 
      border:'1px solid var(--brand-green)', 
      borderRadius:'var(--radius-md)', 
      cursor:'pointer', 
      fontSize:'.7rem', 
      fontWeight:500, 
      letterSpacing:'.3px', 
      transition:'var(--transition-base)' 
    },
    activeTab: { 
      background:'var(--brand-green)', 
      color:'#fff', 
      boxShadow:'var(--brand-shadow-sm)' 
    },
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/home', label: 'Home' },
    { path: '/order-form', label: 'New Order' },
    { path: '/orders', label: 'My Orders' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/manager', label: 'Manager' },
    { path: '/forecast', label: 'Forecast' },
    { path: '/forecast-view', label: 'View Forecasts' },
    { path: '/admin/orders', label: 'Admin Orders' },
    { path: '/admin/discount-approvals', label: 'Approvals' },
    { path: '/admin/management', label: 'Data Management' },
    { path: '/admin/forecasts', label: 'All Forecasts' },
  ];

  return (
    <div className="nav-tabs" style={styles.tabs}>
      {navItems.map((item) => (
        <button
          key={item.path}
          style={{
            ...styles.tab,
            ...(isActive(item.path) ? styles.activeTab : {})
          }}
          onClick={() => navigate(item.path)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default NavBar;