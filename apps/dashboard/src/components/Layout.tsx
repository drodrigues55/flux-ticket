import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  ScanLine,
  Users,
  Megaphone,
  Wallet,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Eventos', href: '/events', icon: CalendarDays },
  { name: 'Ingressos', href: '/tickets', icon: Ticket },
  { name: 'Check-in', href: '/checkin', icon: ScanLine },
  { name: 'Participantes', href: '/participants', icon: Users },
  { name: 'Marketing', href: '/marketing', icon: Megaphone },
  { name: 'Financeiro', href: '/financial', icon: Wallet },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === '/') return router.pathname === '/';
    return router.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flux-page flex flex-col">

      {/* ── Header Superior (fixo) ── */}
      <header className="sticky top-0 z-50 flux-surface border-b h-14 flex items-center justify-between px-6 shrink-0">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-7 h-7 rounded-md bg-[#FF3200] flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-extrabold text-[var(--text)] tracking-tight">
            Flux Tickets
          </span>
        </Link>

        {/* Search Global */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B5B5B5]" />
            <input
              type="text"
              placeholder="Buscar eventos, participantes..."
              className="w-full flux-input h-9 rounded-lg pl-9 pr-4 py-2 text-sm"
            />
          </div>
        </div>

        {/* Right side: Notifications + Profile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flux-theme-toggle"
            title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
            aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button className="relative p-2 rounded-lg hover:bg-[var(--surface-muted)] transition-colors border-none bg-transparent cursor-pointer">
            <Bell className="w-[18px] h-[18px] text-[var(--text-muted)]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF3200]" />
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-[var(--border)]">
            <div className="w-8 h-8 rounded-full bg-[#FF3200]/10 flex items-center justify-center text-[#FF3200] text-xs font-bold">
              DR
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-[var(--text)] block leading-none">Organizador</span>
              <span className="text-[10px] text-[var(--text-subtle)] block mt-0.5">Produtor</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-subtle)]" />
          </div>
        </div>
      </header>

      {/* ── Navegação Horizontal ── */}
      <nav className="sticky top-14 z-40 flux-surface border-b shrink-0">
        <div className="flex items-center gap-0.5 px-6 overflow-x-auto hide-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link key={item.name} href={item.href} legacyBehavior>
                <a
                  className={`flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-medium transition-all duration-150 border-b-2 whitespace-nowrap no-underline ${
                    active
                      ? 'border-[#FF3200] text-[#FF3200] font-semibold'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 px-6 py-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
