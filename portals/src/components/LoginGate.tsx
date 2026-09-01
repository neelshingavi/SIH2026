'use client';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { login, getToken, getStoredUser, clearSession, ensureDemoUsers, API_BASE } from '@/lib/api';

// ── Context ──────────────────────────────────────────────────────────────────
interface AuthCtx {
  user: { username: string; role: string; facilityId: string } | null;
  token: string | null;
  logout: () => void;
}
const AuthContext = createContext<AuthCtx>({ user: null, token: null, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

// ── Demo user credentials for quick role switching ────────────────────────────
const DEMO_USERS = [
  { label: '🩺 Medical Officer (PHC)', username: 'mo_dharampur',   desc: 'PHC Triage & Teleconsult Hub' },
  { label: '🔬 Specialist / Expert',   username: 'specialist_dh',  desc: 'District Hospital Specialist' },
  { label: '👩‍⚕️ ASHA Worker',          username: 'asha_worker',    desc: 'Offline Mobile Field App' },
];

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('mo_dharampur');
  const [password, setPassword]  = useState('demo1234');
  const [loading, setLoading]    = useState(false);
  const [error, setError]        = useState('');
  const [seeding, setSeeding]    = useState(false);

  const handleLogin = async (u = username, p = password) => {
    setLoading(true); setError('');
    try {
      await login(u, p);
      onLogin();
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSeedAndLogin = async (u: string) => {
    setSeeding(true);
    await ensureDemoUsers();
    setSeeding(false);
    setUsername(u); setPassword('demo1234');
    await handleLogin(u, 'demo1234');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0b1a2d 0%, #0f2744 50%, #0b1a2d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏥</div>
          <h1 style={{ margin: 0, color: 'white', fontSize: '1.75rem', fontWeight: 800 }}>Setu Health Platform</h1>
          <div style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.875rem' }}>SIH 2026 · Rural Healthcare Access</div>
        </div>

        {/* Login Card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. mo_dharampur"
              style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '0.9375rem', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="demo1234"
              style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '0.9375rem', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1rem' }}>{error}</div>
          )}
          <button
            onClick={() => handleLogin()}
            disabled={loading || seeding}
            style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #0f766e, #0e9f6e)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}
          >
            {loading ? 'Signing in...' : seeding ? 'Creating demo users...' : 'Sign In'}
          </button>
        </div>

        {/* Quick-Login Demo Cards */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.75rem' }}>Quick Login — Demo Roles</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.625rem' }}>
            {DEMO_USERS.map(d => (
              <button
                key={d.username}
                onClick={() => handleSeedAndLogin(d.username)}
                disabled={loading || seeding}
                style={{ padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                <div style={{ fontWeight: 600 }}>{d.label}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{d.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ color: '#475569', fontSize: '0.7rem', textAlign: 'center', marginTop: '0.75rem' }}>All demo accounts use password: <code style={{ color: '#94a3b8' }}>demo1234</code></div>
        </div>
      </div>
    </div>
  );
}

// ── LoginGate HOC ─────────────────────────────────────────────────────────────
export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<any | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Hydrate from sessionStorage after mount (avoid SSR mismatch)
    const t = getToken();
    const u = getStoredUser();
    setToken(t); setUser(u); setReady(true);
  }, []);

  const handleLoggedIn = () => {
    setToken(getToken()); setUser(getStoredUser());
  };

  const logout = () => {
    clearSession(); setToken(null); setUser(null);
  };

  if (!ready) return null; // avoid flash

  if (!token) return <LoginScreen onLogin={handleLoggedIn} />;

  return (
    <AuthContext.Provider value={{ user, token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
