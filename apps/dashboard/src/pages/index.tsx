import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@flux/ui';
import {
  FaSquarePlus,
  FaShield,
  FaPowerOff,
  FaClock,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaEyeSlash,
  FaGauge,
  FaCheck,
  FaXmark,
  FaGear,
  FaUserCheck,
  FaWallet,
  FaTicket,
  FaChartSimple,
  FaAddressCard
} from 'react-icons/fa6';
import Link from 'next/link';

export default function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Layout customization state
  const [widgetOrder, setWidgetOrder] = useState<string[]>(['health', 'batches', 'validation', 'checkin', 'audit']);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({
    health: true,
    batches: true,
    validation: true,
    checkin: true,
    audit: true,
  });
  const [showConfigMenu, setShowConfigMenu] = useState(false);

  // Estados e manipuladores de Drag & Drop para o menu de tiles
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...widgetOrder];
    const draggedItem = newOrder[draggedIndex];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setWidgetOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    saveLayoutConfig(widgetOrder, visibleWidgets);
  };

  // Novos estados para configurações dinâmicas de pânico & busca
  const [localThrottle, setLocalThrottle] = useState(500);
  const isDraggingRef = useRef(false);
  const [globalPaused, setGlobalPaused] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load configuration from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('flux_dashboard_widget_order');
    const savedVisibility = localStorage.getItem('flux_dashboard_widget_visibility');
    if (savedOrder) {
      try { setWidgetOrder(JSON.parse(savedOrder)); } catch (e) { }
    }
    if (savedVisibility) {
      try { setVisibleWidgets(JSON.parse(savedVisibility)); } catch (e) { }
    }
  }, []);

  const saveLayoutConfig = (newOrder: string[], newVisibility: Record<string, boolean>) => {
    setWidgetOrder(newOrder);
    setVisibleWidgets(newVisibility);
    localStorage.setItem('flux_dashboard_widget_order', JSON.stringify(newOrder));
    localStorage.setItem('flux_dashboard_widget_visibility', JSON.stringify(newVisibility));
  };

  const toggleWidgetVisibility = (widgetKey: string) => {
    const newVisibility = { ...visibleWidgets, [widgetKey]: !visibleWidgets[widgetKey] };
    saveLayoutConfig(widgetOrder, newVisibility);
  };

  // Fetch telemetry from API
  const fetchData = async () => {
    try {
      const response = await fetch('/api/overview');
      if (!response.ok) throw new Error('Falha ao obter dados do servidor.');
      const telemetry = await response.json();
      setData(telemetry);
      setError('');

      if (telemetry.checkoutLimit !== undefined && !isDraggingRef.current) {
        setLocalThrottle(telemetry.checkoutLimit);
      }
      if (telemetry.salesPaused !== undefined) {
        setGlobalPaused(telemetry.salesPaused);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar painel de telemetria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(fetchData, 4000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleUpdateThrottle = async (limit: number) => {
    try {
      setUpdatingSettings(true);
      const res = await fetch('/api/settings/throttle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar limite de conexões.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleGlobalPause = async () => {
    try {
      setUpdatingSettings(true);
      const targetState = !globalPaused;
      const res = await fetch('/api/settings/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: targetState }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar suspensão de vendas.');
      setGlobalPaused(targetState);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleBatch = async (batchId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar status do lote.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleValidateTicket = async (ticketId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/tickets/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, action }),
      });
      if (!response.ok) throw new Error('Erro ao processar validação do ingresso.');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatSLA = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSLAColor = (seconds: number) => {
    if (seconds < 24 * 60 * 60) return 'text-[#FF3200] font-bold';
    if (seconds < 48 * 60 * 60) return 'text-amber-500 font-bold';
    return 'text-emerald-600 font-semibold';
  };

  const getSaleStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return <span className="px-2 py-0.5 rounded-[2px] bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-bold uppercase tracking-wider">Aprovado</span>;
      case 'CONSUMED':
        return <span className="px-2 py-0.5 rounded-[2px] bg-blue-50 border border-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-wider">Portaria</span>;
      case 'PENDING_VALIDATION':
        return <span className="px-2 py-0.5 rounded-[2px] bg-amber-50 border border-amber-100 text-amber-600 text-[8px] font-bold uppercase tracking-wider">Pendente Doc</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[2px] bg-neutral-100 border border-neutral-200 text-neutral-500 text-[8px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  const calculateSellOut = (batch: any) => {
    if (batch.availableQuantity === 0) return 'Lote Esgotado';

    const locks = data?.activeCheckoutLocks || 0;
    const conversion = data?.conversionRate || 0;

    const velocitySec = (locks * (conversion / 100)) / 180;
    const velocityMin = velocitySec * 60;

    if (velocityMin <= 0) return 'Demanda estável / Sem risco de esgotar';

    const activeBatchesCount = data?.batches?.filter((b: any) => b.isActive && b.availableQuantity > 0).length || 1;
    const batchVelocityMin = velocityMin / activeBatchesCount;

    const minutesLeft = Math.ceil(batch.availableQuantity / batchVelocityMin);
    if (minutesLeft > 1440) return 'Mais de 24 horas restantes';
    if (minutesLeft > 60) {
      const hrs = Math.floor(minutesLeft / 60);
      const mins = minutesLeft % 60;
      return `Previsão: Esgota em ~${hrs}h e ${mins}m`;
    }
    return `Crítico: Lote esgotará em ~${minutesLeft} minutos`;
  };

  if (loading && !data) {
    return (
      <Layout>
        <div className="h-[80vh] flex flex-col items-center justify-center space-y-4 bg-[#FAFAFA]">
          <svg className="animate-spin h-10 w-10 text-[#FF3200]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Sincronizando telemetria...</span>
        </div>
      </Layout>
    );
  }

  const activeCheckoutLocks = data?.activeCheckoutLocks || 0;
  const currentRps = (activeCheckoutLocks * 1.3 + 1.2).toFixed(1);
  const stressPercent = Math.min(100, Math.floor((activeCheckoutLocks / 10) * 100));
  const stressColor = activeCheckoutLocks >= 8 ? 'text-[#FF3200]' : activeCheckoutLocks >= 4 ? 'text-amber-500' : 'text-emerald-600';
  const stressStatus = activeCheckoutLocks >= 8 ? 'Sob Recarga / Pico' : activeCheckoutLocks >= 4 ? 'Moderado' : 'Estável';

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden relative bg-[#FAFAFA]">

        {/* TOP COMMAND PANEL CONTROLS */}
        <div className="flex justify-between items-center pb-4 border-b border-[#EAEAEA] flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-2 tracking-tight leading-none">
              Painel de Comando
              <span className="inline-block px-2 py-0.5 rounded bg-[#FF3200]/10 border border-[#FF3200]/20 text-[#FF3200] text-[9px] font-black uppercase tracking-widest animate-pulse">
                Live
              </span>
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-medium">Controle operacional e auditoria em tempo real.</p>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowConfigMenu(!showConfigMenu)}
              className="bg-white hover:bg-neutral-50 text-neutral-800 px-3.5 py-2.5 rounded-[4px] border border-[#EAEAEA] text-xs font-bold transition-all duration-75 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <FaGear className="w-3.5 h-3.5 text-neutral-500" />
              Personalizar painel
            </button>

            {/* Customization Dropdown Panel */}
            {showConfigMenu && (
              <div className="absolute right-0 top-12 w-72 bg-white border border-[#EAEAEA] rounded-[4px] p-4 shadow-lg z-50 text-neutral-850 animate-in fade-in slide-in-from-top-3 duration-75">
                <div className="flex justify-between items-center pb-2 border-b border-[#EAEAEA] mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Layout de tiles</h3>
                  <button onClick={() => setShowConfigMenu(false)} className="text-neutral-450 hover:text-neutral-800 border-none bg-transparent cursor-pointer"><FaXmark className="w-4 h-4" /></button>
                </div>
                <p className="text-[9px] text-neutral-400 mb-3 font-semibold">Arraste os itens para reordenar os cards.</p>
                <div className="space-y-2.5">
                  {widgetOrder.map((key, index) => {
                    const isVisible = visibleWidgets[key];
                    const label =
                      key === 'health' ? 'Saúde & stress' :
                        key === 'batches' ? 'Controle de lotes' :
                          key === 'validation' ? 'Validação meia-entrada' :
                            key === 'checkin' ? 'Portaria & entradas' : 'Fluxo de vendas';

                    const isDragged = draggedIndex === index;

                    return (
                      <div
                        key={key}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between text-xs font-semibold bg-[#FAFAFA] p-2.5 rounded-[4px] border transition-all duration-200 ease-out select-none cursor-move ${isDragged
                            ? 'border-[#FF3200] opacity-[0.25] bg-neutral-50'
                            : 'border-[#EAEAEA] hover:border-neutral-300'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <svg className="w-2.5 h-4 text-neutral-400 shrink-0 cursor-grab active:cursor-grabbing" fill="none" viewBox="0 0 24 24">
                            <circle cx="8" cy="5" r="2" fill="currentColor" />
                            <circle cx="16" cy="5" r="2" fill="currentColor" />
                            <circle cx="8" cy="12" r="2" fill="currentColor" />
                            <circle cx="16" cy="12" r="2" fill="currentColor" />
                            <circle cx="8" cy="19" r="2" fill="currentColor" />
                            <circle cx="16" cy="19" r="2" fill="currentColor" />
                          </svg>
                          <span className={`truncate ${isVisible ? 'text-neutral-900' : 'text-neutral-400 line-through'}`}>{label}</span>
                        </div>

                        <button
                          onClick={() => toggleWidgetVisibility(key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isVisible ? 'bg-[#FF3200]' : 'bg-neutral-200'
                            }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isVisible ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTROLES DE PANICO */}
        <div className="bg-white border border-[#EAEAEA] rounded-md p-4 mt-3 flex-shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#FF3200]" />
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#FF3200]/10 border border-[#FF3200]/25 flex items-center justify-center text-[#FF3200] shrink-0">
              <FaPowerOff className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-neutral-800 tracking-wider leading-none">Camada de ação imediata (Controles de pânico)</h3>
              <p className="text-[10px] text-neutral-500 mt-1 font-medium">Controle de limite de checkout simultâneo e bloqueio total de vendas em emergência.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
            {/* Throttle Input Slider */}
            <div className="flex items-center gap-3 w-full sm:w-64">
              <span className="text-[10px] font-bold text-neutral-500 shrink-0 font-mono">Throttle: {localThrottle} checkouts</span>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={localThrottle}
                onMouseDown={() => { isDraggingRef.current = true; }}
                onChange={(e) => setLocalThrottle(parseInt(e.target.value, 10))}
                onMouseUp={() => {
                  isDraggingRef.current = false;
                  handleUpdateThrottle(localThrottle);
                }}
                onTouchStart={() => { isDraggingRef.current = true; }}
                onTouchEnd={() => {
                  isDraggingRef.current = false;
                  handleUpdateThrottle(localThrottle);
                }}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#FF3200]"
              />
            </div>

            {/* Global Pause Button */}
            <button
              onClick={handleToggleGlobalPause}
              disabled={updatingSettings}
              className={`w-full sm:w-auto px-5 py-2 rounded-[4px] text-xs font-bold transition-all duration-75 cursor-pointer active:scale-95 border flex items-center justify-center gap-2 ${globalPaused
                  ? 'bg-[#FF3200] border-[#FF3200] text-white animate-pulse'
                  : 'bg-[#FF3200]/10 border-[#FF3200]/30 text-[#FF3200] hover:bg-[#FF3200]/20'
                }`}
            >
              <FaPowerOff className="w-3.5 h-3.5" />
              {globalPaused ? 'Vendas suspensas' : 'Pausar vendas'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-xs p-4 rounded-xl flex-shrink-0 my-3">
            {error}
          </div>
        )}

        {/* TILES CONTAINER */}
        <div className="flex-grow grid grid-cols-12 gap-6 py-4 overflow-hidden h-full select-none">
          {widgetOrder
            .filter(key => visibleWidgets[key])
            .map(key => {
              if (key === 'health') {
                const hits = data?.cacheStats?.hits || 0;
                const misses = data?.cacheStats?.misses || 0;
                const totalCache = hits + misses;
                const cacheHitRatio = totalCache > 0 ? ((hits / totalCache) * 100).toFixed(1) : '100.0';

                const latencyList = data?.latencyHistory || [5, 5, 5];
                const points = latencyList
                  .slice()
                  .reverse()
                  .map((val: number, i: number, arr: number[]) => {
                    const x = (i / Math.max(1, arr.length - 1)) * 100;
                    const maxVal = Math.max(...arr, 50);
                    const y = 35 - (val / maxVal) * 30;
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[34vh] bg-white border border-[#EAEAEA] rounded-md p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:shadow-sm">
                    <div>
                      <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5 leading-none">
                        <FaChartSimple className="text-[#FF3200] w-3.5 h-3.5" />
                        Saúde operacional
                      </h3>

                      <div className="grid grid-cols-3 gap-2 mt-3.5">
                        <div>
                          <span className="text-[9px] font-bold text-neutral-450 block leading-none">Faturamento</span>
                          <span className="text-base font-mono font-black text-neutral-900 mt-1 block truncate">
                            R$ {data?.grossRevenue.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-neutral-450 block leading-none">Conversão</span>
                          <span className="text-base font-mono font-black text-neutral-900 mt-1 block truncate">
                            {data?.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-neutral-450 block leading-none">Redis cache</span>
                          <span className="text-base font-mono font-black text-emerald-600 mt-1 block truncate">
                            {cacheHitRatio}%
                          </span>
                        </div>
                      </div>

                      {/* API Latency Graphic */}
                      <div className="mt-4 border-t border-[#EAEAEA] pt-3">
                        <div className="flex justify-between items-center text-[10px] mb-1.5">
                          <span className="text-neutral-500 font-bold">Latência de API (últimos 20 polls)</span>
                          <span className="text-neutral-800 font-mono font-bold">Média: {(latencyList.reduce((a: number, b: number) => a + b, 0) / Math.max(1, latencyList.length)).toFixed(0)}ms</span>
                        </div>
                        <div className="w-full bg-[#FAFAFA] rounded border border-[#EAEAEA] h-14 overflow-hidden relative p-1">
                          {latencyList.length > 1 ? (
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 35" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#FF3200" stopOpacity="0.1" />
                                  <stop offset="100%" stopColor="#FF3200" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <polygon
                                fill="url(#latencyGrad)"
                                points={`0,35 ${points} 100,35`}
                              />
                              <polyline
                                fill="none"
                                stroke="#FF3200"
                                strokeWidth="1.5"
                                points={points}
                              />
                            </svg>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[9px] text-neutral-450 font-mono">Gerando gráfico...</div>
                          )}
                        </div>
                      </div>

                      {/* Stress de Lotação */}
                      <div className="mt-3.5 border-t border-[#EAEAEA] pt-3 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-neutral-500 font-bold flex items-center gap-1">
                            <FaGauge className="w-3.5 h-3.5" />
                            Stress de lotação (RPS)
                          </span>
                          <span className={`font-black uppercase tracking-wider ${stressColor}`}>{stressStatus}</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${activeCheckoutLocks >= 8 ? 'bg-[#FF3200]' : activeCheckoutLocks >= 4 ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                            style={{ width: `${stressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (key === 'batches') {
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[34vh] bg-white border border-[#EAEAEA] rounded-md p-5 flex flex-col relative overflow-hidden transition-all duration-75 hover:shadow-sm">
                    <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5 leading-none flex-shrink-0">
                      <FaPowerOff className="text-[#FF3200] w-3.5 h-3.5" />
                      Controle lotes ativos
                    </h3>

                    <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-2.5">
                      {data?.batches.map((batch: any) => {
                        const sold = batch.totalQuantity - batch.availableQuantity;
                        const percent = Math.floor((sold / batch.totalQuantity) * 100);
                        const selloutInfo = calculateSellOut(batch);
                        return (
                          <div key={batch.id} className="p-3 bg-[#FAFAFA] rounded-md border border-[#EAEAEA] flex justify-between items-center transition-all duration-75 hover:bg-neutral-50">
                            <div className="space-y-1 pr-2 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-extrabold text-neutral-900 truncate leading-none">{batch.name}</h4>
                                <span className="text-[9px] font-bold text-neutral-500 truncate leading-none uppercase max-w-[80px]" title={batch.eventTitle}>{batch.eventTitle}</span>
                              </div>
                              <span className="text-[10px] text-neutral-500 font-mono font-bold block">
                                R$ {batch.price.toFixed(2).replace('.', ',')} &bull; {sold}/{batch.totalQuantity} vendidos ({percent}%)
                              </span>
                              <span className="text-[9px] font-bold text-[#FF3200] block mt-0.5 animate-pulse">
                                {selloutInfo}
                              </span>
                            </div>

                            <button
                              onClick={() => handleToggleBatch(batch.id, batch.isActive)}
                              className={`px-3 py-1.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all duration-75 cursor-pointer select-none active:scale-95 border shrink-0 ${batch.isActive
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-red-50 border-red-250 text-[#FF3200] hover:bg-red-100'
                                }`}
                            >
                              {batch.isActive ? 'Ativo' : 'Pausado'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (key === 'validation') {
                const queueList = data?.queueSizeHistory || [0, 0, 0];
                const queuePoints = queueList
                  .slice()
                  .reverse()
                  .map((val: number, i: number, arr: number[]) => {
                    const x = (i / Math.max(1, arr.length - 1)) * 100;
                    const maxVal = Math.max(...arr, 5);
                    const y = 30 - (val / maxVal) * 26;
                    return `${x},${y}`;
                  })
                  .join(' ');

                const filteredQueue = data?.validationQueue.filter((ticket: any) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    (ticket.buyerName || '').toLowerCase().includes(query) ||
                    (ticket.holderName || '').toLowerCase().includes(query) ||
                    (ticket.buyerCpf || '').includes(query) ||
                    (ticket.holderCpf || '').includes(query)
                  );
                }) || [];

                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[71vh] xl:row-span-2 bg-white border border-[#EAEAEA] rounded-md p-5 flex flex-col relative overflow-hidden transition-all duration-75 hover:shadow-sm">
                    <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5 leading-none flex-shrink-0">
                      <FaAddressCard className="text-[#FF3200] w-3.5 h-3.5" />
                      Validação de meia-entrada
                    </h3>

                    {/* Minigráfico */}
                    <div className="mt-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded p-3 flex-shrink-0 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-neutral-500 block leading-none">Fila pendente</span>
                        <span className="text-base font-mono font-black text-neutral-900 block mt-1.5">
                          {data?.validationQueue?.length || 0} pendentes
                        </span>
                      </div>
                      <div className="w-32 h-8 overflow-hidden relative">
                        {queueList.length > 1 ? (
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polygon
                              fill="url(#queueGrad)"
                              points={`0,30 ${queuePoints} 100,30`}
                            />
                            <polyline
                              fill="none"
                              stroke="#10B981"
                              strokeWidth="1.5"
                              points={queuePoints}
                            />
                          </svg>
                        ) : (
                          <span className="text-[8px] text-neutral-400 font-mono">Gerando...</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex-shrink-0">
                      <input
                        type="text"
                        placeholder="Buscar CPF ou nome..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-[4px] px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#FF3200] transition-all"
                      />
                    </div>

                    <div className="flex-grow overflow-y-auto mt-3 pr-1 space-y-3.5">
                      {filteredQueue.length === 0 ? (
                        <div className="h-[30vh] flex flex-col items-center justify-center text-center p-6 space-y-3 text-neutral-400">
                          <FaUserCheck className="w-10 h-10 text-neutral-300" />
                          <p className="text-xs font-bold uppercase tracking-wider leading-none">Nenhuma pendência</p>
                          <p className="text-[10px] font-medium leading-relaxed max-w-[180px] mx-auto text-neutral-400">Não há registros na fila ou filtros ativos não encontraram correspondências.</p>
                        </div>
                      ) : (
                        filteredQueue.map((ticket: any) => (
                          <div key={ticket.id} className="p-3 bg-[#FAFAFA] rounded-md border border-[#EAEAEA] flex flex-col justify-between space-y-3 transition-all duration-75 hover:bg-neutral-50">
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-neutral-900 truncate max-w-[150px]">{ticket.holderName || ticket.buyerName}</span>
                                <span className={`text-[10px] flex items-center gap-1 ${getSLAColor(ticket.secondsLeft)}`}>
                                  <FaClock className="w-3 h-3" />
                                  SLA: {formatSLA(ticket.secondsLeft)}
                                </span>
                              </div>
                              <span className="text-[9px] text-neutral-500 block leading-none">{ticket.batchName} &bull; {ticket.eventTitle}</span>
                              <span className="text-[10px] text-neutral-500 block font-mono font-medium leading-none">CPF: {ticket.holderCpf || ticket.buyerCpf}</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleValidateTicket(ticket.id, 'approve')}
                                className="flex-1 py-1.5 bg-[#FF3200] hover:bg-[#E62D00] text-white rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all duration-75 flex items-center justify-center gap-1 cursor-pointer active:scale-95 border-none"
                              >
                                <FaCheck className="w-3 h-3" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleValidateTicket(ticket.id, 'reject')}
                                className="flex-1 py-1.5 bg-neutral-200 hover:bg-neutral-350 text-neutral-700 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all duration-75 flex items-center justify-center gap-1 cursor-pointer active:scale-95 border-none"
                              >
                                <FaXmark className="w-3 h-3" />
                                Reprovar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              }

              if (key === 'checkin') {
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[34vh] bg-white border border-[#EAEAEA] rounded-md p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:shadow-sm">
                    <div className="flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start flex-shrink-0">
                        <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5 leading-none">
                          <FaUserCheck className="text-[#FF3200] w-3.5 h-3.5" />
                          Fluxo de portaria
                        </h3>

                        {data?.deniedAttempts > 0 ? (
                          <span className="px-2 py-0.5 rounded-[2px] bg-red-50 border border-red-100 text-[#FF3200] text-[8px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#FF3200]" />
                            {data.deniedAttempts} fraudes bloqueadas
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[2px] bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ambiente seguro
                          </span>
                        )}
                      </div>

                      <div className="flex gap-4 items-center mt-3">
                        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="28" cy="28" r="24" className="stroke-neutral-100" strokeWidth="3" fill="transparent" />
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              className="stroke-[#FF3200] transition-all duration-75 ease-linear"
                              strokeWidth="3"
                              strokeLinecap="round"
                              fill="transparent"
                              strokeDasharray={151}
                              strokeDashoffset={
                                151 - (151 * (data?.ticketsSold > 0 ? (data.checkInsCount / data.ticketsSold) * 100 : 0)) / 100
                              }
                            />
                          </svg>
                          <span className="text-[10px] font-mono font-black text-neutral-900 leading-none">
                            {data?.ticketsSold > 0 ? Math.floor((data.checkInsCount / data.ticketsSold) * 100) : 0}%
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-neutral-500 block leading-none">Pessoas no evento</span>
                          <span className="text-sm font-mono font-black text-neutral-900 block">
                            {data?.checkInsCount} <span className="text-[10px] font-bold text-neutral-450">/ {data?.ticketsSold}</span>
                          </span>
                          <span className="text-[9px] text-neutral-400 block font-semibold leading-none">Check-ins via PWA Staff.</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#EAEAEA] pt-2 flex-grow overflow-y-auto space-y-1">
                        <span className="text-[8px] uppercase font-black text-neutral-500 block tracking-wide">Scanners de staff ativos</span>
                        {(!data?.staffDevices || data.staffDevices.length === 0) ? (
                          <div className="text-[9px] text-neutral-400 italic mt-1 font-light">Nenhum scanner conectado nas últimas horas.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5 mt-1">
                            {data.staffDevices.map((device: any) => (
                              <div key={device.deviceId} className="flex justify-between items-center text-[9px] bg-[#FAFAFA] p-1 rounded border border-[#EAEAEA]">
                                <div className="truncate pr-1">
                                  <span className="text-neutral-850 font-bold block truncate">{device.deviceName}</span>
                                  <span className="text-[7.5px] text-neutral-400 font-mono">Sync: {new Date(device.lastSyncTime).toLocaleTimeString('pt-BR')}</span>
                                </div>
                                <span className={`px-1 rounded-[2px] font-mono text-[8px] font-bold shrink-0 ${device.pendingSyncCount > 0 ? 'bg-amber-50 border border-amber-100 text-amber-600 animate-pulse' : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                                  }`}>
                                  {device.pendingSyncCount} pend
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (key === 'audit') {
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[34vh] bg-white border border-[#EAEAEA] rounded-md p-5 flex flex-col relative overflow-hidden transition-all duration-75 hover:shadow-sm">
                    <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5 leading-none flex-shrink-0">
                      <FaWallet className="text-[#FF3200] w-3.5 h-3.5" />
                      Fluxo de vendas recentes
                    </h3>

                    <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-2.5">
                      {!data?.recentSales || data.recentSales.length === 0 ? (
                        <div className="h-[20vh] flex flex-col items-center justify-center text-center p-4 space-y-2 text-[#ADADB8]">
                          <p className="text-[10px] font-bold uppercase tracking-wider">Nenhuma venda registrada</p>
                          <p className="text-[9px] font-medium leading-relaxed max-w-[150px] mx-auto text-neutral-400">Aguardando novos pedidos de clientes.</p>
                        </div>
                      ) : (
                        data.recentSales.map((sale: any) => (
                          <div key={sale.id} className="p-2.5 bg-[#FAFAFA] rounded-md border border-[#EAEAEA] flex justify-between items-center transition-all duration-75 hover:bg-neutral-50">
                            <div className="space-y-1 pr-2 min-w-0 flex-1 flex flex-col">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[11px] font-extrabold text-neutral-900 truncate leading-none">{sale.buyerName}</h4>
                                <span className="text-[9px] font-mono text-neutral-400 shrink-0 leading-none">{sale.timestamp}</span>
                              </div>
                              <span className="text-[9px] text-neutral-500 font-bold block truncate leading-none">
                                {sale.batchName} &bull; {sale.eventTitle}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                              <span className="text-xs font-mono font-black text-neutral-900 leading-none">
                                R$ {sale.price.toFixed(2).replace('.', ',')}
                              </span>
                              {getSaleStatusBadge(sale.status)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
        </div>

        {/* BOTTOM FOOTER */}
        <div className="flex justify-between items-center text-[10px] text-neutral-400 border-t border-[#EAEAEA] pt-3 flex-shrink-0">
          <span>&copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.</span>
          <span>Versão operacional v1.3.0 (Build Produtor)</span>
        </div>

      </div>
    </Layout>
  );
}
