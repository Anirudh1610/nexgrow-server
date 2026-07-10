import React, { useState } from 'react';
import { getAuth, updatePassword, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SERVER_API_URL } from './APIConfig';
import logo from '../assets/Logo.png';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const auth = getAuth();
    localStorage.removeItem('hasChangedPassword');
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      await updatePassword(user, newPassword);

      // Notify backend so must_change_password is cleared
      await axios.post(`${SERVER_API_URL}/orders/me/password-changed`, null, {
        params: { uid: user.uid, email: user.email },
      });

      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Change password error:', err);
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Could not verify your identity. Please log out and sign in again.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger one.');
      } else if (code === 'auth/requires-recent-login') {
        setError('Session expired. Please log out and sign in again.');
        navigate('/login', { replace: true });
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand-bg)',
    }}>
      <div style={{
        background: 'var(--brand-surface)',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        minWidth: '340px',
        maxWidth: '420px',
        width: '100%',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img src={logo} alt="NexGrow" style={{ width: 140, height: 'auto', objectFit: 'contain', marginBottom: '1rem' }} />
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-text)' }}>
            Set Your Password
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--brand-text-soft)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Welcome! For security, please set a personal password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-text)', marginBottom: '0.3rem' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                style={{
                  width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  border: '1px solid var(--input-border)', borderRadius: '8px',
                  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none',
                  background: 'var(--input-bg)', color: 'var(--brand-text)',
                }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--brand-text-soft)' }}>
                {showNew ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-text)', marginBottom: '0.3rem' }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                style={{
                  width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.9rem',
                  border: '1px solid var(--input-border)', borderRadius: '8px',
                  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none',
                  background: 'var(--input-bg)', color: 'var(--brand-text)',
                }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--brand-text-soft)' }}>
                {showConfirm ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Hints */}
          <div style={{
            background: 'var(--brand-surface-alt)', borderRadius: '8px', padding: '0.85rem 1rem',
            borderLeft: '3px solid var(--brand-green)',
          }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-green)' }}>
              Password requirements:
            </p>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', color: 'var(--brand-text)' }}>• At least 8 characters</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--brand-text)' }}>• Cannot be the same as your temporary password</p>
          </div>

          {error && (
            <p style={{ margin: 0, color: 'var(--color-error)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.85rem',
              background: loading ? 'var(--brand-green-light)' : 'var(--brand-green)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '1rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.25rem',
            }}
          >
            {loading ? 'Updating…' : 'Set Password & Continue'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%', padding: '0.75rem',
              background: 'none', color: 'var(--brand-text-soft)',
              border: '1px solid var(--input-border)', borderRadius: '8px',
              fontSize: '0.95rem', fontWeight: 500,
              cursor: 'pointer', marginTop: '0.6rem',
            }}
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
