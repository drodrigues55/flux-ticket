import { useEffect, useState, useMemo } from 'react';
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
  Target,
  Plus,
  Layers,
  PauseCircle,
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
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import Link from 'next/link';

dayjs.locale('pt-br');

/* ─────────────────────────────────────────────
   MOCK DATA (hardcoded — substituir por API antes do deploy)
   ───────────────────────────────────────────── */

const MOCK_EVENTS = [
  { id: '1', title: 'Mega Show Arena', location: 'São Paulo, SP' },
  { id: '2', title: 'Festival Vibes', location: 'Rio de Janeiro, RJ' },
  { id: 'all', title: 'Todos os eventos', location: '' },
];

/* Deterministic seed to avoid SSR/client hydration mismatch */
const seededValue = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

const generateSalesHistory = () => {
  // Generate 60 days to support previous period comparisons (0-29 previous, 30-59 current)
  const days: { date: string; revenue: number; tickets: number }[] = [];
  const baseDate = dayjs().startOf('day');
  for (let i = 59; i >= 0; i--) {
    const d = baseDate.subtract(i, 'day');
    const base = 800 + seededValue(i + 7) * 3200;
    days.push({
      date: d.format('DD/MM'),
      revenue: Math.round(base * 100) / 100,
      tickets: Math.floor(base / 45),
    });
  }
  return days;
};

const MOCK_SALES_HISTORY = generateSalesHistory();

const MOCK_RECENT_SALES = [
  { id: '1', buyerName: 'Lucas Mendes', batchName: 'Pista - Lote 1', eventTitle: 'Mega Show Arena', price: 12000, timestamp: dayjs().subtract(3, 'minute').format('HH:mm'), status: 'VALID' },
  { id: '2', buyerName: 'Ana Beatriz', batchName: 'VIP - Lote 2', eventTitle: 'Mega Show Arena', price: 25000, timestamp: dayjs().subtract(8, 'minute').format('HH:mm'), status: 'VALID' },
  { id: '3', buyerName: 'Carlos Silva', batchName: 'Pista - Lote 1', eventTitle: 'Festival Vibes', price: 8500, timestamp: dayjs().subtract(14, 'minute').format('HH:mm'), status: 'PENDING_VALIDATION' },
  { id: '4', buyerName: 'Mariana Costa', batchName: 'Camarote', eventTitle: 'Mega Show Arena', price: 45000, timestamp: dayjs().subtract(22, 'minute').format('HH:mm'), status: 'CONSUMED' },
  { id: '5', buyerName: 'Rafael Oliveira', batchName: 'Pista - Lote 2', eventTitle: 'Festival Vibes', price: 12000, timestamp: dayjs().subtract(31, 'minute').format('HH:mm'), status: 'VALID' },
  { id: '6', buyerName: 'Fernanda Alves', batchName: 'VIP - Lote 1', eventTitle: 'Mega Show Arena', price: 22000, timestamp: dayjs().subtract(45, 'minute').format('HH:mm'), status: 'VALID' },
];

const MOCK_BATCHES = [
  { id: '1', name: 'Pista - Lote 1', totalQuantity: 500, availableQuantity: 123, price: 12000 },
  { id: '2', name: 'Pista - Lote 2', totalQuantity: 300, availableQuantity: 300, price: 15000 },
  { id: '3', name: 'VIP - Lote 1', totalQuantity: 200, availableQuantity: 45, price: 22000 },
  { id: '4', name: 'VIP - Lote 2', totalQuantity: 150, availableQuantity: 150, price: 28000 },
  { id: '5', name: 'Camarote', totalQuantity: 50, availableQuantity: 8, price: 45000 },
];

/* ─────────────────────────────────────────────
   COMPONENT
   ───────────────────────────────────────────── */

const PERIOD_OPTIONS = [
  { label: 'Hoje', value: 'today' },
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: 'Personalizado', value: 'custom' },
];

const STATUS_OPTIONS = [
  { label: 'Todos', value: 'all' },
  { label: 'À venda', value: 'active' },
  { label: 'Encerrado', value: 'ended' },
];

