'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

import { LayoutDashboard, Video, UserCircle, Bell, HelpCircle } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'PHC Triage Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/teleconsult', label: 'Specialist Teleconsult', icon: <Video size={20} /> },
  { href: '/asha-app', label: 'ASHA Mobile App', icon: <UserCircle size={20} /> },
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* ── GOVT HEADER ── */}
      <div style={{ 
        height: '44px', 
        background: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 1.5rem', 
        borderBottom: '3px solid', 
        borderImage: 'linear-gradient(to right, #ea580c 33%, #ffffff 33%, #ffffff 66%, #15803d 66%) 1',
        flexShrink: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Seal_of_Maharashtra.svg/100px-Seal_of_Maharashtra.svg.png" style={{ height: '28px' }} alt="Government of Maharashtra Seal" />
          <span className="serif-heading" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
            सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन | Department of Public Health, Government of Maharashtra
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
          <div style={{ width: '32px', height: '32px', background: '#ea580c', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: 'white', flexShrink: 0 }}>RP</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'white', lineHeight: 1.2 }}>RuralPulse</div>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '0.05em' }}>GOVT. HEALTH PORTAL</div>
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
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>{item.icon}</span>
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
            <div className="serif-heading" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{subtitle} | {district}</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Online badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.7rem', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
              Online
            </div>

            {/* Date */}
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              📅 {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>

            {/* Bell */}
            <div style={{ position: 'relative', cursor: 'pointer', color: '#cbd5e1' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ea580c', color: 'white', fontSize: '0.55rem', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>3</span>
            </div>

            <div style={{ cursor: 'pointer', color: '#cbd5e1' }}>
              <HelpCircle size={20} />
            </div>

            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingLeft: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ width: '32px', height: '32px', background: '#1e40af', border: '1px solid #3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'white', flexShrink: 0 }}>{initials}</div>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white', lineHeight: 1.2 }}>{user}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            {children}
          </div>
          
          {/* Main Content Footer */}
          <footer style={{ padding: '0.75rem 1.5rem', background: 'white', borderTop: '1px solid var(--border-color)', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>Aligned with ABDM, eSanjeevani, and NHM standards</div>
            <div>© 2026 Department of Public Health, Government of Maharashtra</div>
          </footer>
        </main>
      </div>
      </div>
    </div>
  );
}
