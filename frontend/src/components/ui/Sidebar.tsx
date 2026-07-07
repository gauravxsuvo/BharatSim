'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Map', href: '/', icon: '\uD83D\uDDFA\uFE0F' },
  { label: 'Dashboard', href: '/dashboard', icon: '\uD83D\uDCCA' },
  { label: 'Simulation', href: '/simulation', icon: '\u26A1' },
  { label: 'AI Assistant', href: '/assistant', icon: '\uD83E\uDD16' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? '\u2715' : '\u2630'}
      </button>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div>
          <div className="sidebar-logo">BharatSim</div>
          <div className="sidebar-subtitle">Digital Twin of India</div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 6px var(--accent-primary)' }} />
            <span>Live demo · self-contained</span>
          </div>
          <div style={{ opacity: 0.7 }}>BharatSim v0.1.0</div>
        </div>
      </aside>
    </>
  );
}
