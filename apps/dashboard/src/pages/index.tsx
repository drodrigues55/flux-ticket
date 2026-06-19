import { useEffect, useState, useMemo, useCallback } from 'react';
import Layout from '../components/Layout';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  Ticket,
  TrendingUp,
  TrendingDown,
  Target,
  Plus,
  Layers,
  FileDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Power,
  SlidersHorizontal,
  ChevronDown,
  Activity,
  Users,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Zap,
  Bell,
  MapPin,
  Calendar,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import Link from 'next/link';
import type {
  DashboardHeroEvent,
  DashboardAttentionEvent,
  DashboardHealthyEvent,
  DashboardAlert,
} from '@flux/types';
import { getDashboardBundle } from '../services/dashboardService';
import type { DashboardOverview, DashboardServiceError } from '../types/dashboard';

dayjs.locale('pt-br');

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
];

type EventOption = {
  id: string;
  title: string;
  label: string;
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatBRLCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
};

const pctBadge = (change: number) => {
  const isPos = change >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
        isPos ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
      }`}
    >
      {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
};

const getSaleStatusBadge = (status: string) => {
  const base = 'px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1';
  switch (status) {
    case 'VALID':
      return <span className={`${base} bg-emerald-50 text-emerald-600 border border-emerald-100`}><CheckCircle2 className="w-3 h-3" />Aprovado</span>;
    case 'CONSUMED':
      return <span className={`${base} bg-blue-50 text-blue-600 border border-blue-100`}><Eye className="w-3 h-3" />Portaria</span>;
    case 'PENDING_VALIDATION':
      return <span className={`${base} bg-amber-50 text-amber-600 border border-amber-100`}><AlertTriangle className="w-3 h-3" />Pendente</span>;
    default:
      return <span className={`${base} bg-neutral-100 text-neutral-500 border border-neutral-200`}>{status}</span>;
  }
};

const alertSeverityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
    case 'WARNING':  return 'text-amber-600 bg-amber-50 border-amber-200';
    default:         return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const occupancyColor = (pct: number) => {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-400';
  return 'bg-emerald-500';
};

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function HeroEventCard({ hero }: { hero: DashboardHeroEvent }) {
  const dateStr = dayjs(hero.date).format('DD [de] MMMM [de] YYYY');
  const timeStr = dayjs(hero.date).format('HH:mm');

  return (
    <div className="relative bg-white border border-[#EAEAEA] rounded-2xl overflow-hidden shadow-sm">
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#FF3200]" />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-7">
        {/* Left: event image */}
        <div className="lg:col-span-3">
          <div className="relative rounded-xl overflow-hidden aspect-video w-full bg-[#F5F5F5]">
            {hero.imageUrl ? (
              <img src={hero.imageUrl} alt={hero.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-[#DCDCDC]" />
              </div>
            )}
            {/* Priority badge */}
            <div className="absolute top-2 left-2">
              <span className="flex items-center gap-1 bg-[#FF3200] text-white text-[10px] font-bold px-2 py-1 rounded-md shadow">
                <Zap className="w-3 h-3" />
                PRIORIDADE CRÍTICA
              </span>
            </div>
          </div>
        </div>

        {/* Center: event info & KPIs */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[#FF3200] uppercase tracking-wider mb-1">Evento em destaque</p>
            <h2 className="text-xl font-black text-[#111111] tracking-tight leading-tight">{hero.title}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-[12px] text-[#666666]">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{dateStr} às {timeStr}h</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{hero.venue}</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#111111]">{hero.daysRemaining}d restantes</span>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Faturamento', value: formatBRLCompact(hero.grossRevenue) },
              { label: 'Ingressos', value: hero.ticketsSold.toLocaleString('pt-BR') },
              { label: 'Ocupação', value: `${hero.occupancyPct}%` },
              {
                label: 'Tendência 7d',
                value: `${hero.salesTrend7d >= 0 ? '+' : ''}${hero.salesTrend7d.toFixed(1)}%`,
              },
            ].map((kpi, i) => (
              <div key={i} className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg p-3">
                <p className="text-[10px] font-medium text-[#8A8A8A] mb-0.5">{kpi.label}</p>
                <p className={`text-sm font-black font-mono ${
                  kpi.label === 'Tendência 7d'
                    ? hero.salesTrend7d >= 0 ? 'text-emerald-600' : 'text-red-500'
                    : 'text-[#111111]'
                }`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Occupancy bar */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-[#666666] mb-1.5">
              <span>Ocupação geral</span>
              <span className="font-bold text-[#111111]">{hero.ticketsSold}/{hero.totalCapacity} ingressos</span>
            </div>
            <div className="w-full bg-[#F0F0F0] rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${occupancyColor(hero.occupancyPct)}`}
                style={{ width: `${Math.min(100, hero.occupancyPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: alerts & payout */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {hero.nextPayout && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Próximo repasse</p>
              <p className="text-base font-black text-emerald-800 font-mono">{formatBRL(hero.nextPayout.amount)}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                {hero.nextPayout.scheduledDate
                  ? dayjs(hero.nextPayout.scheduledDate).format('DD/MM/YYYY')
                  : 'A confirmar'}
              </p>
            </div>
          )}

          {hero.activeAlerts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {hero.activeAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className={`border rounded-lg p-2.5 text-[11px] font-medium ${alertSeverityColor(alert.severity)}`}>
                  <div className="flex items-start gap-1.5">
                    <Bell className="w-3 h-3 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold leading-tight">{alert.message}</p>
                      {alert.suggestedAction && (
                        <p className="opacity-75 mt-0.5 leading-tight">{alert.suggestedAction}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-[11px] text-emerald-700 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Nenhum alerta ativo
            </div>
          )}

          <Link
            href={`/events/${hero.eventId}`}
            className="mt-auto flex items-center justify-center gap-2 bg-[#FF3200] hover:bg-[#E62D00] text-white text-sm font-bold py-2.5 rounded-xl transition-all no-underline"
          >
            Gerenciar evento
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function AttentionEventCard({ event }: { event: DashboardAttentionEvent }) {
  const dateStr = dayjs(event.date).format('DD/MM/YYYY');
  return (
    <div className="bg-white border border-amber-100 rounded-xl p-4 flex flex-col gap-3 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5F5F5] shrink-0 flex items-center justify-center">
          {event.imageUrl
            ? <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
            : <Calendar className="w-5 h-5 text-[#DCDCDC]" />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-[#111111] truncate">{event.title}</p>
          <p className="text-[11px] text-[#666666]">{dateStr} · {event.daysRemaining}d</p>
        </div>
        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
          Atenção
        </span>
      </div>

      <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-[11px] text-amber-700">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium leading-tight">{event.mainIssue}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-[#FAFAFA] rounded-lg p-2">
          <p className="text-[10px] text-[#8A8A8A]">Faturamento</p>
          <p className="text-[12px] font-bold text-[#111111] font-mono">{formatBRLCompact(event.grossRevenue)}</p>
        </div>
        <div className="bg-[#FAFAFA] rounded-lg p-2">
          <p className="text-[10px] text-[#8A8A8A]">Ocupação</p>
          <p className="text-[12px] font-bold text-[#111111]">{event.occupancyPct}%</p>
        </div>
      </div>

      <div className="w-full bg-[#F0F0F0] rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${occupancyColor(event.occupancyPct)}`}
          style={{ width: `${Math.min(100, event.occupancyPct)}%` }}
        />
      </div>
    </div>
  );
}

