import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import EventLayout from '../../components/EventLayout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flux/ui';
import type { OrganizerEventDetail, OrganizerEventGeneral, OrganizerEventOverview } from '@flux/types';

type Tab = 'overview' | 'general' | 'tickets' | 'publishing' | 'advanced';
type ApiError = { message: string; requestId?: string };

export async function readPortalEnvelope<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    const error = json.error || {};
    throw { message: error.message || 'Request failed.', requestId: error.requestId || json.requestId } satisfies ApiError;
  }
  return json.data as T;
}

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function generalPayload(form: any) {
  return {
    name: form.name,
    slug: form.slug,
    shortDescription: form.shortDescription || undefined,
    description: form.description || undefined,
    categoryId: form.categoryId ? Number(form.categoryId) : undefined,
    startAt: toIso(form.startAt),
    endAt: toIso(form.endAt),
    timezone: form.timezone,
    locationType: form.locationType,
    venueName: form.venueName || undefined,
    addressLine1: form.addressLine1 || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    onlineUrl: form.onlineUrl || undefined,
    bannerImageUrl: form.bannerImageUrl || undefined,
    capacityTarget: form.capacityTarget ? Number(form.capacityTarget) : undefined,
  };
}

function makeForm(event: OrganizerEventGeneral | null) {
  return {
    name: event?.name || '',
    slug: event?.slug || '',
    shortDescription: event?.shortDescription || '',
    description: event?.description || '',
    categoryId: event?.categoryId ? String(event.categoryId) : '',
    startAt: toLocalInput(event?.startAt),
    endAt: toLocalInput(event?.endAt),
    timezone: event?.timezone || 'America/Cuiaba',
    locationType: event?.locationType || 'PHYSICAL',
    venueName: event?.venueName || '',
    addressLine1: event?.addressLine1 || '',
    city: event?.city || '',
    state: event?.state || '',
    onlineUrl: event?.onlineUrl || '',
    bannerImageUrl: event?.bannerImageUrl || '',
    capacityTarget: event?.capacityTarget ? String(event.capacityTarget) : '',
  };
}

export default function EventPortal({ tab }: { tab: Tab }) {
  const router = useRouter();
  const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : '';
  const [detail, setDetail] = useState<OrganizerEventDetail | null>(null);
  const [overview, setOverview] = useState<OrganizerEventOverview | null>(null);
  const [form, setForm] = useState(makeForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'archive' | 'delete'>(null);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailData, overviewData] = await Promise.all([
        readPortalEnvelope<OrganizerEventDetail>(await fetch(`/api/organizer/events/${eventId}`)),
        readPortalEnvelope<OrganizerEventOverview>(await fetch(`/api/organizer/events/${eventId}/overview`)),
      ]);
      setDetail(detailData);
      setOverview(overviewData);
      setForm(makeForm(detailData.event));
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [eventId]);

  const saveGeneral = async () => {
    setSaving(true);
    setError(null);
    try {
      await readPortalEnvelope(await fetch(`/api/organizer/events/${eventId}/general`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalPayload(form)),
      }));
      await load();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    setSaving(true);
    setError(null);
    try {
      await readPortalEnvelope(await fetch(`/api/organizer/events/${eventId}/archive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }));
      setConfirmAction(null);
      await load();
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    setSaving(true);
    setError(null);
    try {
      const event = await readPortalEnvelope<any>(await fetch(`/api/organizer/events/${eventId}/duplicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }));
      setDuplicateMessage('Draft duplicated successfully.');
      await router.push(`/events/${event.id}/general`);
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    setSaving(true);
    setError(null);
    try {
      await readPortalEnvelope(await fetch(`/api/organizer/events/${eventId}`, { method: 'DELETE' }));
      await router.push('/events');
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EventLayout eventId={eventId} eventName="Loading..."><div className="p-8 text-sm text-neutral-500">Loading event...</div></EventLayout>;
  }

  if (!detail || !overview) {
    return <EventLayout eventId={eventId} eventName="Event"><ErrorBox error={error || { message: 'Event not found.' }} /></EventLayout>;
  }

  return (
    <EventLayout eventId={eventId} eventName={detail.event.name}>
      <div className="space-y-5">
        {error && <ErrorBox error={error} />}
        {duplicateMessage && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{duplicateMessage}</div>}
        {tab === 'overview' && <OverviewTab overview={overview} />}
        {tab === 'general' && <GeneralTab form={form} setForm={setForm} save={saveGeneral} saving={saving} />}
        {tab === 'tickets' && <TicketsTab overview={overview} />}
        {tab === 'publishing' && <PublishingTab overview={overview} />}
        {tab === 'advanced' && (
          <AdvancedTab
            detail={detail}
            saving={saving}
            duplicate={duplicate}
            requestArchive={() => setConfirmAction('archive')}
            requestDelete={() => setConfirmAction('delete')}
          />
        )}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-neutral-950">{confirmAction === 'archive' ? 'Archive event?' : 'Delete event?'}</h2>
              <p className="mt-2 text-sm text-neutral-500">
                {confirmAction === 'archive'
                  ? 'This will de-emphasize the event and move it into the archive state.'
                  : 'Only safe draft events can be deleted. This action cannot delete published events.'}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={saving}>Cancel</Button>
                <Button onClick={confirmAction === 'archive' ? archive : deleteEvent} disabled={saving}>{confirmAction === 'archive' ? 'Archive' : 'Delete'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </EventLayout>
  );
}

