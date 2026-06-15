import { useEffect, useState } from 'react';
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

  // Load configuration from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('flux_dashboard_widget_order');
    const savedVisibility = localStorage.getItem('flux_dashboard_widget_visibility');
    if (savedOrder) {
      try { setWidgetOrder(JSON.parse(savedOrder)); } catch (e) {}
    }
    if (savedVisibility) {
      try { setVisibleWidgets(JSON.parse(savedVisibility)); } catch (e) {}
    }
  }, []);

  const saveLayoutConfig = (newOrder: string[], newVisibility: Record<string, boolean>) => {
    setWidgetOrder(newOrder);
    setVisibleWidgets(newVisibility);
    localStorage.setItem('flux_dashboard_widget_order', JSON.stringify(newOrder));
    localStorage.setItem('flux_dashboard_widget_visibility', JSON.stringify(newVisibility));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...widgetOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap elements
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    saveLayoutConfig(newOrder, visibleWidgets);
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
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar painel de telemetria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll telemetry every 4 seconds for real-time responsiveness
    const pollInterval = setInterval(fetchData, 4000);
    return () => clearInterval(pollInterval);
  }, []);

  // Update batch state (pause/resume sales)
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

  // Approve/Reject validation tickets
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

  // Convert seconds left into human-readable HH:MM:SS SLA counter
  const formatSLA = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSLAColor = (seconds: number) => {
    if (seconds < 24 * 60 * 60) return 'text-red-500 font-black'; // Less than 24 hours
    if (seconds < 48 * 60 * 60) return 'text-amber-500 font-extrabold'; // Less than 48 hours
    return 'text-emerald-400 font-bold';
  };

  const getSaleStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return <span className="px-2 py-0.5 rounded-[2px] bg-[#00C853]/10 border border-[#00C853]/20 text-[#00C853] text-[8px] font-bold uppercase tracking-wider">Aprovado</span>;
      case 'CONSUMED':
        return <span className="px-2 py-0.5 rounded-[2px] bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-bold uppercase tracking-wider">Portaria</span>;
      case 'PENDING_VALIDATION':
        return <span className="px-2 py-0.5 rounded-[2px] bg-[#FFCA28]/10 border border-[#FFCA28]/20 text-[#FFCA28] text-[8px] font-bold uppercase tracking-wider">Pendente Doc</span>;
      default:
        return <span className="px-2 py-0.5 rounded-[2px] bg-[#ADADB8]/10 border border-[#ADADB8]/20 text-[#ADADB8] text-[8px] font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  // Loading Screen
  if (loading && !data) {
    return (
      <Layout>
        <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-cosmic-neon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-neutral-400 font-bold uppercase tracking-widest">Sincronizando Telemetria...</span>
        </div>
      </Layout>
    );
  }

  // Calculate stress values based on activeCheckoutLocks
  const activeCheckoutLocks = data?.activeCheckoutLocks || 0;
  const currentRps = (activeCheckoutLocks * 1.3 + 1.2).toFixed(1);
  const stressPercent = Math.min(100, Math.floor((activeCheckoutLocks / 10) * 100));
  const stressStatus = activeCheckoutLocks >= 8 ? 'Sob Recarga / Pico' : activeCheckoutLocks >= 4 ? 'Moderado' : 'Estável';
  const stressColor = activeCheckoutLocks >= 8 ? 'text-red-500' : activeCheckoutLocks >= 4 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden relative">
        
        {/* TOP COMMAND PANEL CONTROLS */}
        <div className="flex justify-between items-center pb-4 border-b border-cosmic-border flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black text-[#EFEFF1] flex items-center gap-2 tracking-wide leading-none">
              Painel de Comando
              <span className="inline-block px-2 py-0.5 rounded bg-cosmic-neon/10 border border-cosmic-neon/20 text-cosmic-neon text-[9px] font-black uppercase tracking-widest animate-pulse">
                Live
              </span>
            </h1>
            <p className="text-xs text-[#ADADB8] mt-1 font-medium">Controle operacional e auditoria em tempo real.</p>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setShowConfigMenu(!showConfigMenu)}
              className="bg-[#1F1F23] hover:bg-[#252528] text-[#EFEFF1] px-3.5 py-2.5 rounded-[4px] border border-cosmic-border text-xs font-bold transition-all duration-75 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <FaGear className="w-3.5 h-3.5" />
              Personalizar Painel
            </button>

            {/* Customization Dropdown Panel */}
            {showConfigMenu && (
              <div className="absolute right-0 top-12 w-72 bg-[#1F1F23] border border-cosmic-border rounded-[4px] p-4 shadow-2xl z-50 text-[#EFEFF1] animate-in fade-in slide-in-from-top-3 duration-75">
                <div className="flex justify-between items-center pb-2 border-b border-cosmic-border mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#ADADB8]">Layout de Tiles</h3>
                  <button onClick={() => setShowConfigMenu(false)} className="text-[#ADADB8] hover:text-[#EFEFF1] border-none bg-transparent cursor-pointer"><FaXmark className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3.5">
                  {widgetOrder.map((key, index) => {
                    const isVisible = visibleWidgets[key];
                    const label =
                      key === 'health' ? 'Saúde & Stress' :
                      key === 'batches' ? 'Controle de Lotes' :
                      key === 'validation' ? 'Validação Meia-Entrada' :
                      key === 'checkin' ? 'Portaria & Entradas' : 'Fluxo de Vendas';

                    return (
                      <div key={key} className="flex items-center justify-between text-xs font-semibold bg-[#18181B] p-2 rounded-[4px] border border-cosmic-border">
                        <span className={`truncate ${isVisible ? 'text-white' : 'text-neutral-600 line-through'}`}>{label}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleWidgetVisibility(key)}
                            className={`p-1 rounded hover:bg-neutral-800 ${isVisible ? 'text-cosmic-neon' : 'text-neutral-600'}`}
                            title={isVisible ? 'Ocultar' : 'Exibir'}
                          >
                            {isVisible ? <FaEye className="w-4 h-4" /> : <FaEyeSlash className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => moveWidget(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 disabled:pointer-events-none"
                            title="Mover para Cima"
                          >
                            <FaArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveWidget(index, 'down')}
                            disabled={index === widgetOrder.length - 1}
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 disabled:pointer-events-none"
                            title="Mover para Baixo"
                          >
                            <FaArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-xl flex-shrink-0 my-3">
            {error}
          </div>
        )}

        {/* 100VH VIEWPORT TILES CONTAINER (DESKTOP ONLY NO-SCROLL) */}
        <div className="flex-grow grid grid-cols-12 gap-6 py-4 overflow-hidden h-full select-none">
          {widgetOrder
            .filter(key => visibleWidgets[key])
            .map(key => {
              if (key === 'health') {
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[39vh] bg-cosmic-slate border border-cosmic-border rounded-md p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:shadow-[0_0_0_2px_#9146FF] hover:border-transparent">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-cosmic-neon/5 blur-[50px] pointer-events-none" />
                    <div>
                      <h3 className="text-xs uppercase font-bold text-[#ADADB8] tracking-wider flex items-center gap-1.5 leading-none">
                        <FaChartSimple className="text-cosmic-neon w-3.5 h-3.5" />
                        Saúde Operacional
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#ADADB8] block leading-none">Faturamento</span>
                          <span className="text-xl font-mono font-black text-[#EFEFF1] mt-1 block">
                            R$ {data?.grossRevenue.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#ADADB8] block leading-none">Conversão</span>
                          <span className="text-xl font-mono font-black text-[#EFEFF1] mt-1 block">
                            {data?.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Stress Load Radial/Progress Indicator */}
                      <div className="mt-5 border-t border-cosmic-border pt-4 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#ADADB8] font-bold flex items-center gap-1">
                            <FaGauge className="w-3.5 h-3.5" />
                            Stress de Lotação (RPS)
                          </span>
                          <span className={`font-black uppercase tracking-wider ${stressColor}`}>{stressStatus}</span>
                        </div>
                        <div className="w-full bg-[#0E0E10] rounded-full h-2 max-w-xs overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${
                              activeCheckoutLocks >= 8 ? 'bg-[#EB0400] shadow-[0_0_10px_rgba(235,4,0,0.5)]' : activeCheckoutLocks >= 4 ? 'bg-[#FFCA28] shadow-[0_0_10px_rgba(255,202,40,0.5)]' : 'bg-[#00C853] shadow-[0_0_10px_rgba(0,200,83,0.5)]'
                            }`}
                            style={{ width: `${stressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#ADADB8] font-semibold block">
                          Carga estimada: <strong className="text-[#EFEFF1] font-mono font-bold">{currentRps} req/s</strong> ({activeCheckoutLocks} locks checkout ativos)
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-[#ADADB8] font-bold border-t border-cosmic-border pt-3 flex items-center gap-1.5 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />
                      Métricas em tempo real atualizadas a cada 4s
                    </div>
                  </div>
                );
              }

              if (key === 'batches') {
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[39vh] bg-cosmic-slate border border-cosmic-border rounded-md p-5 flex flex-col relative overflow-hidden transition-all duration-75 hover:shadow-[0_0_0_2px_#9146FF] hover:border-transparent">
                    <h3 className="text-xs uppercase font-bold text-[#ADADB8] tracking-wider flex items-center gap-1.5 leading-none flex-shrink-0">
                      <FaPowerOff className="text-cosmic-neon w-3.5 h-3.5" />
                      Controle Lotes Ativos
                    </h3>
                    
                    <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-2.5">
                      {data?.batches.map((batch: any) => {
                        const sold = batch.totalQuantity - batch.availableQuantity;
                        const percent = Math.floor((sold / batch.totalQuantity) * 100);
                        return (
                          <div key={batch.id} className="p-3 bg-[#1F1F23]/60 rounded-md border border-cosmic-border flex justify-between items-center transition-all duration-75 hover:bg-[#1F1F23]">
                            <div className="space-y-1 pr-2 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-extrabold text-[#EFEFF1] truncate leading-none">{batch.name}</h4>
                                <span className="text-[9px] font-bold text-[#ADADB8] truncate leading-none uppercase max-w-[80px]" title={batch.eventTitle}>{batch.eventTitle}</span>
                              </div>
                              <span className="text-[10px] text-[#ADADB8] font-mono font-bold block">
                                R$ {batch.price.toFixed(2).replace('.', ',')} &bull; {sold}/{batch.totalQuantity} vendidos ({percent}%)
                              </span>
                            </div>
                            
                            <button
                              onClick={() => handleToggleBatch(batch.id, batch.isActive)}
                              className={`px-3 py-1.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all duration-75 cursor-pointer select-none active:scale-95 border ${
                                batch.isActive
                                  ? 'bg-[#00C853]/10 border-[#00C853]/30 text-[#00C853] hover:bg-[#00C853]/20'
                                  : 'bg-[#EB0400]/10 border-[#EB0400]/30 text-[#EB0400] hover:bg-[#EB0400]/20'
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
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[83vh] xl:row-span-2 bg-cosmic-slate border border-cosmic-border rounded-md p-5 flex flex-col relative overflow-hidden transition-all duration-75 hover:shadow-[0_0_0_2px_#9146FF] hover:border-transparent">
                    <h3 className="text-xs uppercase font-bold text-[#ADADB8] tracking-wider flex items-center gap-1.5 leading-none flex-shrink-0">
                      <FaAddressCard className="text-cosmic-neon w-3.5 h-3.5" />
                      Validação de Meia-Entrada
                    </h3>
                    
                    <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-3.5">
                      {data?.validationQueue.length === 0 ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-3 text-[#ADADB8]">
                          <FaUserCheck className="w-10 h-10 text-neutral-600" />
                          <p className="text-xs font-bold uppercase tracking-wider leading-none">Nenhuma pendência</p>
                          <p className="text-[10px] font-medium leading-relaxed max-w-[180px] mx-auto text-neutral-600">Todos os ingressos de estudante já foram validados ou não há compras recentes.</p>
                        </div>
                      ) : (
                        data?.validationQueue.map((ticket: any) => (
                          <div key={ticket.id} className="p-3 bg-[#1F1F23]/60 rounded-md border border-cosmic-border flex flex-col justify-between space-y-3 transition-all duration-75 hover:bg-[#1F1F23]">
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[#EFEFF1] truncate max-w-[150px]">{ticket.holderName || ticket.buyerName}</span>
                                <span className={`text-[10px] flex items-center gap-1 ${getSLAColor(ticket.secondsLeft)}`}>
                                  <FaClock className="w-3 h-3" />
                                  SLA: {formatSLA(ticket.secondsLeft)}
                                </span>
                              </div>
                              <span className="text-[9px] uppercase font-bold text-[#ADADB8] block leading-none">{ticket.batchName} &bull; {ticket.eventTitle}</span>
                              <span className="text-[10px] text-[#ADADB8] block font-mono font-medium leading-none">CPF: {ticket.holderCpf || ticket.buyerCpf}</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleValidateTicket(ticket.id, 'approve')}
                                className="flex-1 py-1.5 bg-[#00C853] hover:bg-[#00b04a] text-white rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all duration-75 flex items-center justify-center gap-1 cursor-pointer active:scale-95 border-none"
                              >
                                <FaCheck className="w-3 h-3" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleValidateTicket(ticket.id, 'reject')}
                                className="flex-1 py-1.5 bg-[#EB0400] hover:bg-[#d00300] text-white rounded-[4px] text-[10px] font-bold uppercase tracking-wider transition-all duration-75 flex items-center justify-center gap-1 cursor-pointer active:scale-95 border-none"
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
                  <div key={key} className="col-span-12 xl:col-span-4 h-[39vh] bg-cosmic-slate border border-cosmic-border rounded-md p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-75 hover:shadow-[0_0_0_2px_#9146FF] hover:border-transparent">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-cosmic-neon/5 blur-[50px] pointer-events-none" />
                    <div>
                      <h3 className="text-xs uppercase font-bold text-[#ADADB8] tracking-wider flex items-center gap-1.5 leading-none">
                        <FaUserCheck className="text-cosmic-neon w-3.5 h-3.5" />
                        Fluxo de Portaria
                      </h3>
                      
                      <div className="flex gap-4 items-center mt-5">
                        {/* Entry circular percentage indicator */}
                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="34" className="stroke-neutral-800" strokeWidth="4" fill="transparent" />
                            <circle
                              cx="40"
                              cy="40"
                              r="34"
                              className="stroke-cosmic-neon transition-all duration-75 ease-linear"
                              strokeWidth="4"
                              strokeLinecap="round"
                              fill="transparent"
                              strokeDasharray={213}
                              strokeDashoffset={
                                213 - (213 * (data?.ticketsSold > 0 ? (data.checkInsCount / data.ticketsSold) * 100 : 0)) / 100
                              }
                            />
                          </svg>
                          <span className="text-sm font-mono font-black text-[#EFEFF1] leading-none">
                            {data?.ticketsSold > 0 ? Math.floor((data.checkInsCount / data.ticketsSold) * 100) : 0}%
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-[#ADADB8] block leading-none">Pessoas no Evento</span>
                          <span className="text-xl font-mono font-black text-[#EFEFF1] block">
                            {data?.checkInsCount} <span className="text-xs font-bold text-[#ADADB8]">/ {data?.ticketsSold}</span>
                          </span>
                          <span className="text-[10px] text-[#ADADB8] block font-semibold leading-normal">Check-ins sincronizados via PWA Staff.</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-[#ADADB8] font-bold border-t border-cosmic-border pt-3 flex items-center gap-1.5 leading-none flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cosmic-neon animate-pulse" />
                      Sincronização off-line garantida pelo worker
                    </div>
                  </div>
                );
              }

              if (key === 'audit') {
                return (
                  <div key={key} className="col-span-12 xl:col-span-4 h-[39vh] bg-cosmic-slate border border-cosmic-border rounded-md p-5 flex flex-col relative overflow-hidden transition-all duration-75 hover:shadow-[0_0_0_2px_#9146FF] hover:border-transparent">
                    <h3 className="text-xs uppercase font-bold text-[#ADADB8] tracking-wider flex items-center gap-1.5 leading-none flex-shrink-0">
                      <FaWallet className="text-cosmic-neon w-3.5 h-3.5" />
                      Fluxo de Vendas Recentes
                    </h3>
                    
                    <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-2.5">
                      {!data?.recentSales || data.recentSales.length === 0 ? (
                        <div className="h-[25vh] flex flex-col items-center justify-center text-center p-4 space-y-2 text-[#ADADB8]">
                          <p className="text-[10px] font-bold uppercase tracking-wider">Nenhuma venda registrada</p>
                          <p className="text-[9px] font-medium leading-relaxed max-w-[150px] mx-auto text-neutral-600">Aguardando novos pedidos de clientes.</p>
                        </div>
                      ) : (
                        data.recentSales.map((sale: any) => (
                          <div key={sale.id} className="p-2.5 bg-[#1F1F23]/60 rounded-md border border-cosmic-border flex justify-between items-center transition-all duration-75 hover:bg-[#1F1F23]">
                            <div className="space-y-1 pr-2 min-w-0 flex-1 flex flex-col">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[11px] font-extrabold text-[#EFEFF1] truncate leading-none">{sale.buyerName}</h4>
                                <span className="text-[9px] font-mono text-[#ADADB8] shrink-0 leading-none">{sale.timestamp}</span>
                              </div>
                              <span className="text-[9px] text-[#ADADB8] font-bold block truncate leading-none">
                                {sale.batchName} &bull; {sale.eventTitle}
                              </span>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
                              <span className="text-xs font-mono font-black text-[#EFEFF1] leading-none">
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
        <div className="flex justify-between items-center text-[10px] text-neutral-600 border-t border-neutral-900/60 pt-3 flex-shrink-0">
          <span>&copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.</span>
          <span>Versão Operacional v1.2.0 (Build Produtor)</span>
        </div>
        
      </div>
    </Layout>
  );
}
