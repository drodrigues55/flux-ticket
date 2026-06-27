import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Save, Ticket } from 'lucide-react';
import Layout from '../../components/Layout';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@flux/ui';
import type { EventCreationReview, EventLocationType } from '@flux/types';

type BasicForm = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  locationType: EventLocationType;
  venueName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  onlineUrl: string;
  bannerImageUrl: string;
  capacityTarget: string;
};

type TicketForm = {
  ticketTypeId?: string;
  name: string;
  description: string;
  quantity: string;
  basePrice: string;
  salesStart: string;
  salesEnd: string;
};

type ApiEnvelope<T> = { data: T; meta: { requestId: string } };
type ApiError = { message: string; requestId?: string };

const steps = ['Basic Information', 'Tickets', 'Review', 'Publish Entry Point'];

const emptyBasic: BasicForm = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  startAt: '',
  endAt: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Cuiaba',
  locationType: 'PHYSICAL',
  venueName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'BR',
  onlineUrl: '',
  bannerImageUrl: '',
  capacityTarget: '',
};

const emptyTicket: TicketForm = {
  name: '',
  description: '',
  quantity: '',
  basePrice: '',
  salesStart: '',
  salesEnd: '',
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const json = await response.json();
  if (!response.ok) {
    const error = json.error || {};
    throw {
      message: error.message || json.message || 'Request failed.',
      requestId: error.requestId || json.requestId,
    } satisfies ApiError;
  }
  return json;
}