function ErrorBox({ error }: { error: ApiError }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-semibold">{error.message}</p>
      {error.requestId && <p className="mt-1 text-xs">Request ID: {error.requestId}</p>}
    </div>
  );
}

function OverviewTab({ overview }: { overview: OrganizerEventOverview }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="rounded-lg bg-white lg:col-span-2"><CardHeader><CardTitle>Event summary</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        <p><strong>Status:</strong> {overview.event.status}</p>
        <p><strong>Date:</strong> {new Date(overview.event.startAt).toLocaleString()}</p>
        <p><strong>Location:</strong> {overview.event.venueName || overview.event.addressLine1 || overview.event.onlineUrl || 'Pending'}</p>
        <p><strong>Description:</strong> {overview.event.shortDescription || overview.event.description || 'No description yet.'}</p>
      </CardContent></Card>
      <Card className="rounded-lg bg-white"><CardHeader><CardTitle>Tickets</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        <p><strong>Types:</strong> {overview.ticketSummary.ticketTypeCount}</p>
        <p><strong>Capacity:</strong> {overview.ticketSummary.totalCapacity}</p>
        <p><strong>Sold:</strong> {overview.ticketSummary.totalSold}</p>
        <p><strong>Occupancy:</strong> {overview.ticketSummary.occupancyPct === null ? '-' : `${overview.ticketSummary.occupancyPct}%`}</p>
      </CardContent></Card>
      <MessageList title="Current blockers" messages={overview.blockers} empty="No blockers." tone="red" />
      <MessageList title="Current warnings" messages={overview.warnings} empty="No warnings." tone="amber" />
    </div>
  );
}

function GeneralTab({ form, setForm, save, saving }: { form: any; setForm: (value: any) => void; save: () => void; saving: boolean }) {
  const set = (field: string, value: string) => setForm({ ...form, [field]: value });
  return (
    <Card className="rounded-lg bg-white"><CardHeader><CardTitle>General information</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Slug"><Input value={form.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
        <Field label="Start"><Input type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} /></Field>
        <Field label="End"><Input type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} /></Field>
        <Field label="Timezone"><Input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
        <Field label="Location type"><select className="h-12 w-full rounded-lg border border-neutral-300 px-3 text-sm" value={form.locationType} onChange={(e) => set('locationType', e.target.value)}><option value="PHYSICAL">Physical</option><option value="ONLINE">Online</option><option value="HYBRID">Hybrid</option></select></Field>
        <Field label="Venue"><Input value={form.venueName} onChange={(e) => set('venueName', e.target.value)} /></Field>
        <Field label="Address"><Input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} /></Field>
        <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
        <Field label="State"><Input value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
        <Field label="Online URL"><Input value={form.onlineUrl} onChange={(e) => set('onlineUrl', e.target.value)} /></Field>
        <Field label="Banner URL"><Input value={form.bannerImageUrl} onChange={(e) => set('bannerImageUrl', e.target.value)} /></Field>
      </div>
      <Field label="Short description"><Input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} /></Field>
      <Field label="Full description"><textarea className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save general information'}</Button>
    </CardContent></Card>
  );
}

