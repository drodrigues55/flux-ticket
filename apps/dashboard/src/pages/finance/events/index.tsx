import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@flux/ui';
import type { FinancialEventSummary } from '@flux/types';
import { currency, readEnvelope, type ApiError } from '../../../lib/finance';

export default function FinanceEventsPage() {
  const [items, setItems] = useState<FinancialEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setItems(await readEnvelope<FinancialEventSummary[]>(await fetch('/api/organizer/finance/events')));
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-950">Event financials</h1>
          <p className="mt-2 text-sm text-neutral-500">Estimated gross, fee, and net revenue by event.</p>
        </div>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}{error.requestId && <div className="text-xs">Request ID: {error.requestId}</div>}</div>}
        <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
          <CardHeader><CardTitle>Events</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? <div className="p-10 text-center text-sm text-neutral-500">Loading events...</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">No event revenue yet.</div> : (
              <div className="divide-y divide-neutral-100">
                {items.map((event) => (
                  <Link key={event.eventId} href={`/finance/events/${event.eventId}`} legacyBehavior>
                    <a className="grid grid-cols-1 gap-3 p-4 text-sm no-underline hover:bg-neutral-50 md:grid-cols-[1fr_130px_130px_130px_100px]">
                      <span><strong className="text-neutral-950">{event.eventName}</strong><span className="ml-2 text-neutral-500">{event.eventStatus}</span></span>
                      <span>{currency(event.grossRevenue)}<small className="block text-neutral-400">Gross</small></span>
                      <span>{currency(event.estimatedFees)}<small className="block text-neutral-400">Estimated fees</small></span>
                      <span>{currency(event.estimatedNetRevenue)}<small className="block text-neutral-400">Estimated net</small></span>
                      <span>{event.ticketsSold}<small className="block text-neutral-400">Sold</small></span>
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
