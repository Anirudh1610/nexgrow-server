import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../Auth/AuthConfig';

const HomePage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState('admin'); // 'admin' or 'salesman'

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#000',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: '2rem',
    },
    button: {
      padding: '16px 40px',
      fontSize: '1.2rem',
      fontWeight: '600',
      color: '#fff',
      backgroundColor: '#000',
      border: '2px solid #fff',
      borderRadius: '10px',
      cursor: 'pointer',
      margin: '1rem',
      transition: 'all 0.3s',
    },
  };

  return (
    <>
      <div
        style={{
          fontWeight: 'bold',
          fontSize: '2rem',
          color: '#fff',
          backgroundColor: '#000',
          textAlign: 'center',
          marginBottom: '2rem',
          marginTop: '0',
          cursor: 'pointer',
          letterSpacing: '2px',
          padding: '1.2rem 0 1.2rem 0',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate('/home')}>
          NEXGROW
        </span>
        <div style={{ position: 'absolute', right: 140, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
          <button
            style={{
              background: view === 'admin' ? '#fff' : '#eee',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => setView('admin')}
          >
            Admin View
          </button>
          <button
            style={{
              background: view === 'salesman' ? '#fff' : '#eee',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => setView('salesman')}
          >
            Salesman View
          </button>
        </div>
        <button
          style={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onClick={async () => {
            await signOut(auth);
            navigate('/');
          }}
        >
          Sign Out
        </button>
      </div>
      <div style={{ ...styles.container, paddingTop: '5rem' }}>
        <div style={styles.title}>Welcome to Nexfarm</div>
        {view === 'admin' ? (
          <>
            <button
              style={styles.button}
              onClick={() => navigate('/admin/discount-approvals')}
              onMouseOver={e => { e.target.style.backgroundColor = '#333'; }}
              onMouseOut={e => { e.target.style.backgroundColor = '#000'; }}
            >
              Approve Discounts
            </button>
            <button
              style={styles.button}
              onClick={() => navigate('/admin/orders')}
              onMouseOver={e => { e.target.style.backgroundColor = '#333'; }}
              onMouseOut={e => { e.target.style.backgroundColor = '#000'; }}
            >
              View All Orders
            </button>
            <button
              style={styles.button}
              onClick={() => navigate('/admin/management')}
              onMouseOver={e => { e.target.style.backgroundColor = '#333'; }}
              onMouseOut={e => { e.target.style.backgroundColor = '#000'; }}
            >
              Manage Data
            </button>
          </>
        ) : (
          <>
            <button
              style={styles.button}
              onClick={() => navigate('/order-form')}
              onMouseOver={e => { e.target.style.backgroundColor = '#333'; }}
              onMouseOut={e => { e.target.style.backgroundColor = '#000'; }}
            >
              Order Form
            </button>
            <button
              style={styles.button}
              onClick={() => navigate('/orders')}
              onMouseOver={e => { e.target.style.backgroundColor = '#333'; }}
              onMouseOut={e => { e.target.style.backgroundColor = '#000'; }}
            >
              View Orders
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default HomePage;

