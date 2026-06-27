import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import Layout from '../../components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flux/ui';
import type { OrganizerEventListItem, OrganizerEventListResponse } from '@flux/types';

type ApiError = { message: string; requestId?: string };

export async function readEnvelope<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    const error = json.error || {};
    throw { message: error.message || 'Request failed.', requestId: error.requestId || json.requestId } satisfies ApiError;
  }
  return json.data as T;
}

export function buildEventListQuery(params: {
  search: string;
  status: string;
  sort: string;
  direction: string;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams();
  if (params.search.trim()) query.set('search', params.search.trim());
  if (params.status) query.set('status', params.status);
  query.set('sort', params.sort);
  query.set('direction', params.direction);
  query.set('page', String(params.page));
  query.set('limit', String(params.limit));
  return query.toString();
}

function statusLabel(status: OrganizerEventListItem['status']) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    READY_FOR_VALIDATION: 'Ready',
    PUBLISHED: 'Published',
    SALES_OPEN: 'Sales open',
    LIVE: 'Live',
    FINISHED: 'Finished',
    ARCHIVED: 'Archived',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

function currency(value: number | null) {
  if (value === null) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function EventsListPage() {
  const [data, setData] = useState<OrganizerEventListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('updatedAt');
  const [direction, setDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const limit = 10;

  const query = useMemo(() => buildEventListQuery({ search, status, sort, direction, page, limit }), [search, status, sort, direction, page]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await readEnvelope<OrganizerEventListResponse>(await fetch(`/api/organizer/events?${query}`));
        setData(result);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query]);

  const hasFilters = !!search.trim() || !!status;
  const events = data?.items ?? [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-neutral-950">Events</h1>
            <p className="mt-2 text-sm text-neutral-500">View, search, and manage organizer events after creation.</p>
          </div>
          <Link href="/events/new" legacyBehavior>
            <Button>Create your first event</Button>
          </Link>
        </div>

        <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
          <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_170px_150px_120px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input aria-label="Search events" className="pl-9" placeholder="Search by event name" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
            </div>
            <select aria-label="Filter by status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="h-12 rounded-lg border border-neutral-300 px-3 text-sm">
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="READY_FOR_VALIDATION">Ready</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select aria-label="Sort events" value={sort} onChange={(e) => setSort(e.target.value)} className="h-12 rounded-lg border border-neutral-300 px-3 text-sm">
              <option value="updatedAt">Updated</option>
              <option value="startAt">Start date</option>
              <option value="name">Name</option>
            </select>
            <button type="button" onClick={() => setDirection((value) => value === 'asc' ? 'desc' : 'asc')} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-bold">
              <SlidersHorizontal className="h-4 w-4" /> {direction === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">{error.message}</p>
            {error.requestId && <p className="mt-1 text-xs">Request ID: {error.requestId}</p>}
          </div>
        )}

        <Card className="overflow-hidden rounded-lg border-[#EAEAEA] bg-white shadow-sm">
          <CardHeader className="border-b border-[#EAEAEA] px-6 py-5">
            <CardTitle>Organizer Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-sm text-neutral-500">Loading events...</div>
            ) : events.length === 0 && !hasFilters ? (
              <div className="p-16 text-center">
                <h2 className="text-lg font-bold text-neutral-900">No events yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">Create your first event to start setup, ticket configuration, and publishing preparation.</p>
                <Link href="/events/new" legacyBehavior><Button className="mt-6">Create your first event</Button></Link>
              </div>
            ) : events.length === 0 ? (
              <div className="p-12 text-center text-sm text-neutral-500">No events match the current search or filters.</div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {events.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} legacyBehavior>
                    <a className={`grid grid-cols-1 gap-4 p-5 no-underline transition-colors hover:bg-neutral-50 md:grid-cols-[72px_1fr_150px_150px] ${event.status === 'ARCHIVED' ? 'opacity-60' : ''}`}>
                      <div className="h-16 w-16 overflow-hidden rounded-lg bg-neutral-100">
                        {event.thumbnailUrl ? <img src={event.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#FF3200]/10" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-neutral-950">{event.name}</h2>
                          <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-600">{statusLabel(event.status)}</span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-500">{new Date(event.startAt).toLocaleString()} · {event.locationSummary}</p>
                        <p className="mt-1 text-xs text-neutral-400">{event.ticketSummary}</p>
                      </div>
                      <div className="text-sm">
                        <div className="font-bold text-neutral-900">{event.occupancyPct === null ? '-' : `${event.occupancyPct}%`}</div>
                        <div className="text-xs text-neutral-400">Occupancy</div>
                        <div className="mt-2 font-bold text-neutral-900">{currency(event.revenue)}</div>
                        <div className="text-xs text-neutral-400">Revenue</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#FF3200]">{event.nextAction}</div>
                        <div className="mt-1 text-xs text-neutral-400">Updated {new Date(event.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <span className="text-sm text-neutral-500">Page {data.page} of {data.totalPages}</span>
            <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
