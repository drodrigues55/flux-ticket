import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaCalendarDays,
  FaClock,
  FaLocationDot,
  FaXmark,
  FaShareNodes,
  FaChevronDown,
  FaChevronUp,
  FaArrowUpRightFromSquare
} from 'react-icons/fa6';

interface Batch {
  id: string;
  name: string;
  price: number;
  sectorId?: number;
  sectorName?: string;
  meiaEntrada: boolean;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  location: string;
  batches?: Batch[];
  description?: string;
  image?: string;
}

interface EventPopupProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData | null;
  onBuy: (eventId: string, batchId?: string) => void;
}

export function EventPopup({ isOpen, onClose, event, onBuy }: EventPopupProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Sync selected batch and sector when event loads
  useEffect(() => {
    if (event?.batches && event.batches.length > 0) {
      const sorted = [...event.batches].sort((a, b) => {
        const secA = a.sectorId || 0;
        const secB = b.sectorId || 0;
        if (secB !== secA) return secB - secA;
        return (a.meiaEntrada ? 1 : 0) - (b.meiaEntrada ? 1 : 0);
      });
      const defaultBatch = sorted.find(b => !b.meiaEntrada) || sorted[0];
      setSelectedBatchId(defaultBatch.id);
      setSelectedSectorId(defaultBatch.sectorId || null);
    } else {
      setSelectedBatchId(null);
      setSelectedSectorId(null);
    }
  }, [event]);

  const sortedBatches = useMemo(() => {
    if (!event?.batches) return [];
    return [...event.batches].sort((a, b) => {
      const secA = a.sectorId || 0;
      const secB = b.sectorId || 0;
      if (secB !== secA) return secB - secA;
      return (a.meiaEntrada ? 1 : 0) - (b.meiaEntrada ? 1 : 0);
    });
  }, [event]);

  const selectedBatch = useMemo(() => {
    return event?.batches?.find(b => b.id === selectedBatchId) || null;
  }, [event, selectedBatchId]);

  const handleSvgSectorClick = (sectorId: number) => {
    setSelectedSectorId(sectorId);
    if (event?.batches) {
      const matchingBatch = event.batches.find(b => b.sectorId === sectorId && !b.meiaEntrada)
        || event.batches.find(b => b.sectorId === sectorId);
      if (matchingBatch) {
        setSelectedBatchId(matchingBatch.id);
      }
    }
  };

  const getSectorStyles = (sectorId?: number) => {
    if (sectorId === 3) {
      return { border: 'border-blue-500', text: 'text-blue-600', dot: 'bg-blue-600', activeBg: 'bg-blue-50/30' };
    }
    if (sectorId === 2) {
      return { border: 'border-red-500', text: 'text-red-600', dot: 'bg-red-600', activeBg: 'bg-red-50/30' };
    }
    return { border: 'border-purple-500', text: 'text-purple-600', dot: 'bg-purple-600', activeBg: 'bg-purple-50/30' };
  };

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const isShareBtn = target.closest('.share-btn-floating');
      if (modalRef.current && !modalRef.current.contains(target) && !isShareBtn) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Dynamically resolve sector prices from event.batches if available
  const getSectorPrice = (sectorId: number, fallbackPrice: string) => {
    if (event && event.batches && event.batches.length > 0) {
      const matchingBatch = event.batches.find(b => b.sectorId === sectorId);
      if (matchingBatch) {
        return `R$ ${Number(matchingBatch.price).toFixed(2).replace('.', ',')}`;
      }
      const minPrice = Math.min(...event.batches.map(b => Number(b.price)));
      return `R$ ${minPrice.toFixed(2).replace('.', ',')}`;
    }
    return fallbackPrice;
  };

  const getSectorName = (sectorId: number, fallbackName: string) => {
    if (event && event.batches && event.batches.length > 0) {
      const matchingBatch = event.batches.find(b => b.sectorId === sectorId);
      if (matchingBatch && matchingBatch.sectorName) {
        return matchingBatch.sectorName.toUpperCase();
      }
    }
    return fallbackName;
  };

  const sectorPrices = useMemo<Record<number, { name: string; price: string; textColor: string }>>(() => ({
    3: { name: getSectorName(3, 'PLATEIA PREMIUM'), price: getSectorPrice(3, 'R$ 160,00'), textColor: 'text-blue-600' },
    2: { name: getSectorName(2, 'PLATEIA VIP'), price: getSectorPrice(2, 'R$ 140,00'), textColor: 'text-red-600' },
    1: { name: getSectorName(1, 'PLATEIA SUPERIOR'), price: getSectorPrice(1, 'R$ 110,00'), textColor: 'text-purple-600' }
  }), [event]);

  if (!isOpen || !event) return null;

  // Placeholder fallbacks based on reference image
  const displayTitle = event.title || 'Bee Gees Alive | Anápolis';
  const displayDateStr = event.date
    ? new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    : '13 de Junho';
  const displayTime = 'Domingo às 20h00';
  const displayLocation = event.location || 'Arena Digital';
  const displayAddress = 'Av. Pinheiro Chagas, 405, Anápolis - Goiás';

  const displayDesc = event.description ||
    'Bee Gees Alive apresenta show em comemoração aos 25 anos de carreira. Espetáculo faz parte da turnê 2026 e traz novidades para o público.\n\nConsiderada a principal banda em tributo aos Bee Gees do mundo, a "Bee Gees Alive" completa 25 anos de uma trajetória emocionante e repleta de sucessos.';

  const displayImage = event.image || "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800";

  const handleBuyClick = () => {
    if (selectedBatchId) {
      onBuy(event.id, selectedBatchId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Floating Share Button Outside Card (Desktop only) */}
        <button className="share-btn-floating hidden lg:flex absolute -right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white text-blue-600 items-center justify-center shadow-lg hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all border border-neutral-200/50 cursor-pointer z-40">
          <FaShareNodes className="w-5 h-5" />
        </button>

        <div
          ref={modalRef}
          className="relative bg-white w-full max-h-full rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
        >
          {/* HEADER SECTION (DARK METALLIC / DEEP BLUE BANNER) */}
          <div className="flex-shrink-0 relative bg-gradient-to-br from-[#070D19] via-[#0D1526] to-[#172237] text-white p-5 md:py-4 md:px-6 border-b border-neutral-800">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 bg-white/10 hover:bg-white/20 p-1.5 rounded-full cursor-pointer text-white transition-all duration-200 z-30"
            >
              <FaXmark className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Header info */}
              <div className="lg:col-span-7 space-y-3.5">
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                  {displayTitle}
                </h2>

                <div className="flex flex-col md:flex-row md:items-start gap-5 pt-1">
                  {/* Date */}
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <FaCalendarDays className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block whitespace-nowrap">{displayDateStr}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Data do show</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <FaClock className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block whitespace-nowrap">{displayTime}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Horários referentes ao local do evento.</span>
                    </div>
                  </div>

                  {/* Location */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayLocation + ', ' + displayAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-slate-300 hover:text-white transition-colors group cursor-pointer"
                  >
                    <FaLocationDot className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5 group-hover:text-purple-300 transition-colors" />
                    <div>
                      <span className="font-semibold flex items-center gap-1.5 leading-tight">
                        {displayLocation}
                        <FaArrowUpRightFromSquare className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-all" />
                      </span>
                      <span className="text-[10px] text-slate-400 block leading-tight group-hover:text-slate-300 transition-colors">{displayAddress}</span>
                    </div>
                  </a>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="bg-[#2E7D32]/15 text-[#81C784] border border-[#81C784]/25 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">
                    Parcele em até 4x
                  </span>
                  <span className="bg-[#6200EE]/15 text-[#B388FF] border border-[#B388FF]/25 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">
                    Ingresso digital
                  </span>
                  <span className="bg-white/5 text-slate-400 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">
                    Compra segura
                  </span>
                  <span className="bg-white/5 text-slate-400 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">
                    Suporte 24 horas
                  </span>
                </div>
              </div>

              {/* Right Header banner image */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative rounded-xl overflow-hidden aspect-[16/9] w-full max-w-[280px] shadow-lg border border-white/10">
                  <img
                    src={displayImage}
                    alt={displayTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button className="lg:hidden bg-white hover:bg-neutral-100 text-blue-600 font-bold px-4 py-1.5 rounded-full text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-md mt-3">
                  <FaShareNodes className="w-3 h-3" />
                  COMPARTILHAR
                </button>
              </div>
            </div>
          </div>

          {/* BODY SECTION */}
          <div className="overflow-y-auto flex-grow p-5 md:p-6 space-y-6 bg-[#F8F9FA]">
            {/* Grid: Description & Quick Checkout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Description */}
              <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Descrição do evento</h3>
                  <div className="text-sm text-slate-600 space-y-2 whitespace-pre-line leading-relaxed">
                    {showFullDesc ? displayDesc : `${displayDesc.slice(0, 140)}...`}
                  </div>
                </div>
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors mt-2 w-fit"
                >
                  {showFullDesc ? (
                    <>Ver menos <FaChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Ver mais <FaChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              </div>

              {/* Price Box */}
              <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="space-y-2">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    Setor Selecionado
                  </div>
                  <h4 className="text-base font-extrabold text-slate-800 leading-tight">
                    {selectedBatch ? selectedBatch.name : 'Nenhum selecionado'}
                  </h4>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black ${selectedBatch ? getSectorStyles(selectedBatch.sectorId).text : 'text-slate-400'}`}>
                      {selectedBatch ? `R$ ${Number(selectedBatch.price).toFixed(2).replace('.', ',')}` : `A partir de ${getSectorPrice(1, 'R$ 110,00')}`}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded w-fit">
                    Parcele em até 4x sem juros
                  </div>
                </div>

                <button
                  onClick={handleBuyClick}
                  disabled={selectedBatchId === null}
                  className={`w-full py-2.5 rounded-xl font-bold transition-all text-sm block text-center mt-3 ${
                    selectedBatchId === null
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-transparent shadow-none'
                      : 'bg-[#2E7D32] hover:bg-[#1b5e20] text-white cursor-pointer hover:shadow-lg shadow-emerald-600/30 border border-transparent active:scale-[0.98]'
                  }`}
                >
                  {selectedBatchId === null ? 'Selecione um lote abaixo' : 'Comprar ingressos'}
                </button>
              </div>
            </div>

            {/* Sector Selection */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Selecione o seu ingresso</h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Batches selector list */}
                <div className="md:col-span-5 space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {sortedBatches.map(batch => {
                    const styles = getSectorStyles(batch.sectorId);
                    const isSelected = selectedBatchId === batch.id;
                    return (
                      <div
                        key={batch.id}
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setSelectedSectorId(batch.sectorId || null);
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? `${styles.border} ${styles.activeBg} shadow-sm`
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
                              {batch.sectorName || 'SETOR'}
                            </span>
                            {batch.meiaEntrada && (
                              <span className="bg-[#B388FF]/25 text-[#6200EE] px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide">
                                Meia
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-extrabold block leading-tight transition-colors ${
                            isSelected ? styles.text : 'text-slate-900'
                          }`}>
                            {batch.name}
                          </span>
                          <span className={`text-base font-black block leading-tight ${isSelected ? styles.text : 'text-slate-700'}`}>
                            R$ {Number(batch.price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? `${styles.border} bg-white`
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && (
                            <div className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Seating Map SVG */}
                <div className="md:col-span-7 flex justify-center bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                  <svg viewBox="0 0 400 240" className="w-full max-w-sm h-auto drop-shadow-md overflow-visible">
                    {/* Stage */}
                    <rect x="130" y="10" width="140" height="25" rx="6" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
                    <text x="200" y="26" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#F8FAFC" letterSpacing="1.5">PALCO</text>

                    {/* Plateia Premium */}
                    <path
                      d="M 90 90 A 240 240 0 0 1 310 90 L 325 55 A 280 280 0 0 0 75 55 Z"
                      fill="#3B82F6"
                      fillOpacity={selectedSectorId === 3 ? '0.85' : '0.15'}
                      stroke="#3B82F6"
                      strokeWidth={selectedSectorId === 3 ? '3' : '1.5'}
                      strokeDasharray={selectedSectorId === 3 ? '0' : '3 3'}
                      className="cursor-pointer transition-[fill-opacity,transform] duration-300 hover:fill-opacity-40 hover:scale-[1.01] origin-center"
                      onClick={() => handleSvgSectorClick(3)}
                    />
                    <text
                      x="200"
                      y="76"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={selectedSectorId === 3 ? '#FFFFFF' : '#1E40AF'}
                      className="pointer-events-none transition-colors duration-300"
                    >
                      {sectorPrices[3].name}
                    </text>

                    {/* Plateia VIP */}
                    <path
                      d="M 75 145 A 280 280 0 0 1 325 145 L 340 100 A 320 320 0 0 0 60 100 Z"
                      fill="#EF4444"
                      fillOpacity={selectedSectorId === 2 ? '0.85' : '0.15'}
                      stroke="#EF4444"
                      strokeWidth={selectedSectorId === 2 ? '3' : '1.5'}
                      strokeDasharray={selectedSectorId === 2 ? '0' : '3 3'}
                      className="cursor-pointer transition-[fill-opacity,transform] duration-300 hover:fill-opacity-40 hover:scale-[1.01] origin-center"
                      onClick={() => handleSvgSectorClick(2)}
                    />
                    <text
                      x="200"
                      y="126"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={selectedSectorId === 2 ? '#FFFFFF' : '#991B1B'}
                      className="pointer-events-none transition-colors duration-300"
                    >
                      {sectorPrices[2].name}
                    </text>

                    {/* Plateia Superior */}
                    <path
                      d="M 60 200 A 320 320 0 0 1 340 200 L 355 155 A 360 360 0 0 0 45 155 Z"
                      fill="#A855F7"
                      fillOpacity={selectedSectorId === 1 ? '0.85' : '0.15'}
                      stroke="#A855F7"
                      strokeWidth={selectedSectorId === 1 ? '3' : '1.5'}
                      strokeDasharray={selectedSectorId === 1 ? '0' : '3 3'}
                      className="cursor-pointer transition-[fill-opacity,transform] duration-300 hover:fill-opacity-40 hover:scale-[1.01] origin-center"
                      onClick={() => handleSvgSectorClick(1)}
                    />
                    <text
                      x="200"
                      y="181"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={selectedSectorId === 1 ? '#FFFFFF' : '#6B21A8'}
                      className="pointer-events-none transition-colors duration-300"
                    >
                      {sectorPrices[1].name}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