function TicketsTab({ overview }: { overview: OrganizerEventOverview }) {
  const router = useRouter();
  const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : '';
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [basePrice, setBasePrice] = useState('50');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTypes = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
      const data = await response.json();
      if (!response.ok) {
        throw data.error || { message: 'Failed to load ticket types.' };
      }
      setTicketTypes(data.data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, [eventId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          quantity: Number(quantity),
          basePrice: Number(basePrice),
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw data.error || { message: 'Failed to create ticket type.' };
      }
      setShowCreate(false);
      setName('');
      setQuantity('100');
      setBasePrice('50');
      setDescription('');
      await fetchTypes();
    } catch (err: any) {
      setError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw data.error || { message: 'Failed to duplicate ticket type.' };
      }
      await fetchTypes();
    } catch (err: any) {
      setError(err);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this ticket type?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/ticket-types/${id}/archive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw data.error || { message: 'Failed to archive ticket type.' };
      }
      await fetchTypes();
    } catch (err: any) {
      setError(err);
    }
  };

  if (loading) return <div className="p-8 text-sm text-neutral-500">Loading ticket workspace...</div>;

  return (
    <div className="space-y-6">
      {error && <ErrorBox error={error} />}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Ingressos</h2>
          <p className="text-sm text-neutral-500">Gerencie os tipos de ingresso e as regras de vendas do seu evento.</p>
        </div>
        <Button className="bg-[#FF3200] hover:bg-[#E62D00] text-white" onClick={() => setShowCreate(true)}>
          Criar Tipo de Ingresso
        </Button>
      </div>

      {ticketTypes.length === 0 ? (
        <Card className="rounded-lg bg-white"><CardContent className="p-12 text-center text-neutral-500 space-y-4">
          <p>Nenhum tipo de ingresso configurado para este evento.</p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>Criar Primeiro Tipo</Button>
        </CardContent></Card>
      ) : (
        <Card className="rounded-lg bg-white overflow-hidden">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="border-b border-[#EAEAEA] text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Capacidade / Vendidos / Bloqueados</th>
                <th className="px-6 py-3">Preço Base</th>
                <th className="px-6 py-3">Regras</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA] font-medium text-sm text-neutral-700">
              {ticketTypes.map((type) => {
                const isArchived = type.status === 'ARCHIVED';
                return (
                  <tr key={type.id} className={`hover:bg-neutral-50/50 transition-colors ${isArchived ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900">{type.name}</div>
                      {type.description && <div className="text-xs text-neutral-500 font-normal">{type.description}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase border ${
                        type.status === 'ACTIVE' ? 'bg-green-50 border-green-200 text-green-600' :
                        type.status === 'HIDDEN' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                        'bg-neutral-100 border-neutral-300 text-neutral-500'
                      }`}>
                        {type.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {type.capacity} total / {type.soldQuantity} vendidos / {type.lockedQuantity} bloqueados
                    </td>
                    <td className="px-6 py-4 text-[#FF3200] font-bold font-mono">
                      {(type.basePrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{type.refundable ? 'Reembolsável' : 'Não Reembolsável'}</div>
                      <div>{type.transferable ? 'Transferível' : 'Não Transferível'}</div>
                      <div className="text-neutral-500">Limite de compra: {type.purchaseLimit}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/events/${eventId}/tickets/${type.id}/information`)}>Gerenciar</Button>
                        {!isArchived && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleDuplicate(type.id)}>Duplicar</Button>
                            <Button size="sm" variant="outline" onClick={() => handleArchive(type.id)}>Arquivar</Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-950">Novo Tipo de Ingresso</h2>
            <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
            <Field label="Capacidade"><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required /></Field>
            <Field label="Preço Base (R$)"><Input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required /></Field>
            <Field label="Descrição"><textarea className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancelar</Button>
              <Button type="submit" disabled={creating}>{creating ? 'Criando...' : 'Criar'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PublishingTab({ overview }: { overview: OrganizerEventOverview }) {
  return <Card className="rounded-lg bg-white"><CardHeader><CardTitle>Publishing</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Status: {overview.event.status}</p><p>Full publishing validation workflow is scheduled for Phase 7.</p></CardContent></Card>;
}

function AdvancedTab({ detail, saving, duplicate, requestArchive, requestDelete }: { detail: OrganizerEventDetail; saving: boolean; duplicate: () => void; requestArchive: () => void; requestDelete: () => void }) {
  return <Card className="rounded-lg bg-white"><CardHeader><CardTitle>Advanced</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3"><Button onClick={requestArchive} disabled={saving || !detail.canArchive}>Archive event</Button><Button variant="secondary" onClick={duplicate} disabled={saving || !detail.canDuplicate}>Duplicate event</Button><Button variant="outline" onClick={requestDelete} disabled={saving || !detail.canDelete}>Delete safe draft</Button></CardContent></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-bold text-neutral-600">{label}</span>{children}</label>;
}

function MessageList({ title, messages, empty, tone }: { title: string; messages: string[]; empty: string; tone: 'red' | 'amber' }) {
  const classes = tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  return <Card className={`rounded-lg ${classes}`}><CardContent className="p-4"><h3 className="text-sm font-bold">{title}</h3>{messages.length ? <ul className="mt-2 list-inside list-disc text-sm">{messages.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm">{empty}</p>}</CardContent></Card>;
}
