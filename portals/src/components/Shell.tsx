'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'MO Dashboard', icon: '🏠' },
  { href: '/block-dashboard', label: 'Block Command', icon: '🏛️' },
  { href: '/anm-app', label: 'ANM Field App', icon: '👩‍⚕️' },
  { href: '/queue', label: 'OPD Queue', icon: '👥' },
  { href: '/teleconsult', label: 'Teleconsultation', icon: '📹' },
  { href: '/referrals', label: 'Referrals', icon: '🔄' },
];

export default function Shell({ children, title, subtitle, user = 'Dr. Anjali Patil', role = 'Medical Officer', facility = 'PHC Kondhwa (PHC-27201)', district = 'Block: Haveli | District: Pune' }: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  user?: string;
  role?: string;
  facility?: string;
  district?: string;
}) {
  const pathname = usePathname();
  const initials = user.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: '#0b1a2d',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '1rem 1.25rem', background: '#071221', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', background: '#10b981', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: 'white', flexShrink: 0 }}>SS</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', lineHeight: 1.2 }}>SwasthyaSetu</div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', letterSpacing: '0.05em' }}>HEALTH PORTAL</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            return (
              <a key={item.href} href={item.href} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 1.25rem',
                color: isActive ? 'white' : '#94a3b8',
                background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{facility}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.375rem' }}>
            <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.7rem', color: '#10b981' }}>All Systems Operational</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.25rem' }}>Last sync: 09:30 AM</div>
        </div>
      </aside>

      {/* ── MAIN WRAPPER ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── TOPBAR ── */}
        <header style={{
          height: '56px',
          background: '#0b1a2d',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{subtitle} | {district}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Online badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.7rem', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
              Online
            </div>

            {/* Date */}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>📅 25 May 2025</div>

            {/* Bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.125rem' }}>🔔</span>
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.55rem', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
            </div>

            <span style={{ fontSize: '1.125rem', cursor: 'pointer', color: '#94a3b8' }}>❓</span>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #0ea5e9, #10b981)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'white', flexShrink: 0 }}>{initials}</div>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{user}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
