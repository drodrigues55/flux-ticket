import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@flux/ui';
import type { PaginatedFinancialPayments } from '@flux/types';
import { buildPaymentLedgerQuery, currency, readEnvelope, type ApiError } from '../../lib/finance';

export default function FinancePaymentsPage() {
  const [data, setData] = useState<PaginatedFinancialPayments | null>(null);
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('createdAt');
  const [direction, setDirection] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const limit = 20;
  const query = useMemo(() => buildPaymentLedgerQuery({ status, provider, page, limit, sort, direction }), [status, provider, page, sort, direction]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await readEnvelope<PaginatedFinancialPayments>(await fetch(`/api/organizer/finance/payments?${query}`)));
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-950">Payment ledger</h1>
          <p className="mt-2 text-sm text-neutral-500">Safe organizer payment audit view. Raw provider payloads are not exposed.</p>
        </div>
        <Card><CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="h-11 rounded-lg border px-3 text-sm"><option value="">All statuses</option><option>APPROVED</option><option>PENDING</option><option>REJECTED</option><option>EXPIRED</option><option>FAILED</option><option>CANCELLED</option></select>
          <input value={provider} onChange={(e) => { setPage(1); setProvider(e.target.value); }} placeholder="Provider" className="h-11 rounded-lg border px-3 text-sm" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-lg border px-3 text-sm"><option value="createdAt">Created</option><option value="updatedAt">Updated</option><option value="amount">Amount</option><option value="status">Status</option></select>
          <Button variant="secondary" onClick={() => setDirection((v) => v === 'asc' ? 'desc' : 'asc')}>{direction === 'asc' ? 'Ascending' : 'Descending'}</Button>
        </CardContent></Card>
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}{error.requestId && <div className="text-xs">Request ID: {error.requestId}</div>}</div>}
        <Card><CardHeader><CardTitle>Payments</CardTitle></CardHeader><CardContent className="p-0">
          {loading ? <div className="p-10 text-center text-sm text-neutral-500">Loading payments...</div> : !data || data.items.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">No payments match the current filters.</div> : (
            <table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="px-4 py-3">Payment</th><th>Status</th><th>Event</th><th>Provider</th><th>Amount</th><th>Ticket issued</th><th>Delivery</th></tr></thead><tbody className="divide-y divide-neutral-100">{data.items.map((payment) => <tr key={payment.paymentId}><td className="px-4 py-3 font-mono text-xs">{payment.paymentId}</td><td>{payment.status}</td><td>{payment.eventName}</td><td>{payment.provider}</td><td>{currency(payment.amount)}</td><td>{payment.ticketIssued ? 'Yes' : 'No'}</td><td>{payment.deliveryStatus}</td></tr>)}</tbody></table>
          )}
        </CardContent></Card>
        {data && <div className="flex items-center justify-end gap-3"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</Button><span className="text-sm text-neutral-500">Page {data.page} of {data.totalPages}</span><Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((v) => v + 1)}>Next</Button></div>}
      </div>
    </Layout>
  );
}