export default function DashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Live telemetry from existing API
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mounted state to avoid hydration issues with dynamic machine hours & Recharts
  const [isMounted, setIsMounted] = useState(false);
  const [currentHour, setCurrentHour] = useState<number>(23);

  // Panic controls
  const [localThrottle, setLocalThrottle] = useState(500);
  const [globalPaused, setGlobalPaused] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentHour(new Date().getHours());

    const hourTimer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);

    return () => clearInterval(hourTimer);
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/overview');
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
          if (data.checkoutLimit !== undefined) setLocalThrottle(data.checkoutLimit);
          if (data.salesPaused !== undefined) setGlobalPaused(data.salesPaused);
        }
      } catch {
        /* silently fail - mock data covers */
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically scale mock data based on telemetry values to ensure consistency
  const scaledSalesHistory = useMemo(() => {
    if (telemetry?.grossRevenue !== undefined && telemetry?.grossRevenue !== null) {
      // Scale based on the last 30 days of the history to match telemetry
      const last30Mock = MOCK_SALES_HISTORY.slice(-30);
      const totalMockRevenue = last30Mock.reduce((a, b) => a + b.revenue, 0);
      const totalMockTickets = last30Mock.reduce((a, b) => a + b.tickets, 0);
      
      const revFactor = totalMockRevenue > 0 ? telemetry.grossRevenue / totalMockRevenue : 0;
      const tickFactor = totalMockTickets > 0 ? (telemetry.ticketsSold || totalMockTickets) / totalMockTickets : 0;
      
      return MOCK_SALES_HISTORY.map(day => {
        const ticketCount = Math.floor(day.tickets * tickFactor);
        return {
          ...day,
          revenue: ticketCount > 0 ? Math.round(day.revenue * revFactor * 100) / 100 : 0,
          tickets: ticketCount,
        };
      });
    }
    return MOCK_SALES_HISTORY;
  }, [telemetry]);

  // Generate hourly data for 'today' up to the current machine hour
  const todayHourlyData = useMemo(() => {
    const targetDay = scaledSalesHistory[scaledSalesHistory.length - 1];
    const targetRevenue = targetDay?.revenue ?? 2400;
    const targetTickets = targetDay?.tickets ?? 50;

    const rawHourly = [];
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, '0')}:00`;
      const seed = h + 15; // stable seed for hourly variation
      const base = 120 + seededValue(seed) * 580;
      rawHourly.push({
        date: label,
        revenue: base,
        tickets: Math.max(1, Math.floor(base / 45)),
      });
    }

    const rawSumRevenue = rawHourly.reduce((a, b) => a + b.revenue, 0);
    const rawSumTickets = rawHourly.reduce((a, b) => a + b.tickets, 0);

    const revFactor = rawSumRevenue > 0 ? targetRevenue / rawSumRevenue : 0;
    const tickFactor = rawSumTickets > 0 ? targetTickets / rawSumTickets : 0;

    return rawHourly.map((hour, h) => {
      if (h <= currentHour) {
        const ticketCount = Math.floor(hour.tickets * tickFactor);
        return {
          date: hour.date,
          revenue: ticketCount > 0 ? Math.round(hour.revenue * revFactor * 100) / 100 : 0,
          tickets: ticketCount,
        };
      } else {
        // Do not mock the rest of the day, only show until the real time of the world
        return {
          date: hour.date,
          revenue: null,
          tickets: null,
        };
      }
    });
  }, [currentHour, scaledSalesHistory]);

  // Comparative data selection for selected vs previous period to compute correct changes
  const periodData = useMemo(() => {
    let current: { date: string; revenue: number | null; tickets: number | null }[] = [];
    let previous: { date: string; revenue: number | null; tickets: number | null }[] = [];

    if (selectedPeriod === 'today') {
      current = todayHourlyData;
      const yesterday = scaledSalesHistory[scaledSalesHistory.length - 2];
      
      // Generate yesterday's hourly mock to match today's hour-by-hour comparison
      const yesterdayHourly = [];
      for (let h = 0; h < 24; h++) {
        const label = `${String(h).padStart(2, '0')}:00`;
        const seed = h + 42;
        const base = 120 + seededValue(seed) * 580;
        yesterdayHourly.push({
          date: label,
          revenue: base,
          tickets: Math.max(1, Math.floor(base / 45)),
        });
      }
      const rawSumRevenue = yesterdayHourly.reduce((a, b) => a + b.revenue, 0);
      const rawSumTickets = yesterdayHourly.reduce((a, b) => a + b.tickets, 0);

      const yRev = yesterday?.revenue ?? 0;
      const yTick = yesterday?.tickets ?? 0;
      const revFactor = rawSumRevenue > 0 ? yRev / rawSumRevenue : 0;
      const tickFactor = rawSumTickets > 0 ? yTick / rawSumTickets : 0;

      previous = yesterdayHourly.map((hour, h) => {
        if (h <= currentHour) {
          const ticketCount = Math.floor(hour.tickets * tickFactor);
          return {
            date: hour.date,
            revenue: ticketCount > 0 ? Math.round(hour.revenue * revFactor * 100) / 100 : 0,
            tickets: ticketCount,
          };
        } else {
          return { date: hour.date, revenue: null, tickets: null };
        }
      });

    } else if (selectedPeriod === '7d') {
      current = scaledSalesHistory.slice(-7);
      previous = scaledSalesHistory.slice(-14, -7);
    } else {
      // 30d
      current = scaledSalesHistory.slice(-30);
      previous = scaledSalesHistory.slice(0, 30);
    }

    return { current, previous };
  }, [selectedPeriod, todayHourlyData, scaledSalesHistory, currentHour]);

  // Dynamic history based on period (to feed Recharts)
  const filteredHistory = useMemo(() => {
    return periodData.current;
  }, [periodData]);

  // KPIs computed from mock + telemetry
  const kpis = useMemo(() => {
    const validCurrent = periodData.current.filter((p) => p.revenue !== null);
    const validPrevious = periodData.previous.filter((p) => p.revenue !== null);

    const totalRevenue = validCurrent.reduce((a, b) => a + b.revenue!, 0);
    const totalTickets = validCurrent.reduce((a, b) => a + b.tickets!, 0);
    const avgTicket = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    const prevRevenue = validPrevious.reduce((a, b) => a + b.revenue!, 0);
    const prevTickets = validPrevious.reduce((a, b) => a + b.tickets!, 0);
    const prevAvgTicket = prevTickets > 0 ? prevRevenue / prevTickets : 0;

    // Dynamic conversion rate calculation
    const currentConversion = totalTickets > 0 ? (telemetry?.conversionRate ?? 68.4) : 0;
    const prevConversion = prevTickets > 0 ? (telemetry?.conversionRate ?? 65.2) : 0;

    // Real dynamic variance calculator
    const calculatePctChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const revenueChange = calculatePctChange(totalRevenue, prevRevenue);
    const ticketsChange = calculatePctChange(totalTickets, prevTickets);
    const avgTicketChange = calculatePctChange(avgTicket, prevAvgTicket);
    const conversionChange = calculatePctChange(currentConversion, prevConversion);

    return {
      totalRevenue,
      totalTickets,
      avgTicket,
      conversionRate: currentConversion,
      revenueChange,
      ticketsChange,
      avgTicketChange,
      conversionChange,
    };
  }, [periodData, telemetry, selectedPeriod]);

  const handleUpdateThrottle = async (limit: number) => {
    try {
      setUpdatingSettings(true);
      const res = await fetch('/api/settings/throttle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar limite.');
    } catch (err: any) {
      alert(err.message);
    } finally {
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const formatReais = (v: number) =>
    (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatReaisSimple = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const activeCheckouts = telemetry?.activeCheckoutLocks || 0;

  /* ── Custom Recharts Tooltip ── */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#EAEAEA] rounded-lg px-3.5 py-2.5 shadow-lg">
        <p className="text-[11px] font-semibold text-[#8A8A8A] mb-1">{label}</p>
        <p className="text-sm font-bold text-[#111111]">
          R$ {formatReaisSimple(payload[0].value || 0)}
        </p>
        {payload[1] && (
          <p className="text-[11px] text-[#666666] mt-0.5">
            {payload[1].value || 0} ingressos
          </p>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ── Barra de Filtros ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Event select */}
          <div className="relative">
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="appearance-none bg-white border border-[#EAEAEA] rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-[#2D2D2D] cursor-pointer focus:outline-none focus:border-[#FF3200] focus:ring-1 focus:ring-[#FF3200]/20 transition-all"
            >
              {MOCK_EVENTS.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B5B5B5] pointer-events-none" />
          </div>

          {/* Period pills */}
          <div className="flex items-center bg-[#F5F5F5] rounded-lg p-0.5 border border-[#EAEAEA]">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 border-none cursor-pointer ${selectedPeriod === opt.value
                    ? 'bg-white text-[#111111] shadow-sm font-semibold'
                    : 'bg-transparent text-[#666666] hover:text-[#2D2D2D]'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Status select */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none bg-white border border-[#EAEAEA] rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-[#2D2D2D] cursor-pointer focus:outline-none focus:border-[#FF3200] focus:ring-1 focus:ring-[#FF3200]/20 transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B5B5B5] pointer-events-none" />
          </div>

          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FF3200]/5 border border-[#FF3200]/15 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3200] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#FF3200]">Ao vivo</span>
            </span>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Faturamento bruto',
              value: `R$ ${formatReaisSimple(kpis.totalRevenue)}`,
              change: kpis.revenueChange,
              icon: DollarSign,
              accent: false,
            },
            {
              label: 'Ingressos vendidos',
              value: kpis.totalTickets.toLocaleString('pt-BR'),
              change: kpis.ticketsChange,
              icon: Ticket,
              accent: false,
            },
            {
              label: 'Ticket médio',
              value: `R$ ${formatReaisSimple(kpis.avgTicket)}`,
              change: kpis.avgTicketChange,
              icon: TrendingUp,
              accent: false,
            },
            {
              label: 'Taxa de conversão',
              value: `${kpis.conversionRate.toFixed(1)}%`,
              change: kpis.conversionChange,
              icon: Target,
              accent: true,
            },
          ].map((kpi, idx) => {
            const Icon = kpi.icon;
            const isPositive = kpi.change >= 0;
            return (
              <div
                key={idx}
                className="bg-white border border-[#EAEAEA] rounded-xl p-5 flex flex-col justify-between hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F5F5F5] group-hover:bg-[#FF3200]/5 flex items-center justify-center transition-colors">
                    <Icon className="w-[18px] h-[18px] text-[#8A8A8A] group-hover:text-[#FF3200] transition-colors" />
                  </div>
                  <span
                    className={`flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${isPositive
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-red-500 bg-red-50'
                      }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-[#8A8A8A] block mb-1">{kpi.label}</span>
                  <span className="text-xl font-bold text-[#111111] tracking-tight font-mono block">
                    {kpi.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Gráfico de Vendas (Recharts AreaChart) ── */}
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                {selectedPeriod === 'today' ? 'Receita por hora' : 'Receita por dia'}
              </h2>
              <p className="text-[12px] text-[#8A8A8A] mt-0.5">
                {selectedPeriod === 'today'
                  ? 'Detalhamento horário do faturamento de hoje (R$)'
                  : selectedPeriod === '7d'
                  ? 'Faturamento dos últimos 7 dias (R$)'
                  : 'Últimos 30 dias de faturamento (R$)'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-[#8A8A8A]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF3200]/20 border border-[#FF3200]/40" />
                Receita
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
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
                    interval={selectedPeriod === 'today' ? 2 : selectedPeriod === '7d' ? 0 : 'preserveStartEnd'}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#8A8A8A' }}
                    domain={[0, 'auto']}
                    tickFormatter={(v: number) => {
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                      return `R$ ${v.toFixed(0)}`;
                    }}
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

        {/* ── Grid: Vendas Recentes + Ingressos por Lote ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Vendas recentes (3/5 width) */}
          <div className="lg:col-span-3 bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Vendas recentes</h3>
                <p className="text-[11px] text-[#8A8A8A] mt-0.5">Últimas transações registradas</p>
              </div>
              <Activity className="w-4 h-4 text-[#B5B5B5]" />
            </div>

            <div className="divide-y divide-[#F5F5F5]">
              {MOCK_RECENT_SALES.map((sale) => (
                <div key={sale.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[10px] font-bold text-[#666666] shrink-0">
                      {sale.buyerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-[#111111] block truncate">{sale.buyerName}</span>
                      <span className="text-[11px] text-[#8A8A8A] block truncate">{sale.batchName} · {sale.eventTitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-4">
                    {getSaleStatusBadge(sale.status)}
                    <span className="text-[11px] text-[#B5B5B5] font-medium w-10 text-right">{sale.timestamp}</span>
                    <span className="text-sm font-bold text-[#111111] font-mono w-24 text-right">
                      {formatReais(sale.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingressos por lote (2/5 width) */}
          <div className="lg:col-span-2 bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111111]">Ingressos por lote</h3>
                <p className="text-[11px] text-[#8A8A8A] mt-0.5">Estoque vs. vendido</p>
              </div>
              <Layers className="w-4 h-4 text-[#B5B5B5]" />
            </div>

            <div className="p-5 space-y-4">
              {MOCK_BATCHES.map((batch) => {
                const sold = batch.totalQuantity - batch.availableQuantity;
                const percent = Math.round((sold / batch.totalQuantity) * 100);
                const isCritical = percent >= 80;

                return (
                  <div key={batch.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-semibold text-[#2D2D2D]">{batch.name}</span>
                      <span className="text-[11px] font-mono font-medium text-[#8A8A8A]">
                        {sold}/{batch.totalQuantity}
                      </span>
                    </div>
                    <div className="w-full bg-[#F5F5F5] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isCritical ? 'bg-[#FF3200]' : 'bg-[#2D2D2D]'
                          }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-[#B5B5B5] font-medium">{percent}% vendido</span>
                      <span className="text-[10px] font-mono text-[#8A8A8A]">
                        {formatReais(batch.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Ações Rápidas ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Criar evento', icon: Plus, href: '/events/new' },
            { label: 'Novo lote', icon: Layers, href: '/events' },
            { label: 'Exportar relatório', icon: FileDown, href: '#' },
            { label: 'Pausar vendas', icon: PauseCircle, href: '#', onClick: handleTogglePause, danger: globalPaused },
          ].map((action, idx) => {
            const Icon = action.icon;
            const content = (
              <div
                key={idx}
                onClick={action.onClick}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-150 cursor-pointer group ${action.danger
                    ? 'bg-[#FF3200]/5 border-[#FF3200]/20 hover:bg-[#FF3200]/10'
                    : 'bg-white border-[#EAEAEA] hover:border-[#DCDCDC] hover:shadow-sm'
                  }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${action.danger
                    ? 'bg-[#FF3200]/10 text-[#FF3200]'
                    : 'bg-[#F5F5F5] text-[#8A8A8A] group-hover:bg-[#FF3200]/5 group-hover:text-[#FF3200]'
                  }`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className={`text-[13px] font-semibold ${action.danger ? 'text-[#FF3200]' : 'text-[#2D2D2D]'
                  }`}>
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

        {/* ── Controles de Pânico (card discreto) ── */}
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
              {/* Throttle slider */}
              <div className="flex items-center gap-3 bg-[#F5F5F5] rounded-lg px-4 py-2.5 border border-[#EAEAEA]">
                <SlidersHorizontal className="w-4 h-4 text-[#8A8A8A] shrink-0" />
                <span className="text-[11px] font-semibold text-[#666666] whitespace-nowrap font-mono">
                  {localThrottle} checkouts
                </span>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={localThrottle}
                  onChange={(e) => setLocalThrottle(parseInt(e.target.value, 10))}
                  onMouseUp={() => handleUpdateThrottle(localThrottle)}
                  onTouchEnd={() => handleUpdateThrottle(localThrottle)}
                  className="w-24 h-1 bg-[#DCDCDC] rounded-lg appearance-none cursor-pointer accent-[#FF3200]"
                />
              </div>

              {/* Pause button */}
              <button
                onClick={handleTogglePause}
                disabled={updatingSettings}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer border ${globalPaused
                    ? 'bg-[#FF3200] border-[#FF3200] text-white animate-pulse'
                    : 'bg-white border-[#EAEAEA] text-[#666666] hover:border-[#FF3200] hover:text-[#FF3200]'
                  }`}
              >
                <Power className="w-3.5 h-3.5" />
                {globalPaused ? 'Vendas suspensas' : 'Pausar vendas'}
              </button>
            </div>
          </div>

          {/* Active sessions indicator */}
          <div className="mt-4 pt-3 border-t border-[#F5F5F5] flex items-center gap-6 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#8A8A8A]">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">Checkouts ativos:</span>
              <span className="font-bold text-[#111111] font-mono">{activeCheckouts}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#8A8A8A]">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">Atualizado:</span>
              <span className="font-mono text-[#666666]">{isMounted ? dayjs().format('HH:mm:ss') : '--:--:--'}</span>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[11px] text-[#B5B5B5] pb-4">
          <span>© {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.</span>
          <span className="font-mono">v2.0.0 (Dashboard analítica)</span>
        </div>

      </div>
    </Layout>
  );
}
