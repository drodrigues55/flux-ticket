import Layout from '../../components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@flux/ui';
import { financeExportUrl } from '../../lib/finance';

export default function FinanceExportsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-950">Financial exports</h1>
          <p className="mt-2 text-sm text-neutral-500">Basic CSV exports for manual reconciliation. Sensitive payment payloads are excluded.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Exports contain estimated fee and net values. Real gateway payout data is not available yet.</div>
        <Card className="rounded-lg border-[#EAEAEA] bg-white">
          <CardHeader><CardTitle>Available exports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div><p className="font-bold">Payment ledger CSV</p><p className="text-sm text-neutral-500">Payment status, provider, amount, estimated fees, net estimate, ticket issued flag.</p></div>
              <a href={financeExportUrl('exports/payments.csv')}><Button>Download CSV</Button></a>
            </div>
            <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500">Event-level CSV export is available from each event financial detail page.</div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
