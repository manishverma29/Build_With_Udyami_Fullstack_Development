import { useState } from 'react';

const API = 'http://localhost:5000/api';

function Register({ onRegistered, onGoLogin }) {
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.username.trim() || !form.password.trim() || !form.confirm.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
      } else {
        setSuccess('Account created! Redirecting to login…');
        setTimeout(() => onRegistered(), 1500);
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-floating-shapes">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✍️</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join and start your journaling journey</p>
        </div>

        {error   && <div className="alert alert-error"   role="alert">⚠️ {error}</div>}
        {success && <div className="alert alert-success" role="status">✅ {success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className="form-input"
              type="text"
              name="username"
              placeholder="Choose a username (min 3 chars)"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              className="form-input"
              type="password"
              name="password"
              placeholder="Create a password (min 4 chars)"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              className="form-input"
              type="password"
              name="confirm"
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '🔄 Creating account...' : '🚀 Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account?{' '}
          <a onClick={onGoLogin} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onGoLogin()}>
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default Register;
