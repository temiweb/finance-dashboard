import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Lock, AlertCircle } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email.trim(), password);
    if (!result.success) {
      setError(result.error || 'Sign in failed');
    }
    setLoading(false);
  };

  const fieldStyle = {
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
    textAlign: 'left', marginBottom: '0.85rem',
  };
  const labelStyle = { fontSize: '0.8rem', opacity: 0.7 };
  const inputStyle = {
    padding: '0.6rem 0.75rem', borderRadius: '8px',
    border: '1px solid var(--border)', background: 'var(--card)',
    color: 'var(--text)', fontSize: '0.95rem',
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-icon">
          <Lock size={28} />
        </div>
        <h1>Finance Dashboard</h1>
        <p className="login-subtitle">Sign in to continue</p>

        <label style={fieldStyle}>
          <span style={labelStyle}>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            disabled={loading}
            required
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            disabled={loading}
            required
            style={inputStyle}
          />
        </label>

        {error && (
          <div className="pin-error" style={{ marginBottom: '0.85rem' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !email || !password}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
