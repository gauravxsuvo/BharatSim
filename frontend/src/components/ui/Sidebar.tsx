'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Map, LayoutDashboard, Zap, Bot, X, Menu } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Map', href: '/', icon: Map },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Simulation', href: '/simulation', icon: Zap },
  { label: 'AI Assistant', href: '/assistant', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-[200] hidden h-10 w-10 items-center justify-center border border-foreground bg-background text-foreground max-md:flex"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
      </button>
      <aside
        className={`fixed top-0 left-0 z-[100] flex h-screen w-[260px] flex-col justify-between border-r border-foreground bg-background px-4 py-6 transition-transform duration-300 ${
          isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
        <div>
          <div className="font-display text-2xl font-bold tracking-tight text-foreground">BharatSim</div>
          <div className="mb-8 mt-1 text-xs uppercase tracking-widest text-muted-foreground">Digital Twin of India</div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 ease-out active:scale-[0.98] ${
                    active ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-foreground animate-pulse" />
            <span>Live demo · self-contained</span>
          </div>
          <div className="opacity-70">BharatSim v0.1.0</div>
        </div>
      </aside>
    </>
  );
}
