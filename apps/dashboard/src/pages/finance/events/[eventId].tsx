import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@flux/ui';
import type { FinancialEventDetail } from '@flux/types';
import { currency, financeExportUrl, readEnvelope, type ApiError } from '../../../lib/finance';

export default function FinanceEventDetailPage() {
  const router = useRouter();
  const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : '';
  const [detail, setDetail] = useState<FinancialEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const load = async () => {
      try {
        setLoading(true);
        setDetail(await readEnvelope<FinancialEventDetail>(await fetch(`/api/organizer/finance/events/${eventId}`)));
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-neutral-950">{detail?.eventName || 'Event financial detail'}</h1>
            <p className="mt-2 text-sm text-neutral-500">Estimated event revenue, ticket type, batch, and payment breakdown.</p>
          </div>
          {eventId && <a href={financeExportUrl(`exports/events/${eventId}.csv`)}><Button>Export event CSV</Button></a>}
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Estimated only. Real gateway and payouts are not connected.</div>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}{error.requestId && <div className="text-xs">Request ID: {error.requestId}</div>}</div>}
        {loading ? <div className="rounded-lg border bg-white p-10 text-center text-sm text-neutral-500">Loading event finance...</div> : detail && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card><CardContent className="p-5"><p className="text-xs text-neutral-500">Gross</p><p className="text-xl font-black">{currency(detail.grossRevenue)}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs text-neutral-500">Approved</p><p className="text-xl font-black">{currency(detail.approvedRevenue)}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs text-neutral-500">Estimated fees</p><p className="text-xl font-black">{currency(detail.estimatedFees)}</p></CardContent></Card>
              <Card><CardContent className="p-5"><p className="text-xs text-neutral-500">Estimated net</p><p className="text-xl font-black">{currency(detail.estimatedNetRevenue)}</p></CardContent></Card>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Ticket type revenue</CardTitle></CardHeader><CardContent className="p-0"><Table rows={detail.ticketTypeRevenue.map((row) => [row.ticketTypeName, row.ticketsSold, currency(row.approvedRevenue), currency(row.estimatedNetRevenue)])} headers={['Ticket type', 'Sold', 'Approved', 'Estimated net']} /></CardContent></Card>
              <Card><CardHeader><CardTitle>Batch revenue</CardTitle></CardHeader><CardContent className="p-0"><Table rows={detail.batchRevenue.map((row) => [row.batchName, row.ticketsSold, currency(row.approvedRevenue), currency(row.estimatedNetRevenue)])} headers={['Batch', 'Sold', 'Approved', 'Estimated net']} /></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle>Recent payments</CardTitle></CardHeader><CardContent className="p-0"><Table rows={detail.recentPayments.map((row) => [row.paymentId, row.status, row.provider, currency(row.amount), row.ticketIssued ? 'Yes' : 'No'])} headers={['Payment', 'Status', 'Provider', 'Amount', 'Ticket issued']} /></CardContent></Card>
          </>
        )}
      </div>
    </Layout>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  if (rows.length === 0) return <div className="p-8 text-center text-sm text-neutral-500">No data yet.</div>;
  return <table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100">{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody></table>;
}
