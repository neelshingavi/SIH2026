/**
 * Shared API client for Setu Portals.
 * Handles JWT login, token storage, and authenticated fetch for all dashboards.
 */

export const API_BASE = 'http://localhost:3001';

// ── Token storage (sessionStorage so it clears on tab close) ────────────────
const TOKEN_KEY = 'setu_access_token';
const USER_KEY  = 'setu_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<{ access_token: string; facilityId: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Invalid credentials');
  }
  const data = await res.json();
  sessionStorage.setItem(TOKEN_KEY, data.access_token);
  // Decode JWT payload (base64) to get user info
  try {
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    sessionStorage.setItem(USER_KEY, JSON.stringify({ username: payload.username, role: payload.role, facilityId: payload.facilityId }));
  } catch { /* non-critical */ }
  return data;
}

// ── Authenticated fetch ───────────────────────────────────────────────────────
export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    // Signal caller that re-login is needed
    throw Object.assign(new Error('Unauthorized — please log in again'), { status: 401 });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export const apiGet  = (path: string) => apiFetch(path, { method: 'GET' });
export const apiPost = (path: string, body?: unknown) =>
  apiFetch(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPatch = (path: string, body?: unknown) =>
  apiFetch(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });

// ── Seed helper — call once to boot demo users ───────────────────────────────
export async function ensureDemoUsers() {
  try {
    await fetch(`${API_BASE}/users/seed`, { method: 'POST' });
  } catch { /* silent — server may not be ready yet */ }
}
