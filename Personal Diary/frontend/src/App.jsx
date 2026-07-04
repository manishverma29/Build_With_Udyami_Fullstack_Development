import { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';

// ─── Auth State stored in localStorage ──────────────────────────────────────
// { id: string, username: string } | null

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login'); // 'login' | 'register' | 'dashboard'

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('diary_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setPage('dashboard');
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem('diary_user', JSON.stringify(userData));
    setUser(userData);
    setPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('diary_user');
    setUser(null);
    setPage('login');
  };

  if (page === 'dashboard' && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  if (page === 'register') {
    return (
      <Register
        onRegistered={() => setPage('login')}
        onGoLogin={() => setPage('login')}
      />
    );
  }

  return (
    <Login
      onLogin={handleLogin}
      onGoRegister={() => setPage('register')}
    />
  );
}

export default App;
