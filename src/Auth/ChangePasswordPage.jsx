import React, { useState } from 'react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PASSWORD = 'Nexfarm2026';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    if (newPassword === DEFAULT_PASSWORD) {
      setError('Your new password cannot be the same as the default password.');
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

      // Re-authenticate with default password before changing
      const credential = EmailAuthProvider.credential(user.email, DEFAULT_PASSWORD);
      await reauthenticateWithCredential(user, credential);

      // Update password in Firebase
      await updatePassword(user, newPassword);

      // Mark as changed in localStorage
      localStorage.setItem('hasChangedPassword', 'true');

      // Go to home
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
      background: '#f5f6fa',
    }}>
      <div style={{
        background: '#fff',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        minWidth: '340px',
        maxWidth: '420px',
        width: '100%',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#e8f5e9',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '0.75rem', fontSize: '2rem',
          }}>🔒</div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1b1b1b' }}>
            Set Your Password
          </h2>
          <p style={{ margin: '0.5rem 0 0', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Welcome! For security, please set a personal password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
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
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                {showNew ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
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
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Hints */}
          <div style={{
            background: '#f0faf3', borderRadius: '8px', padding: '0.85rem 1rem',
            borderLeft: '3px solid #16a34a',
          }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>
              Password requirements:
            </p>
            <p style={{ margin: '0 0 0.2rem', fontSize: '0.8rem', color: '#374151' }}>• At least 8 characters</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#374151' }}>• Cannot be the default password (Nexfarm2026)</p>
          </div>

          {error && (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.85rem',
              background: loading ? '#86efac' : '#16a34a',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '1rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.25rem',
            }}
          >
            {loading ? 'Updating…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
