import React, { useState, useEffect } from 'react';
import { signInWithGoogle, auth } from '../Auth/AuthConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        try { localStorage.setItem('nexgrow_uid', currentUser.uid); } catch {}
        navigate('/home', { replace: true });
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSignIn = async () => {
    setLoading(true);
    try { await signInWithGoogle(); } finally { setLoading(false); }
  };

  return (
    <div className="app-shell" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--brand-gradient)'}}>
      <div className="surface-card elevated" style={{padding:'2.25rem 2.5rem',borderRadius:'18px',textAlign:'center',minWidth:'300px'}}>
        <h1 style={{margin:'0 0 1.5rem',fontSize:'1.75rem',letterSpacing:'.5px',color:'var(--brand-text)'}}>NEXGROW</h1>
        <button className="btn" disabled={loading} onClick={handleSignIn} style={{width:'100%'}}>
          {loading ? 'Signing In…' : 'Sign In with Google'}
        </button>
      </div>
    </div>
  );
};

export default Landing;