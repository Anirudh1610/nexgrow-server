import React, { useState, useEffect } from 'react';
import { signInWithGoogle, signInWithEmail, auth } from '../Auth/AuthConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/Logo.png';

const Landing = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try { await signInWithGoogle(); } catch { setError('Google sign in failed.'); } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--brand-bg)'}}>
      <div style={{background:'var(--brand-surface)',padding:'2.5rem 2.5rem',borderRadius:'16px',boxShadow:'0 4px 24px rgba(0,0,0,0.10)',minWidth:'340px',maxWidth:'400px',width:'100%'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <img src={logo} alt="NexGrow" style={{width:180,height:'auto',objectFit:'contain',marginBottom:'0.5rem'}} />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmailLogin} style={{display:'flex',flexDirection:'column',gap:'0.9rem'}}>
          <div>
            <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,color:'var(--brand-text)',marginBottom:'0.3rem'}}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              style={{width:'100%',padding:'0.7rem 0.9rem',border:'1px solid var(--input-border)',borderRadius:'8px',fontSize:'0.95rem',boxSizing:'border-box',outline:'none',background:'var(--input-bg)',color:'var(--brand-text)'}}
            />
          </div>
          <div>
            <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,color:'var(--brand-text)',marginBottom:'0.3rem'}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{width:'100%',padding:'0.7rem 0.9rem',border:'1px solid var(--input-border)',borderRadius:'8px',fontSize:'0.95rem',boxSizing:'border-box',outline:'none',background:'var(--input-bg)',color:'var(--brand-text)'}}
            />
          </div>

          {error && (
            <p style={{margin:0,color:'var(--color-error)',fontSize:'0.85rem',textAlign:'center'}}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{width:'100%',padding:'0.8rem',background: loading ? 'var(--brand-green-light)' : 'var(--brand-green)',color:'#fff',border:'none',borderRadius:'8px',fontSize:'1rem',fontWeight:600,cursor: loading ? 'not-allowed' : 'pointer',marginTop:'0.25rem'}}
          >
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',margin:'1.25rem 0'}}>
          <div style={{flex:1,height:'1px',background:'var(--brand-border)'}} />
          <span style={{color:'var(--color-placeholder)',fontSize:'0.8rem'}}>or</span>
          <div style={{flex:1,height:'1px',background:'var(--brand-border)'}} />
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{width:'100%',padding:'0.75rem',background:'var(--brand-surface)',color:'var(--brand-text)',border:'1px solid var(--input-border)',borderRadius:'8px',fontSize:'0.95rem',fontWeight:500,cursor: loading ? 'not-allowed' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.6rem'}}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.1 33.1 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l6-6C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3 0 5.8 1.1 7.9 3l6-6C34.5 6.5 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/><path fill="#FBBC05" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.6 35.4 27 36 24 36c-5.5 0-10.1-3.7-11.7-8.8l-6.9 5.3C8.9 39.9 16 44 24 44z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-.8 2.2-2.3 4.1-4.2 5.3l6.5 5.3C41.7 35.9 44.5 30.4 44.5 24c0-1.3-.1-2.7-.2-4z"/></svg>
          Sign in with Google
        </button>

      </div>
    </div>
  );
};

export default Landing;
