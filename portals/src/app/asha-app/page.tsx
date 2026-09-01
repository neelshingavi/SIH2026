'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/LoginGate';
import { apiPost } from '@/lib/api';
import { savePatientLocally, getUnsyncedPatients, markPatientAsSynced } from '@/lib/db';

export default function AshaApp() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<'dashboard' | 'register'>('dashboard');

  const [form, setForm] = useState({
    abhaNumber: '',
    name: '',
    age: '',
    gender: 'Female',
    phone: '',
    address: ''
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (view === 'dashboard') {
      getUnsyncedPatients().then(patients => setPendingSync(patients.length));
    }
  }, [view]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const unsynced = await getUnsyncedPatients();
      for (const p of unsynced) {
        // Prepare payload for backend
        const payload = {
          abhaNumber: p.abhaNumber,
          fullName: p.fullName,
          gender: p.gender,
          dateOfBirth: new Date(new Date().setFullYear(new Date().getFullYear() - parseInt(p.dob))).toISOString(), // Approx DOB from age
          contactNumber: p.mobile,
          village: p.village,
          registeredBy: user?.username,
          facilityId: user?.facilityId
        };
        await apiPost('/patient/register', payload);
        if (p.id) await markPatientAsSynced(p.id);
      }
      setPendingSync(0);
      alert('Sync completed successfully!');
    } catch (err: any) {
      alert('Sync failed: ' + (err.message || 'Check connection'));
    }
    setSyncing(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      // Offline-first: Save locally
      await savePatientLocally({
        abhaNumber: form.abhaNumber,
        fullName: form.name,
        dob: form.age, // store age temporarily in dob field for local mapping
        gender: form.gender,
        mobile: form.phone,
        village: form.address,
      });

      setStatus('success');
      setForm({ abhaNumber: '', name: '', age: '', gender: 'Female', phone: '', address: '' });
      setTimeout(() => {
        setStatus('idle');
        setView('dashboard');
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg('Failed to save patient locally');
    }
  };

  const s = {
    container: { maxWidth: '480px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
    header: { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: 'white', padding: '1.25rem 1rem 2rem', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    userName: { fontWeight: 700, fontSize: '1.125rem' },
    roleBadge: { background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.625rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
    statsContainer: { display: 'flex', gap: '0.75rem', marginTop: '-1.5rem', padding: '0 1rem' },
    statCard: { flex: 1, background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' as const },
    statValue: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' },
    statLabel: { fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, marginTop: '0.25rem' },
    actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.5rem 1rem' },
    actionCard: { background: 'white', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid #f1f5f9' },
    actionIcon: { fontSize: '2rem', background: '#f0f9ff', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' },
    actionText: { fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' },
    formContainer: { padding: '1rem', marginTop: '1rem' },
    inputGroup: { marginBottom: '1rem' },
    label: { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' },
    input: { width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9375rem', boxSizing: 'border-box' as const, outline: 'none' },
    btn: { width: '100%', padding: '0.875rem', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' },
    backBtn: { background: 'transparent', border: 'none', color: '#0ea5e9', fontWeight: 600, padding: '0.5rem 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }
  };

  return (
    <div style={s.container}>
      {view === 'dashboard' ? (
        <>
          <div style={s.header}>
            <div style={s.topBar}>
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Welcome back,</div>
                <div style={s.userName}>{user?.username === 'asha_worker' ? 'Asha Tai' : user?.username}</div>
              </div>
              <div style={s.roleBadge}>ASHA Worker</div>
            </div>
            <button onClick={logout} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', padding: '0.375rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>Logout</button>
          </div>

          <div style={s.statsContainer}>
            <div style={s.statCard}>
              <div style={s.statValue}>142</div>
              <div style={s.statLabel}>Families Covered</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>8</div>
              <div style={s.statLabel}>Pending Visits</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>3</div>
              <div style={s.statLabel}>High Risk ANC</div>
            </div>
          </div>

          <div style={s.actionGrid}>
            <div style={s.actionCard} onClick={() => setView('register')}>
              <div style={s.actionIcon}>📝</div>
              <div style={s.actionText}>Register Patient</div>
            </div>
            <div style={{ ...s.actionCard, background: pendingSync > 0 ? '#eff6ff' : 'white', borderColor: pendingSync > 0 ? '#bfdbfe' : '#f1f5f9' }} onClick={handleSync}>
              <div style={{ ...s.actionIcon, background: pendingSync > 0 ? '#3b82f6' : '#f8fafc', color: pendingSync > 0 ? 'white' : '#cbd5e1' }}>
                {syncing ? '⌛' : '🔄'}
              </div>
              <div style={s.actionText}>
                {syncing ? 'Syncing...' : `Sync Data (${pendingSync})`}
              </div>
            </div>
            <div style={{ ...s.actionCard, opacity: 0.6 }}>
              <div style={{ ...s.actionIcon, background: '#fdf4ff', color: '#d946ef' }}>👶</div>
              <div style={s.actionText}>Child Immunization</div>
            </div>
            <div style={{ ...s.actionCard, opacity: 0.6 }}>
              <div style={{ ...s.actionIcon, background: '#ecfdf5', color: '#10b981' }}>💊</div>
              <div style={s.actionText}>NCD Screening</div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ padding: '1rem' }}>
          <button style={s.backBtn} onClick={() => setView('dashboard')}>
            ← Back to Dashboard
          </button>
          <h2 style={{ color: '#1e293b', marginTop: '1rem', marginBottom: '1.5rem' }}>Register New Patient</h2>

          {status === 'success' && (
            <div style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600 }}>
              ✅ Patient Registered Successfully!
            </div>
          )}

          {status === 'error' && (
            <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              ❌ {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={s.inputGroup}>
              <label style={s.label}>ABHA Number (Optional)</label>
              <input style={s.input} value={form.abhaNumber} onChange={e => setForm({...form, abhaNumber: e.target.value})} placeholder="14-digit ABHA" />
            </div>

            <div style={s.inputGroup}>
              <label style={s.label}>Full Name *</label>
              <input required style={s.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Patient's Full Name" />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Age *</label>
                <input required type="number" style={s.input} value={form.age} onChange={e => setForm({...form, age: e.target.value})} placeholder="Years" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Gender *</label>
                <select required style={s.input} value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={s.inputGroup}>
              <label style={s.label}>Phone Number *</label>
              <input required type="tel" pattern="[0-9]{10}" style={s.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="10-digit mobile number" />
            </div>

            <div style={s.inputGroup}>
              <label style={s.label}>Village / Address *</label>
              <textarea required style={{ ...s.input, minHeight: '80px', resize: 'vertical' }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="House details, village name..." />
            </div>

            <button type="submit" disabled={status === 'loading'} style={{ ...s.btn, opacity: status === 'loading' ? 0.7 : 1 }}>
              {status === 'loading' ? 'Saving...' : 'Register Patient'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
