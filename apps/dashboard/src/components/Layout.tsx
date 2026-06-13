import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

  const navigation = [
    { 
      name: 'Visão Geral', 
      href: '/',
      icon: (
        <svg className="w-4 h-4 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      )
    },
    { 
      name: 'Meus Eventos', 
      href: '/events',
      icon: (
        <svg className="w-4 h-4 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-cosmic-dark text-white flex flex-col md:flex-row relative">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-cosmic-slate border-b md:border-b-0 md:border-r border-neutral-800/80 flex flex-col justify-between p-6 relative z-10 shrink-0">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-neutral-100 to-cosmic-neon bg-clip-text text-transparent">
              Flux Dashboard
            </h2>
            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mt-1">
              Organizer Panel
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              // Verifica se a rota atual corresponde ao link
              const isActive = router.pathname === item.href || (item.href !== '/' && router.pathname.startsWith(item.href));
              
              return (
                <Link key={item.name} href={item.href} legacyBehavior>
                  <a className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                    isActive 
                      ? 'bg-cosmic-neon/10 border-l-2 border-cosmic-neon text-cosmic-neon shadow-[0_0_15px_rgba(0,229,255,0.1)]' 
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40 border-l-2 border-transparent'
                  }`}>
                    {item.icon}
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 md:mt-0 pt-6 border-t border-neutral-800 flex items-center space-x-3 text-xs text-neutral-500">
          <div className="w-2.5 h-2.5 rounded-full bg-cosmic-neon animate-pulse" />
          <span>Serviço Conectado</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 relative z-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
