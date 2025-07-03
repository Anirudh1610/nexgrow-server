import React, { useState, useEffect } from 'react';
import { signInWithGoogle, auth } from '../Auth/AuthConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const Landing = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#000000',
      margin: 0,
      padding: 0,
    },
    content: {
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
    },
    title: {
      fontSize: '3rem',
      fontWeight: 'regular',
      color: '#ffffff',
      margin: 0,
      fontFamily: 'Arial, sans-serif',
    },
    button: {
      padding: '12px 32px',
      fontSize: '1.2rem',
      fontWeight: 600,
      color: '#000000',
      backgroundColor: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: 'Arial, sans-serif',
    },
    userInfo: {
      color: '#ffffff',
      textAlign: 'center',
      fontSize: '1.1rem',
      marginBottom: '1rem',
    },
    userPhoto: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      marginBottom: '1rem',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>nexfarm</h1>
        
        {user ? (
          <div>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                style={styles.userPhoto}
              />
            )}
            <div style={styles.userInfo}>
              <p>Welcome, {user.displayName}!</p>
              <p>{user.email}</p>
            </div>
            <button 
              style={styles.button} 
              onClick={handleSignOut}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f0f0f0';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button 
            style={styles.button} 
            onClick={handleSignIn}
            disabled={loading}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#f0f0f0';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? 'Signing In...' : 'Sign In with Google'}
          </button>
        )}
      </div>
    </div>
  );
};

export default Landing;