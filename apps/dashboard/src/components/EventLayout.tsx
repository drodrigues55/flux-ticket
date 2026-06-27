import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from './Layout';
import { ChevronRight } from 'lucide-react';

interface EventLayoutProps {
  children: React.ReactNode;
  eventId: string;
  eventName?: string;
}

export default function EventLayout({ children, eventId, eventName }: EventLayoutProps) {
  const router = useRouter();

  const tabs = eventId ? [
    { name: 'Overview', href: `/events/${eventId}` },
    { name: 'General', href: `/events/${eventId}/general` },
    { name: 'Tickets', href: `/events/${eventId}/tickets` },
    { name: 'Publishing', href: `/events/${eventId}/publishing` },
    { name: 'Advanced', href: `/events/${eventId}/advanced` },
  ] : [];

  const isActive = (href: string) => {
    if (href === `/events/${eventId}`) return router.asPath === href || router.asPath === `/events/${eventId}/overview`;
    return router.asPath === href;
  };

  return (
    <Layout>
      <div className="space-y-6 bg-[#FAFAFA] min-h-[calc(100vh-8rem)]">
        {/* Breadcrumb & Title */}
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-550 font-bold uppercase tracking-wider mb-2">
            <Link href="/events" className="hover:text-[#FF3200] transition-colors">Eventos</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-neutral-900">{eventName || 'Detalhes'}</span>
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">{eventName || 'Carregando...'}</h1>
        </div>

        {/* Horizontal Tabs */}
        {tabs.length > 0 && <div className="border-b border-[#EAEAEA]">
          <nav className="flex gap-6">
            {tabs.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link key={tab.name} href={tab.href} legacyBehavior>
                  <a
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-[#FF3200] text-[#FF3200]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
                    }`}
                  >
                    {tab.name}
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>}

        {/* Tab Content */}
        <div>
          {children}
        </div>
      </div>
    </Layout>
  );
}
