import { useEffect, useRef, useState } from 'react';
import {
  FaCalendarDays,
  FaClock,
  FaLocationDot,
  FaCreditCard,
  FaShieldHalved,
  FaTicket,
  FaHeadset,
  FaXmark,
  FaShareNodes,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa6';

interface Batch {
  id: string;
  name: string;
  price: number; // in cents
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
  const [selectedSector, setSelectedSector] = useState<'PREMIUM' | 'VIP' | 'SUPERIOR'>('PREMIUM');

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

  // Check pricing
  const minPrice = 110;
  const maxPrice = 320;

  // Selected Sector details
  const sectorPrices = {
    PREMIUM: { range: 'R$ 160,00 e R$ 320,00', color: '#3B82F6' },
    VIP: { range: 'R$ 140,00 e R$ 280,00', color: '#EF4444' },
    SUPERIOR: { range: 'R$ 110,00 e R$ 220,00', color: '#A855F7' }
  };

  const handleBuyClick = () => {
    // If dynamic batches are available, pick the matching one or first
    const selectedBatch = event.batches?.find(b => b.name.toUpperCase().includes(selectedSector));
    onBuy(event.id, selectedBatch?.id);
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
              <FaXmark className="w-4.5 h-4.5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Header info */}
              <div className="lg:col-span-7 space-y-3.5">
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight leading-tight">
                  {displayTitle}
                </h2>

                <div className="flex flex-col md:flex-row md:items-start gap-5 pt-1">
                  {/* Date */}
                  <div className="flex items-start gap-2 text-xs.5 text-slate-300">
                    <FaCalendarDays className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block whitespace-nowrap">{displayDateStr}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Data do show</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-start gap-2 text-xs.5 text-slate-300">
                    <FaClock className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block whitespace-nowrap">{displayTime}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Horários referentes ao local do evento.</span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-xs.5 text-slate-300">
                    <FaLocationDot className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block whitespace-nowrap">{displayLocation}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">{displayAddress}</span>
                    </div>
                  </div>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm space-y-3.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Descrição do evento</h3>
                  <div className="text-sm text-slate-600 space-y-2 whitespace-pre-line leading-relaxed">
                    {showFullDesc ? displayDesc : `${displayDesc.slice(0, 140)}...`}
                  </div>
                </div>
                <button
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors mt-2"
                >
                  {showFullDesc ? (
                    <>Ver menos <FaChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Ver mais <FaChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              </div>

              {/* Price Box */}
              <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <FaTicket className="w-3.5 h-3.5 text-emerald-500" />
                    <span>PREÇO DOS INGRESSOS</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 leading-normal">
                    R$ {minPrice.toFixed(2).replace('.', ',')} e R$ {maxPrice.toFixed(2).replace('.', ',')}
                  </h4>
                  <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded w-fit">
                    Parcele em até 4x
                  </p>
                </div>

                <button
                  onClick={handleBuyClick}
                  className="bg-[#4CAF50] hover:bg-[#43A047] text-white w-full py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] mt-4 text-sm cursor-pointer"
                >
                  Comprar ingressos
                </button>
              </div>
            </div>

            {/* Sector Selection */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Selecione um setor</h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Sector selector buttons */}
                <div className="md:col-span-5 space-y-3.5">
                  {[
                    { id: 'PREMIUM' as const, label: 'PLATEIA PREMIUM', priceRange: 'R$ 160,00 e R$ 320,00', border: 'border-blue-500', activeBg: 'bg-blue-50/20' },
                    { id: 'VIP' as const, label: 'PLATEIA VIP', priceRange: 'R$ 140,00 e R$ 280,00', border: 'border-red-500', activeBg: 'bg-red-50/20' },
                    { id: 'SUPERIOR' as const, label: 'PLATEIA SUPERIOR', priceRange: 'R$ 110,00 e R$ 220,00', border: 'border-purple-500', activeBg: 'bg-purple-50/20' }
                  ].map(sector => (
                    <div
                      key={sector.id}
                      onClick={() => setSelectedSector(sector.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectedSector === sector.id
                        ? `${sector.border} ${sector.activeBg} shadow-sm`
                        : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-sm text-slate-900 block">{sector.label}</span>
                        <span className="text-xs text-slate-500 block">Preços entre {sector.priceRange}</span>
                        <span className="text-[10px] text-emerald-600 font-bold block">Pague em até 12x</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedSector === sector.id ? 'border-blue-600' : 'border-slate-300'
                        }`}>
                        {selectedSector === sector.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Seating Map SVG */}
                <div className="md:col-span-7 flex justify-center bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
                  <svg viewBox="0 0 400 240" className="w-full max-w-sm h-auto drop-shadow-md">
                    {/* Stage */}
                    <rect x="130" y="10" width="140" height="25" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
                    <text x="200" y="26" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#64748B" letterSpacing="1">PALCO</text>

                    {/* Plateia Premium */}
                    <path
                      d="M 90 90 A 240 240 0 0 1 310 90 L 325 55 A 280 280 0 0 0 75 55 Z"
                      fill={selectedSector === 'PREMIUM' ? '#60A5FA' : '#93C5FD/40'}
                      stroke={selectedSector === 'PREMIUM' ? '#2563EB' : '#93C5FD/70'}
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => setSelectedSector('PREMIUM')}
                    />
                    <text x="200" y="76" textAnchor="middle" fontSize="9" fontWeight="bold" fill={selectedSector === 'PREMIUM' ? '#1E3A8A' : '#1E3A8A/50'} className="pointer-events-none">PLATEIA PREMIUM</text>

                    {/* Plateia VIP */}
                    <path
                      d="M 75 145 A 280 280 0 0 1 325 145 L 340 100 A 320 320 0 0 0 60 100 Z"
                      fill={selectedSector === 'VIP' ? '#F87171' : '#FCA5A5/40'}
                      stroke={selectedSector === 'VIP' ? '#DC2626' : '#FCA5A5/70'}
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => setSelectedSector('VIP')}
                    />
                    <text x="200" y="126" textAnchor="middle" fontSize="9" fontWeight="bold" fill={selectedSector === 'VIP' ? '#7F1D1D' : '#7F1D1D/50'} className="pointer-events-none">PLATEIA VIP</text>

                    {/* Plateia Superior */}
                    <path
                      d="M 60 200 A 320 320 0 0 1 340 200 L 355 155 A 360 360 0 0 0 45 155 Z"
                      fill={selectedSector === 'SUPERIOR' ? '#C084FC' : '#E9D5FF/40'}
                      stroke={selectedSector === 'SUPERIOR' ? '#9333EA' : '#E9D5FF/70'}
                      strokeWidth="1.5"
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => setSelectedSector('SUPERIOR')}
                    />
                    <text x="200" y="181" textAnchor="middle" fontSize="9" fontWeight="bold" fill={selectedSector === 'SUPERIOR' ? '#581C87' : '#581C87/50'} className="pointer-events-none">PLATEIA SUPERIOR</text>
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