export default function CreateEventPage() {
  const router = useRouter();
  const eventId = typeof router.query.eventId === 'string' ? router.query.eventId : undefined;
  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState<BasicForm>(emptyBasic);
  const [ticket, setTicket] = useState<TicketForm>(emptyTicket);
  const [review, setReview] = useState<EventCreationReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [dirty, setDirty] = useState(false);

  const canShowAddress = basic.locationType === 'PHYSICAL' || basic.locationType === 'HYBRID';
  const canShowOnline = basic.locationType === 'ONLINE' || basic.locationType === 'HYBRID';

  const basicErrors = useMemo(() => {
    const errors: string[] = [];
    if (!basic.name.trim()) errors.push('Event name is required.');
    if (!basic.slug.trim()) errors.push('Slug is required.');
    if (!basic.startAt) errors.push('Start date/time is required.');
    if (!basic.timezone.trim()) errors.push('Timezone is required.');
    if (!basic.locationType) errors.push('Location type is required.');
    if (basic.endAt && new Date(basic.endAt) <= new Date(basic.startAt)) errors.push('End date/time must be after start date/time.');
    return errors;
  }, [basic]);

  const ticketErrors = useMemo(() => {
    const errors: string[] = [];
    const quantity = Number(ticket.quantity);
    const price = Number(ticket.basePrice);
    if (!ticket.name.trim()) errors.push('Ticket type name is required.');
    if (!Number.isFinite(quantity) || quantity <= 0) errors.push('Ticket quantity must be greater than zero.');
    if (!Number.isFinite(price) || price < 0) errors.push('Ticket price must be zero or greater.');
    if (ticket.salesStart && basic.startAt && new Date(ticket.salesStart) > new Date(basic.startAt)) errors.push('Sales start cannot be after event start.');
    if (ticket.salesStart && ticket.salesEnd && new Date(ticket.salesEnd) <= new Date(ticket.salesStart)) errors.push('Sales end must be after sales start.');
    if (ticket.salesEnd && basic.endAt && new Date(ticket.salesEnd) > new Date(basic.endAt)) errors.push('Sales end cannot be after event end.');
    return errors;
  }, [basic.startAt, basic.endAt, ticket]);

  useEffect(() => {
    if (!eventId) return;
    const loadDraft = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/organizer/events/${eventId}/edit`);
        const envelope = await readEnvelope<any>(response);
        const draft = envelope.data;
        setBasic({
          name: draft.event.name || '',
          slug: draft.event.slug || '',
          shortDescription: draft.event.shortDescription || '',
          description: draft.event.description || '',
          categoryId: draft.event.categoryId ? String(draft.event.categoryId) : '',
          startAt: toLocalInput(draft.event.startAt),
          endAt: toLocalInput(draft.event.endAt),
          timezone: draft.event.timezone || emptyBasic.timezone,
          locationType: draft.event.locationType || 'PHYSICAL',
          venueName: draft.event.venueName || '',
          addressLine1: draft.event.addressLine1 || '',
          addressLine2: draft.event.addressLine2 || '',
          city: draft.event.city || '',
          state: draft.event.state || '',
          postalCode: draft.event.postalCode || '',
          country: draft.event.country || 'BR',
          onlineUrl: draft.event.onlineUrl || '',
          bannerImageUrl: draft.event.bannerImageUrl || '',
          capacityTarget: draft.event.capacityTarget ? String(draft.event.capacityTarget) : '',
        });
        if (draft.ticketType) {
          setTicket({
            ticketTypeId: draft.ticketType.id,
            name: draft.ticketType.name || '',
            description: draft.ticketType.description || '',
            quantity: String(draft.ticketType.quantity || ''),
            basePrice: String(draft.ticketType.basePrice ?? ''),
            salesStart: toLocalInput(draft.ticketType.salesStart),
            salesEnd: toLocalInput(draft.ticketType.salesEnd),
          });
        }
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadDraft();
  }, [eventId]);

  const updateBasic = (field: keyof BasicForm, value: string) => {
    setDirty(true);
    setBasic((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && (!prev.slug || prev.slug === slugify(prev.name))) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const eventPayload = () => ({
    name: basic.name,
    slug: basic.slug,
    shortDescription: basic.shortDescription || undefined,
    description: basic.description || undefined,
    categoryId: basic.categoryId ? Number(basic.categoryId) : undefined,
    startAt: toIso(basic.startAt),
    endAt: toIso(basic.endAt),
    timezone: basic.timezone,
    locationType: basic.locationType,
    venueName: basic.venueName || undefined,
    addressLine1: basic.addressLine1 || undefined,
    addressLine2: basic.addressLine2 || undefined,
    city: basic.city || undefined,
    state: basic.state || undefined,
    postalCode: basic.postalCode || undefined,
    country: basic.country || undefined,
    onlineUrl: basic.onlineUrl || undefined,
    bannerImageUrl: basic.bannerImageUrl || undefined,
    capacityTarget: basic.capacityTarget ? Number(basic.capacityTarget) : undefined,
  });

  const saveDraft = async () => {
    setError(null);
    if (basicErrors.length > 0) {
      setError({ message: basicErrors[0] });
      return undefined;
    }
    setLoading(true);
    try {
      const response = await fetch(eventId ? `/api/organizer/events/${eventId}` : '/api/organizer/events', {
        method: eventId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload()),
      });
      const envelope = await readEnvelope<any>(response);
      const savedId = envelope.data.id;
      if (!eventId) {
        await router.replace({ pathname: '/events/new', query: { eventId: savedId } }, undefined, { shallow: true });
      }
      setDirty(false);
      return savedId as string;
    } catch (err: any) {
      setError(err);
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  const saveTicket = async () => {
    setError(null);
    const savedEventId = eventId || (await saveDraft());
    if (!savedEventId) return false;
    if (ticketErrors.length > 0) {
      setError({ message: ticketErrors[0] });
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(
        ticket.ticketTypeId
          ? `/api/organizer/events/${savedEventId}/ticket-types/${ticket.ticketTypeId}`
          : `/api/organizer/events/${savedEventId}/ticket-types`,
        {
          method: ticket.ticketTypeId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ticket.name,
            description: ticket.description || undefined,
            quantity: Number(ticket.quantity),
            basePrice: Number(ticket.basePrice),
            salesStart: toIso(ticket.salesStart),
            salesEnd: toIso(ticket.salesEnd),
          }),
        }
      );
      const envelope = await readEnvelope<any>(response);
      setTicket((prev) => ({ ...prev, ticketTypeId: envelope.data.ticketType.id }));
      setDirty(false);
      return true;
    } catch (err: any) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadReview = async () => {
    const savedEventId = eventId || (await saveDraft());
    if (!savedEventId) return false;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizer/events/${savedEventId}/review`);
      const envelope = await readEnvelope<EventCreationReview>(response);
      setReview(envelope.data);
      return true;
    } catch (err: any) {
      setError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const markReady = async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/mark-ready`, { method: 'POST' });
      await readEnvelope(response);
      await loadReview();
      setStep(3);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    if (step === 0) {
      const saved = await saveDraft();
      if (saved) setStep(1);
    } else if (step === 1) {
      const saved = await saveTicket();
      if (saved && await loadReview()) setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-neutral-950">Create Event</h1>
            <p className="mt-2 text-sm text-neutral-500">Draft the event, add one ticket setup, review it, then mark it ready for publishing validation.</p>
          </div>
          {dirty && <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Unsaved changes</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index <= step && setStep(index)}
              className={`h-12 rounded-lg border px-3 text-left text-xs font-bold transition-colors ${
                index === step ? 'border-[#FF3200] bg-[#FF3200]/10 text-[#FF3200]' : 'border-neutral-200 bg-white text-neutral-500'
              }`}
            >
              <span className="mr-2">{index + 1}.</span>{label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">{error.message}</p>
                {error.requestId && <p className="mt-1 text-xs text-red-500">Request ID: {error.requestId}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 0 && (
          <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EAEAEA] px-6 py-5">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Event name" required><Input value={basic.name} onChange={(e) => updateBasic('name', e.target.value)} /></Field>
                <Field label="Slug" required><Input value={basic.slug} onChange={(e) => updateBasic('slug', slugify(e.target.value))} /></Field>
              </div>
              <Field label="Short description"><Input value={basic.shortDescription} onChange={(e) => updateBasic('shortDescription', e.target.value)} /></Field>
              <Field label="Full description"><textarea rows={4} value={basic.description} onChange={(e) => updateBasic('description', e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10" /></Field>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Category ID"><Input value={basic.categoryId} onChange={(e) => updateBasic('categoryId', e.target.value)} inputMode="numeric" /></Field>
                <Field label="Start date/time" required><Input type="datetime-local" value={basic.startAt} onChange={(e) => updateBasic('startAt', e.target.value)} /></Field>
                <Field label="End date/time"><Input type="datetime-local" value={basic.endAt} onChange={(e) => updateBasic('endAt', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Timezone" required><Input value={basic.timezone} onChange={(e) => updateBasic('timezone', e.target.value)} /></Field>
                <Field label="Location type" required>
                  <select value={basic.locationType} onChange={(e) => updateBasic('locationType', e.target.value)} className="h-12 w-full rounded-lg border border-neutral-300 px-4 text-sm outline-none focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10">
                    <option value="PHYSICAL">Physical</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </Field>
                <Field label="Capacity target"><Input value={basic.capacityTarget} onChange={(e) => updateBasic('capacityTarget', e.target.value)} inputMode="numeric" /></Field>
              </div>
              {canShowAddress && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Venue name"><Input value={basic.venueName} onChange={(e) => updateBasic('venueName', e.target.value)} /></Field>
                  <Field label="Address line 1"><Input value={basic.addressLine1} onChange={(e) => updateBasic('addressLine1', e.target.value)} /></Field>
                  <Field label="Address line 2"><Input value={basic.addressLine2} onChange={(e) => updateBasic('addressLine2', e.target.value)} /></Field>
                  <Field label="City"><Input value={basic.city} onChange={(e) => updateBasic('city', e.target.value)} /></Field>
                  <Field label="State"><Input value={basic.state} onChange={(e) => updateBasic('state', e.target.value)} /></Field>
                  <Field label="Postal code"><Input value={basic.postalCode} onChange={(e) => updateBasic('postalCode', e.target.value)} /></Field>
                </div>
              )}
              {canShowOnline && <Field label="Online URL placeholder"><Input value={basic.onlineUrl} onChange={(e) => updateBasic('onlineUrl', e.target.value)} /></Field>}
              <Field label="Banner image placeholder"><Input value={basic.bannerImageUrl} onChange={(e) => updateBasic('bannerImageUrl', e.target.value)} /></Field>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EAEAEA] px-6 py-5">
              <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-[#FF3200]" /> Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Ticket type name" required><Input value={ticket.name} onChange={(e) => { setDirty(true); setTicket((prev) => ({ ...prev, name: e.target.value })); }} /></Field>
                <Field label="Quantity/capacity" required><Input value={ticket.quantity} onChange={(e) => { setDirty(true); setTicket((prev) => ({ ...prev, quantity: e.target.value })); }} inputMode="numeric" /></Field>
              </div>
              <Field label="Description"><Input value={ticket.description} onChange={(e) => { setDirty(true); setTicket((prev) => ({ ...prev, description: e.target.value })); }} /></Field>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Field label="Base price" required><Input value={ticket.basePrice} onChange={(e) => { setDirty(true); setTicket((prev) => ({ ...prev, basePrice: e.target.value })); }} inputMode="decimal" /></Field>
                <Field label="Sales start"><Input type="datetime-local" value={ticket.salesStart} onChange={(e) => { setDirty(true); setTicket((prev) => ({ ...prev, salesStart: e.target.value })); }} /></Field>
                <Field label="Sales end"><Input type="datetime-local" value={ticket.salesEnd} onChange={(e) => { setDirty(true); setTicket((prev) => ({ ...prev, salesEnd: e.target.value })); }} /></Field>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EAEAEA] px-6 py-5">
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {!review ? (
                <Button type="button" onClick={loadReview} disabled={loading}>Load review</Button>
              ) : (
                <>
                  <Summary title="Basic event info" items={[
                    ['Name', review.event.name],
                    ['Slug', review.event.slug || '-'],
                    ['Status', review.event.status],
                    ['Category', review.event.categoryId ? String(review.event.categoryId) : 'Recommended'],
                  ]} />
                  <Summary title="Date/time" items={[
                    ['Start', new Date(review.event.startAt).toLocaleString()],
                    ['End', review.event.endAt ? new Date(review.event.endAt).toLocaleString() : '-'],
                    ['Timezone', review.event.timezone || '-'],
                  ]} />
                  <Summary title="Location" items={[
                    ['Type', review.event.locationType],
                    ['Venue', review.event.venueName || '-'],
                    ['Online URL', review.event.onlineUrl || '-'],
                  ]} />
                  <Summary title="Ticket summary" items={[
                    ['Name', review.ticketType?.name || '-'],
                    ['Quantity', review.ticketType ? String(review.ticketType.quantity) : '-'],
                    ['Price', review.ticketType ? `R$ ${review.ticketType.basePrice.toFixed(2)}` : '-'],
                  ]} />
                  <MessageList title="Required blockers" messages={review.blockers} empty="No required blockers." tone="red" />
                  <MessageList title="Missing recommended fields" messages={review.warnings} empty="No recommended-field warnings." tone="amber" />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="rounded-lg border-[#EAEAEA] bg-white shadow-sm">
            <CardContent className="space-y-5 p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#FF3200]" />
              <h2 className="text-xl font-bold text-neutral-950">Ready for publishing validation</h2>
              <p className="mx-auto max-w-xl text-sm text-neutral-500">This draft can be handed to the future Phase 7 publishing validation workflow. Publishing validation and public launch are intentionally not implemented in Phase 3.</p>
              <Button type="button" disabled className="mx-auto">Validate and Publish - Phase 7</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="secondary" disabled={loading || step === 0} onClick={() => setStep((prev) => Math.max(0, prev - 1))}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" disabled={loading} onClick={step === 1 ? saveTicket : saveDraft}>
              <Save className="mr-2 h-4 w-4" /> {loading ? 'Saving...' : 'Save draft'}
            </Button>
            {step === 2 && (
              <Button type="button" disabled={loading || !!review?.blockers.length} onClick={markReady}>Mark ready</Button>
            )}
            {step < 3 && (
              <Button type="button" disabled={loading} onClick={next}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-neutral-600">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

function Summary({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-neutral-950">{title}</h3>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase text-neutral-400">{label}</div>
            <div className="mt-1 text-sm font-medium text-neutral-800">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MessageList({ title, messages, empty, tone }: { title: string; messages: string[]; empty: string; tone: 'red' | 'amber' }) {
  const classes = tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <section className={`rounded-lg border p-4 ${classes}`}>
      <h3 className="text-sm font-bold">{title}</h3>
      {messages.length === 0 ? (
        <p className="mt-2 text-sm">{empty}</p>
      ) : (
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
          {messages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}
    </section>
  );
}
