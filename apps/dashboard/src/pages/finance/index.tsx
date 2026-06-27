import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileDown, Wallet } from 'lucide-react';
import Layout from '../../components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@flux/ui';
import type { FinancialOverview } from '@flux/types';
import { currency, readEnvelope, type ApiError } from '../../lib/finance';

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-neutral-950">{value}</p>
        {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
      </CardContent>
    </Card>
  );
}

export default function FinanceOverviewPage() {
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setData(await readEnvelope<FinancialOverview>(await fetch('/api/organizer/finance/overview')));
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-neutral-950">Financial Center</h1>
            <p className="mt-2 text-sm text-neutral-500">Estimated revenue visibility from Flux Tickets payment records.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/finance/payments" legacyBehavior><Button variant="secondary">Payment ledger</Button></Link>
            <Link href="/finance/exports" legacyBehavior><Button><FileDown className="mr-2 h-4 w-4" />Exports</Button></Link>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Estimated values only. Mock provider is active, real gateway is not connected, and payouts are not available yet.</p></div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">{error.message}</p>
            {error.requestId && <p className="mt-1 text-xs">Request ID: {error.requestId}</p>}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-[#EAEAEA] bg-white p-12 text-center text-sm text-neutral-500">Loading financial overview...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Metric label="Gross revenue" value={currency(data.grossRevenue)} />
              <Metric label="Estimated fees" value={currency(data.estimatedFees)} note={`${data.feeEstimate.percentage}% + ${currency(data.feeEstimate.fixedFee)} fixed`} />
              <Metric label="Estimated net revenue" value={currency(data.estimatedNetRevenue)} note="Not an actual payout" />
              <Metric label="Approved payments" value={currency(data.approvedPaymentsTotal)} />
              <Metric label="Pending payments" value={currency(data.pendingPaymentsTotal)} />
              <Metric label="Failed / expired" value={currency(data.failedExpiredPaymentsTotal)} />
              <Metric label="Tickets sold" value={String(data.ticketsSold)} />
              <Metric label="Events with revenue" value={String(data.eventsWithRevenue)} />
              <Metric label="Provider mode" value="Mock provider" />
            </div>

            <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
              <CardHeader><CardTitle>Latest payment activity</CardTitle></CardHeader>
              <CardContent className="p-0">
                {data.latestPaymentActivity.length === 0 ? (
                  <div className="p-10 text-center text-sm text-neutral-500">No payments yet.</div>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {data.latestPaymentActivity.map((payment) => (
                      <Link key={payment.paymentId} href={`/finance/events/${payment.eventId}`} legacyBehavior>
                        <a className="grid grid-cols-1 gap-2 p-4 text-sm no-underline hover:bg-neutral-50 md:grid-cols-[1fr_140px_120px]">
                          <span className="font-semibold text-neutral-900">{payment.eventName}<span className="ml-2 font-normal text-neutral-500">{payment.paymentId}</span></span>
                          <span className="text-neutral-600">{payment.status}</span>
                          <span className="font-bold text-neutral-950">{currency(payment.amount)}</span>
                        </a>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="rounded-lg border border-[#EAEAEA] bg-white p-12 text-center text-sm text-neutral-500"><Wallet className="mx-auto mb-3 h-8 w-8 text-neutral-300" />No financial data available.</div>
        )}
      </div>
    </Layout>
  );
}
