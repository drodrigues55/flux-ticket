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
  onBuy: (eventId: string, batchId?: string, quantity?: number) => void;
}

export function EventPopup({ isOpen, onClose, event, onBuy }: EventPopupProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

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
      setQuantity(1);
    } else {
      setSelectedBatchId(null);
      setSelectedSectorId(null);
      setQuantity(1);
    }
  }, [event]);

  // Reset quantity when batch changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedBatchId]);

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
      return { border: 'border-blue-500', text: 'text-blue-400', dot: 'bg-blue-500', activeBg: 'bg-blue-500/10' };
    }
    if (sectorId === 2) {
      return { border: 'border-red-500', text: 'text-red-400', dot: 'bg-red-500', activeBg: 'bg-red-500/10' };
    }
    return { border: 'border-[#9146FF]', text: 'text-[#B388FF]', dot: 'bg-[#9146FF]', activeBg: 'bg-[#9146FF]/10' };
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
      onBuy(event.id, selectedBatchId, quantity);
    }
  };

  const handleAddToCart = () => {
    if (!event || !selectedBatch) return;

    const cartItem = {
      eventId: event.id,
      eventTitle: displayTitle,
      eventLocation: displayLocation,
      eventDate: event.date,
      eventImage: displayImage,
      batchId: selectedBatch.id,
      batchName: selectedBatch.name,
      batchPrice: Number(selectedBatch.price),
      isHalfPrice: !!selectedBatch.meiaEntrada,
      quantity,
    };

    const existingCartRaw = localStorage.getItem('flux_cart');
    let cart = [];
    if (existingCartRaw) {
      try {
        cart = JSON.parse(existingCartRaw);
      } catch (e) {}
    }

    const itemIndex = cart.findIndex((item: any) => item.batchId === selectedBatch.id);
    if (itemIndex > -1) {
      cart[itemIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem('flux_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('flux_cart_updated'));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in duration-200">
        {/* Floating Share Button Outside Card (Desktop only) */}
        <button className="share-btn-floating hidden lg:flex absolute -right-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#18181B] text-[#B388FF] items-center justify-center shadow-lg hover:bg-[#252528] hover:text-[#9146FF] hover:scale-105 active:scale-95 transition-all border border-white/10 cursor-pointer z-40">
          <FaShareNodes className="w-5 h-5" />
        </button>

        <div
          ref={modalRef}
          className="relative bg-[#080D1A] w-full max-h-full rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 text-white animate-in zoom-in-95 duration-200"
        >
          {/* HEADER SECTION (DARK METALLIC / DEEP BLUE BANNER) */}
          <div className="flex-shrink-0 relative bg-gradient-to-br from-[#070D19] via-[#0D1526] to-[#172237] text-white p-5 md:py-4 md:px-6 border-b border-white/5">
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
                    <FaCalendarDays className="w-3.5 h-3.5 text-[#B388FF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block whitespace-nowrap">{displayDateStr}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">Data do show</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-start gap-2 text-sm text-slate-300">
                    <FaClock className="w-3.5 h-3.5 text-[#B388FF] shrink-0 mt-0.5" />
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
                    <FaLocationDot className="w-3.5 h-3.5 text-[#B388FF] shrink-0 mt-0.5 group-hover:text-purple-300 transition-colors" />
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
                  <span className="bg-[#9146FF]/15 text-[#B388FF] border border-[#B388FF]/25 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase">
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
                <button className="lg:hidden bg-[#18181B] hover:bg-[#252528] text-[#B388FF] border border-white/10 font-bold px-4 py-1.5 rounded-full text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-md mt-3">
                  <FaShareNodes className="w-3 h-3" />
                  COMPARTILHAR
                </button>
              </div>
            </div>
          </div>

          {/* BODY SECTION */}
          <div className="overflow-y-auto flex-grow p-5 md:p-6 space-y-6 bg-[#03060B]">
            {/* Description - Full Width */}
            <div className="bg-[#0D1526]/80 p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between w-full">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Descrição do evento</h3>
                <div className="text-sm text-slate-350 whitespace-pre-line leading-relaxed">
                  {showFullDesc ? displayDesc : `${displayDesc.slice(0, 180)}...`}
                </div>
              </div>
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-[#B388FF] hover:text-[#9146FF] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors mt-2 w-fit border-none bg-transparent"
              >
                {showFullDesc ? (
                  <>Ver menos <FaChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Ver mais <FaChevronDown className="w-3 h-3" /></>
                )}
              </button>
            </div>

            {/* Sector Selection (Two-Column Layout below description) */}
            <div className="bg-[#0D1526]/80 p-5 rounded-2xl border border-white/10 shadow-lg space-y-4 w-full">
              <h3 className="text-base font-bold text-white">Selecione o seu ingresso</h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Batches selector list */}
                <div className="lg:col-span-5 space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
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
                            ? `${styles.border} bg-[#9146FF]/10 shadow-sm`
                            : 'border-white/5 bg-[#080D1A]/50 hover:border-white/10 hover:bg-[#080D1A]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
                              {batch.sectorName || 'SETOR'}
                            </span>
                            {batch.meiaEntrada && (
                              <span className="bg-[#B388FF]/25 text-[#B388FF] px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border border-[#B388FF]/15">
                                Meia
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-extrabold block leading-tight transition-colors ${
                            isSelected ? styles.text : 'text-white'
                          }`}>
                            {batch.name}
                          </span>
                          <span className={`text-base font-black block leading-tight ${isSelected ? styles.text : 'text-slate-350'}`}>
                            R$ {Number(batch.price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? `${styles.border} bg-transparent`
                            : 'border-white/10 bg-transparent'
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
                <div className="lg:col-span-7 flex justify-center bg-[#080D1A]/50 p-6 rounded-2xl border border-dashed border-white/10">
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
                      fill={selectedSectorId === 3 ? '#FFFFFF' : '#60A5FA'}
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
                      fill={selectedSectorId === 2 ? '#FFFFFF' : '#F87171'}
                      className="pointer-events-none transition-colors duration-300"
                    >
                      {sectorPrices[2].name}
                    </text>

                    {/* Plateia Superior */}
                    <path
                      d="M 60 200 A 320 320 0 0 1 340 200 L 355 155 A 360 360 0 0 0 45 155 Z"
                      fill="#9146FF"
                      fillOpacity={selectedSectorId === 1 ? '0.85' : '0.15'}
                      stroke="#9146FF"
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
                      fill={selectedSectorId === 1 ? '#FFFFFF' : '#C084FC'}
                      className="pointer-events-none transition-colors duration-300"
                    >
                      {sectorPrices[1].name}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
            </div>

          {/* Floating Checkout Drawer Overlay (Popup on top of popup) */}
          {selectedBatch && (
            <div className="absolute top-4 right-4 w-96 bg-[#18181B]/95 border border-white/15 backdrop-blur-md shadow-2xl rounded-3xl p-5 z-40 transition-all duration-300 ease-out animate-in slide-in-from-top-5 flex flex-col justify-between max-w-sm text-white">
              <div className="space-y-2 relative">
                {/* Close Selection Button */}
                <button
                  onClick={() => {
                    setSelectedBatchId(null);
                    setSelectedSectorId(null);
                  }}
                  className="absolute -top-1.5 -right-1 text-slate-400 hover:text-white p-1 border-none bg-transparent cursor-pointer transition-colors"
                >
                  <FaXmark className="w-4 h-4" />
                </button>

                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-none">
                  Setor Selecionado
                </div>
                <h4 className="text-base font-extrabold text-white leading-tight pr-4">
                  {selectedBatch.name}
                </h4>
                
                <div className="flex items-center justify-between py-2.5 border-t border-b border-white/5 my-3">
                  <span className="text-xs font-bold text-slate-400 uppercase">Quantidade</span>
                  <div className="flex items-center gap-3 bg-[#0D1526]/80 px-3 py-1.5 rounded-xl select-none">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="text-slate-300 hover:text-white font-bold text-base cursor-pointer focus:outline-none border-none bg-transparent px-1"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-white w-4 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.min(5, prev + 1))}
                      className="text-slate-300 hover:text-white font-bold text-base cursor-pointer focus:outline-none border-none bg-transparent px-1"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Total do Pedido</span>
                  <span className={`text-2xl font-black ${getSectorStyles(selectedBatch.sectorId).text}`}>
                    R$ {(Number(selectedBatch.price) * quantity).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-fit mt-1 border border-emerald-500/20">
                  Parcele em até 4x sem juros
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4 w-full">
                <button
                  onClick={handleBuyClick}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-sm text-center cursor-pointer hover:shadow-lg shadow-emerald-500/20 border border-transparent active:scale-[0.98]"
                >
                  Comprar Agora
                </button>
                <button
                  onClick={handleAddToCart}
                  className="w-full py-2.5 rounded-xl font-bold transition-all text-sm block text-center border-2 border-[#9146FF] text-[#B388FF] bg-transparent hover:bg-[#9146FF]/10 cursor-pointer active:scale-[0.98]"
                >
                  Adicionar ao Carrinho
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