function HealthyEventCard({ event }: { event: DashboardHealthyEvent }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-[#EAEAEA] rounded-xl hover:bg-[#FAFAFA] transition-colors">
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#F5F5F5] shrink-0 flex items-center justify-center">
        {event.imageUrl
          ? <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          : <Calendar className="w-3.5 h-3.5 text-[#DCDCDC]" />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#111111] truncate">{event.title}</p>
        <p className="text-[11px] text-[#8A8A8A]">{dayjs(event.date).format('DD/MM/YYYY')}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-12 bg-[#F0F0F0] rounded-full h-1 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${Math.min(100, event.occupancyPct)}%` }}
          />
        </div>
        <span className="text-[11px] font-mono font-semibold text-[#666666] w-8">{event.occupancyPct}%</span>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">OK</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function DashboardPage() {
  // Filter state
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Data state
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<DashboardServiceError | null>(null);
  const [dashboardAlerts, setDashboardAlerts] = useState<DashboardAlert[]>([]);
  const [requestIds, setRequestIds] = useState<Record<string, string>>({});

  // Operational controls
  const [localThrottle, setLocalThrottle] = useState(500);
  const [globalPaused, setGlobalPaused] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // SSR safety
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Fetch dashboard data (polling every 10s) ─────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setDashboardError(null);
      const bundle = await getDashboardBundle();
      const nextData: DashboardOverview = {
        ...bundle.overview,
        heroEvent: bundle.priorityEvent ?? bundle.overview.heroEvent,
        batchPerformance: bundle.lotsPerformance.length > 0
          ? bundle.lotsPerformance
          : bundle.overview.batchPerformance,
      };
      setData(nextData);
      setDashboardAlerts(bundle.alerts);
      setRequestIds(bundle.requestIds);
      setEvents([
        { id: 'all', title: 'Todos os eventos', label: 'Todos os eventos' },
        ...bundle.eventsPriority.map((event) => ({
          id: event.eventId,
          title: event.title,
          label: event.title,
        })),
      ]);
      if (nextData.checkoutLimit !== undefined) setLocalThrottle(nextData.checkoutLimit);
      if (nextData.salesPaused !== undefined)   setGlobalPaused(nextData.salesPaused);
    } catch (error) {
      setDashboardError(error as DashboardServiceError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10_000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // ── Filtered sales history based on period ───────────────────────
  const filteredHistory = useMemo(() => {
    if (!data?.salesHistory) return [];
    const history = data.salesHistory;
    if (selectedPeriod === '7d') return history.slice(-7);
    if (selectedPeriod === 'today') {
      const last = history[history.length - 1];
      return last ? [last] : [];
    }
    return history; // 30d
  }, [data?.salesHistory, selectedPeriod]);

  // ── Operational handlers ─────────────────────────────────────────
  const handleUpdateThrottle = async (limit: number) => {
    try {
      setUpdatingSettings(true);
      await fetch('/api/settings/throttle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
    } catch { /* non-fatal */ } finally {
      setUpdatingSettings(false);
    }
  };

  const handleTogglePause = async () => {
    try {
      setUpdatingSettings(true);
      const target = !globalPaused;
      const res = await fetch('/api/settings/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: target }),
      });
      if (res.ok) setGlobalPaused(target);
    } catch { /* non-fatal */ } finally {
      setUpdatingSettings(false);
    }
  };

  // ── Recharts custom tooltip ──────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#EAEAEA] rounded-lg px-3.5 py-2.5 shadow-lg">
        <p className="text-[11px] font-semibold text-[#8A8A8A] mb-1">{label}</p>
        <p className="text-sm font-bold text-[#111111]">{formatBRLCompact(payload[0]?.value || 0)}</p>
        {payload[1] && (
          <p className="text-[11px] text-[#666666] mt-0.5">{payload[1].value || 0} ingressos</p>
        )}
      </div>
    );
  };

  const gkpi = data?.globalKpis;
  const totals = data?.totals;
  const activeCheckouts = data?.activeCheckoutLocks || 0;
  const isEmpty = !loading && !data?.heroEvent && !data?.attentionEvents?.length && !data?.healthyEvents?.length;

  // ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Filter Bar ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Event dropdown — real events from DB */}
          <div className="relative">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="appearance-none bg-white border border-[#EAEAEA] rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-[#2D2D2D] cursor-pointer focus:outline-none focus:border-[#FF3200] focus:ring-1 focus:ring-[#FF3200]/20 transition-all"
            >
              {events.length > 0
                ? events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))
                : <option value="all">Todos os eventos</option>
              }
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B5B5B5] pointer-events-none" />
          </div>

          {/* Period pills */}
          <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5 border border-[#EAEAEA]">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border-none cursor-pointer ${
                  selectedPeriod === opt.value
                    ? 'bg-white text-[#111111] shadow-sm font-semibold'
                    : 'bg-transparent text-[#666666] hover:text-[#2D2D2D]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FF3200]/5 border border-[#FF3200]/15 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3200] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#FF3200]">Ao vivo</span>
            </span>
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-4">
            <div className="h-48 rounded-2xl bg-[#F0F0F0] animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-[#F0F0F0] animate-pulse" />)}
            </div>
          </div>
        )}

        {!loading && dashboardError && (
          <div className="bg-white border border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#111111]">Falha ao carregar dados do painel</h3>
                <p className="text-sm text-[#666666] mt-1">{dashboardError.message}</p>
                {dashboardError.requestId && (
                  <p className="text-[11px] text-[#8A8A8A] mt-2 font-mono">requestId: {dashboardError.requestId}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state (all healthy, no events) ── */}
        {!loading && !dashboardError && isEmpty && (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-[#B5B5B5] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#111111] mb-2">Nenhum evento disponível no painel.</h3>
            <p className="text-sm text-[#8A8A8A] max-w-md mx-auto">
              Assim que houver eventos e vendas registrados no backend, os indicadores aparecerão aqui.
            </p>
            {requestIds.overview && (
              <p className="text-[11px] text-[#B5B5B5] mt-4 font-mono">requestId: {requestIds.overview}</p>
            )}
          </div>
        )}

        {!loading && !dashboardError && data && (
          <>
            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                SECTION 1 — HERO EVENT
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {data.heroEvent && (
              <section>
                <HeroEventCard hero={data.heroEvent} />
              </section>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                SECTION 2 — ATTENTION EVENTS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {data.attentionEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-[#111111]">Requer atenção</h3>
                  <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    {data.attentionEvents.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.attentionEvents.map(ev => (
                    <AttentionEventCard key={ev.eventId} event={ev} />
                  ))}
                </div>
              </section>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                SECTION 3 — HEALTHY EVENTS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {data.healthyEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-[#111111]">Eventos saudáveis</h3>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    {data.healthyEvents.length}
                  </span>
                </div>
                <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden divide-y divide-[#F5F5F5]">
                  {data.healthyEvents.map(ev => (
                    <HealthyEventCard key={ev.eventId} event={ev} />
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111111]">Alertas operacionais</h3>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5">Sinais calculados pelo backend de leitura</p>
                </div>
                <Bell className="w-4 h-4 text-[#B5B5B5]" />
              </div>
              <div className="p-5 space-y-3">
                {dashboardAlerts.length === 0 ? (
                  <div className="flex items-center gap-2 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Nenhum alerta operacional ativo.
                  </div>
                ) : dashboardAlerts.map((alert) => (
                  <div key={alert.id} className={`border rounded-lg p-3 text-[12px] ${alertSeverityColor(alert.severity)}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold leading-tight">{alert.message}</p>
                        {alert.suggestedAction && (
                          <p className="opacity-75 mt-1 leading-tight">{alert.suggestedAction}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {requestIds.alerts && (
                  <p className="text-[10px] text-[#B5B5B5] font-mono">requestId: {requestIds.alerts}</p>
                )}
              </div>
            </section>

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                SECTION 4 — GLOBAL KPIs
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            {gkpi && (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Faturamento bruto',
                    value: formatBRLCompact(totals?.grossRevenue ?? gkpi.grossRevenue),
                    change: null,
                    icon: DollarSign,
                  },
                  {
                    label: 'Ingressos vendidos',
                    value: (totals?.ticketsSold ?? gkpi.ticketsSold).toLocaleString('pt-BR'),
                    change: null,
                    icon: Ticket,
                  },
                  {
                    label: 'Check-ins realizados',
                    value: gkpi.checkIns.toLocaleString('pt-BR'),
                    change: null,
                    icon: CheckCircle2,
                  },
                  {
                    label: 'Ocupação média',
                    value: `${gkpi.avgOccupancyPct}%`,
                    change: null,
                    icon: Target,
                  },
                ].map((kpi, idx) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-[#EAEAEA] rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] group-hover:bg-[#FF3200]/5 flex items-center justify-center transition-colors">
                          <Icon className="w-[18px] h-[18px] text-[#8A8A8A] group-hover:text-[#FF3200] transition-colors" />
                        </div>
                        {kpi.change !== null && pctBadge(kpi.change)}
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-[#8A8A8A] block mb-1">{kpi.label}</span>
                        <span className="text-xl font-bold text-[#111111] tracking-tight font-mono block">{kpi.value}</span>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                SECTION 5 — BUSINESS ANALYTICS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

            {/* Sales History Chart */}
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-[#111111] tracking-tight">Evolução de vendas</h2>
                  <p className="text-[12px] text-[#8A8A8A] mt-0.5">
                    {selectedPeriod === 'today' ? 'Faturamento de hoje' : selectedPeriod === '7d' ? 'Últimos 7 dias (R$)' : 'Últimos 30 dias (R$)'}
                    {' '}· Dados reais do banco
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#8A8A8A]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF3200]/20 border border-[#FF3200]/40" />
                  Receita
                </span>
              </div>

              <div className="h-[240px] w-full">
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredHistory} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF3200" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#FF3200" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAEAEA" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#8A8A8A' }}
                        interval={selectedPeriod === '7d' ? 0 : 'preserveStartEnd'}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#8A8A8A' }}
                        domain={[0, 'auto']}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`
                        }
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#FF3200"
                        strokeWidth={2}
                        fill="url(#revenueGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#FF3200', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full bg-[#FAFAFA] animate-pulse rounded-lg flex items-center justify-center text-xs text-[#8A8A8A]">
                    Carregando gráfico...
                  </div>
                )}
              </div>
            </div>

            {/* Recent Sales + Batch Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Recent Sales (3/5 width) — from api-read dashboard overview */}
              <div className="lg:col-span-3 bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#111111]">Vendas recentes</h3>
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5">Últimas transações registradas</p>
                  </div>
                  <Activity className="w-4 h-4 text-[#B5B5B5]" />
                </div>
                <div className="divide-y divide-[#F5F5F5]">
                  {data.recentSales.length === 0 ? (
                    <p className="text-[12px] text-[#8A8A8A] text-center py-8">Nenhuma venda registrada ainda.</p>
                  ) : data.recentSales.map((sale) => (
                    <div key={sale.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[10px] font-bold text-[#666666] shrink-0">
                          {sale.buyerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-semibold text-[#111111] block truncate">
                            {sale.holderName || sale.buyerName}
                          </span>
                          <span className="text-[11px] text-[#8A8A8A] block truncate">
                            {sale.batchName} · {sale.eventTitle}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 pl-4">
                        {getSaleStatusBadge(sale.status)}
                        <span className="text-[11px] text-[#B5B5B5] font-medium w-10 text-right">
                          {isMounted ? dayjs(sale.createdAt).format('HH:mm') : '--:--'}
                        </span>
                        <span className="text-sm font-bold text-[#111111] font-mono w-24 text-right">
                          {formatBRL(sale.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Batch Performance (2/5 width) — real TicketBatch data */}
              <div className="lg:col-span-2 bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#111111]">Ingressos por lote</h3>
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5">Estoque vs. vendido</p>
                  </div>
                  <Layers className="w-4 h-4 text-[#B5B5B5]" />
                </div>
                <div className="p-5 space-y-4">
                  {data.batchPerformance.length === 0 ? (
                    <p className="text-[12px] text-[#8A8A8A] text-center py-4">Nenhum lote disponível.</p>
                  ) : data.batchPerformance.map((batch) => (
                    <div key={batch.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-[#2D2D2D] truncate mr-2">{batch.name}</span>
                        <span className="text-[11px] font-mono font-medium text-[#8A8A8A] shrink-0">
                          {batch.soldQuantity}/{batch.totalQuantity}
                        </span>
                      </div>
                      <div className="w-full bg-[#F5F5F5] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            batch.occupancyPct >= 80 ? 'bg-[#FF3200]' : 'bg-[#2D2D2D]'
                          }`}
                          style={{ width: `${Math.min(100, batch.occupancyPct)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#B5B5B5] font-medium">{batch.occupancyPct}% vendido</span>
                        <span className="text-[10px] font-mono text-[#8A8A8A]">{formatBRL(batch.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Criar evento', icon: Plus, href: '/events/new' },
                { label: 'Novo lote', icon: Layers, href: '/events' },
                { label: 'Relatórios', icon: BarChart3, href: '#' },
                {
                  label: 'Pausar vendas',
                  icon: Power,
                  href: '#',
                  onClick: handleTogglePause,
                  danger: globalPaused,
                },
              ].map((action, idx) => {
                const Icon = action.icon;
                const content = (
                  <div
                    key={idx}
                    onClick={action.onClick}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 cursor-pointer group ${
                      action.danger
                        ? 'bg-[#FF3200]/5 border-[#FF3200]/20 hover:bg-[#FF3200]/10'
                        : 'bg-white border-[#EAEAEA] hover:border-[#DCDCDC] hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      action.danger
                        ? 'bg-[#FF3200]/10 text-[#FF3200]'
                        : 'bg-[#F5F5F5] text-[#8A8A8A] group-hover:bg-[#FF3200]/5 group-hover:text-[#FF3200]'
                    }`}>
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                    <span className={`text-[13px] font-semibold ${action.danger ? 'text-[#FF3200]' : 'text-[#2D2D2D]'}`}>
                      {action.danger ? 'Vendas suspensas — retomar' : action.label}
                    </span>
                  </div>
                );
                if (action.href && action.href !== '#' && !action.onClick) {
                  return <Link key={idx} href={action.href} className="no-underline">{content}</Link>;
                }
                return <div key={idx}>{content}</div>;
              })}
            </div>

            {/* Operational Controls */}
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-[#FF3200]/30" />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FF3200]/5 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-[18px] h-[18px] text-[#FF3200]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#111111]">Controles de operação</h3>
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                      Limite de checkout simultâneo e bloqueio emergencial de vendas.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-lg px-4 py-2.5 border border-[#EAEAEA]">
                    <SlidersHorizontal className="w-4 h-4 text-[#8A8A8A] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#666666] whitespace-nowrap font-mono">
                      {localThrottle} checkouts
                    </span>
                    <input
                      type="range" min="10" max="1000" step="10"
                      value={localThrottle}
                      onChange={(e) => setLocalThrottle(parseInt(e.target.value, 10))}
                      onMouseUp={() => handleUpdateThrottle(localThrottle)}
                      onTouchEnd={() => handleUpdateThrottle(localThrottle)}
                      className="w-24 h-1 bg-[#DCDCDC] rounded-lg appearance-none cursor-pointer accent-[#FF3200]"
                    />
                  </div>
                  <button
                    onClick={handleTogglePause}
                    disabled={updatingSettings}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer border ${
                      globalPaused
                        ? 'bg-[#FF3200] border-[#FF3200] text-white animate-pulse'
                        : 'bg-white border-[#EAEAEA] text-[#666666] hover:border-[#FF3200] hover:text-[#FF3200]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {globalPaused ? 'Vendas suspensas' : 'Pausar vendas'}
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F5F5F5] flex items-center gap-6 text-[11px]">
                <span className="flex items-center gap-1.5 text-[#8A8A8A]">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-medium">Checkouts ativos:</span>
                  <span className="font-bold text-[#111111] font-mono">{activeCheckouts}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[#8A8A8A]">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium">Atualizado:</span>
                  <span className="font-mono text-[#666666]">
                    {isMounted ? dayjs().format('HH:mm:ss') : '--:--:--'}
                  </span>
                </span>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center text-[11px] text-[#B5B5B5] pb-4">
          <span>© {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.</span>
          <span className="font-mono">v3.0.0 (Data-Driven)</span>
        </div>

      </div>
    </Layout>
  );
}
