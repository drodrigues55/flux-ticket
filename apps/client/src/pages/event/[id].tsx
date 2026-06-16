import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { Header } from '../../components/header';
import {
  FaCalendarDays,
  FaClock,
  FaLocationDot,
  FaShareNodes,
  FaChevronRight,
  FaArrowLeft,
  FaMinus,
  FaPlus,
  FaTag
} from 'react-icons/fa6';

interface Batch {
  id: string;
  name: string;
  price: number | string;
  sectorId?: number;
  sectorName?: string;
  meiaEntrada: boolean;
  availableQuantity: number;
  totalQuantity: number;
  isActive: boolean;
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

interface SectorOption {
  sectorId: number;
  sectorName: string;
  minPrice: number;
  maxPrice: number;
  batches: Batch[];
}

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [selectedSector, setSelectedSector] = useState<SectorOption | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showSummary, setShowSummary] = useState(false);

  // Fallback decorations matching index.tsx
  const eventImage = useMemo(() => {
    if (!eventData) return '';
    return eventData.image || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800';
  }, [eventData]);

  useEffect(() => {
    if (!id) return;
    async function loadEvent() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/events/${id}`);
        if (!res.ok) {
          throw new Error('Falha ao carregar detalhes do evento.');
        }
        const data = await res.json();
        setEventData(data);
      } catch (err: any) {
        console.error('[LOAD EVENT ERROR]', err);
        setError(err.message || 'Erro ao carregar dados do evento.');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  // Group batches into SectorOptions
  const sectors = useMemo<SectorOption[]>(() => {
    if (!eventData?.batches) return [];
    const grouped: Record<string, SectorOption> = {};
    
    eventData.batches.forEach((batch) => {
      const sId = batch.sectorId || 1;
      const sName = batch.sectorName || 'Geral';
      const key = `${sId}-${sName}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          sectorId: sId,
          sectorName: sName,
          minPrice: Number(batch.price),
          maxPrice: Number(batch.price),
          batches: [],
        };
      }
      
      grouped[key].batches.push(batch);
      const priceVal = Number(batch.price);
      if (priceVal < grouped[key].minPrice) grouped[key].minPrice = priceVal;
      if (priceVal > grouped[key].maxPrice) grouped[key].maxPrice = priceVal;
    });
    
    // Sort batches inside each sector (Inteira first, then Meia)
    Object.values(grouped).forEach(sec => {
      sec.batches.sort((a, b) => (a.meiaEntrada ? 1 : 0) - (b.meiaEntrada ? 1 : 0));
    });
    
    return Object.values(grouped).sort((a, b) => b.sectorId - a.sectorId);
  }, [eventData]);

  // Real-time calculations
  const totalQuantity = useMemo(() => {
    return Object.values(quantities).reduce((acc, q) => acc + q, 0);
  }, [quantities]);

  const totalAmount = useMemo(() => {
    const batchesList = eventData?.batches;
    if (!batchesList) return 0;
    return Object.entries(quantities).reduce((acc, [batchId, qty]) => {
      const batch = batchesList.find((b) => b.id === batchId);
      if (batch) {
        const nominalPrice = Number(batch.price);
        const tax = nominalPrice * 0.10; // 10% convenience fee
        return acc + (nominalPrice + tax) * qty;
      }
      return acc;
    }, 0);
  }, [quantities, eventData]);

  const handleQtyChange = (batchId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[batchId] || 0;
      const next = Math.max(0, Math.min(5, current + delta)); // Max 5 tickets per category
      return {
        ...prev,
        [batchId]: next,
      };
    });
  };

  const handleCheckout = () => {
    const activeItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([batchId, qty]) => `${batchId}:${qty}`);
    
    if (activeItems.length === 0) return;
    
    router.push(`/checkout/${id}?batches=${activeItems.join(',')}`);
  };

  const handleAddToCart = () => {
    if (!eventData) return;
    
    const existingCartRaw = localStorage.getItem('flux_cart');
    let cart = [];
    if (existingCartRaw) {
      try {
        cart = JSON.parse(existingCartRaw);
      } catch (e) {}
    }

    Object.entries(quantities).forEach(([batchId, qty]) => {
      if (qty <= 0) return;
      const batch = eventData.batches?.find((b) => b.id === batchId);
      if (!batch) return;

      const cartItem = {
        eventId: eventData.id,
        eventTitle: eventData.title,
        eventLocation: eventData.location,
        eventDate: eventData.date,
        eventImage: eventImage,
        batchId: batch.id,
        batchName: batch.name,
        batchPrice: Number(batch.price),
        isHalfPrice: !!batch.meiaEntrada,
        quantity: qty,
      };

      const existingIdx = cart.findIndex((item: any) => item.batchId === batchId);
      if (existingIdx > -1) {
        cart[existingIdx].quantity += qty;
      } else {
        cart.push(cartItem);
      }
    });

    localStorage.setItem('flux_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('flux_cart_updated'));
    setQuantities({});
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventData?.title || 'Flux Tickets',
          text: eventData?.description || '',
          url: window.location.href,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA] font-sans antialiased text-[#111111]">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-[#FF3200] rounded-full animate-spin" />
          <p className="text-sm font-semibold text-neutral-500">Carregando detalhes do evento...</p>
        </div>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA] font-sans antialiased text-[#111111]">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center px-6">
          <span className="text-[#FF3200] font-black text-lg">Ocorreu um erro</span>
          <p className="text-sm text-neutral-500">{error || 'Evento não encontrado.'}</p>
          <button onClick={() => router.push('/')} className="bg-[#FF3200] text-white px-6 py-2.5 rounded-full font-bold transition-all hover:bg-[#E62D00]">
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    );
  }

  // Event Meta Variables
  const displayTitle = eventData.title;
  const displayDateStr = eventData.date
    ? new Date(eventData.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Data do evento';
  const displayTime = eventData.date
    ? new Date(eventData.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '20:00';
  const displayLocation = eventData.location;
  const displayDesc = eventData.description || 'Nenhuma descrição fornecida para este evento.';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] font-sans antialiased text-[#111111] relative overflow-hidden">
      <Header />

      {/* EVENT HEADER BANNER */}
      <div className="w-full bg-white border-b border-[#EAEAEA] py-12 px-6 md:px-12 relative overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Banner Left: Details */}
          <div className="lg:col-span-8 space-y-4">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-neutral-950">
              {displayTitle}
            </h1>

            <div className="flex flex-col md:flex-row md:items-start gap-6 pt-2">
              <div className="flex items-start gap-2.5 text-neutral-600">
                <FaCalendarDays className="w-4 h-4 text-[#FF3200] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-sm block text-neutral-800">{displayDateStr}</span>
                  <span className="text-[10px] text-neutral-400 block leading-tight">Data do show</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-neutral-600">
                <FaClock className="w-4 h-4 text-[#FF3200] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-sm block text-neutral-800">às {displayTime}h</span>
                  <span className="text-[10px] text-neutral-400 block leading-tight">Horário local</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-neutral-600">
                <FaLocationDot className="w-4 h-4 text-[#FF3200] shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-sm block leading-tight text-neutral-800">{displayLocation}</span>
                  <span className="text-[10px] text-neutral-400 block leading-tight">Local presencial</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              <span className="bg-neutral-50 text-neutral-700 border border-[#EAEAEA] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Parcele em até 12x
              </span>
              <span className="bg-neutral-50 text-neutral-700 border border-[#EAEAEA] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Ingresso Digital
              </span>
              <span className="bg-neutral-50 text-neutral-700 border border-[#EAEAEA] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Compra Segura
              </span>
            </div>
          </div>

          {/* Banner Right: Poster Flyer */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="relative rounded-2xl overflow-hidden aspect-[16/9] w-full max-w-[320px] shadow-sm border border-[#EAEAEA]">
              <img
                src={eventImage}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={handleShare}
              className="bg-white hover:bg-neutral-50 text-[#FF3200] border border-[#EAEAEA] font-bold px-6 py-2.5 rounded-full text-xs inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm mt-4"
            >
              <FaShareNodes className="w-3.5 h-3.5" />
              COMPARTILHAR
            </button>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT BODY */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 flex-grow w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Description */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-neutral-900">Descrição do evento</h2>
            <div className="text-sm text-neutral-700 whitespace-pre-line leading-relaxed">
              {showFullDesc ? displayDesc : `${displayDesc.slice(0, 320)}...`}
            </div>
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-[#FF3200] hover:text-[#E62D00] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors pt-2 border-none bg-transparent"
            >
              {showFullDesc ? 'Ver menos' : 'Ver mais'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-sm space-y-3">
            <h3 className="text-base font-bold text-neutral-900">:: INGRESSOS</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Adquira seus ingressos oficiais através da nossa plataforma com total segurança. A reserva de cotas garante o seu ingresso pelo período indicado de 3 minutos no checkout para finalizar o pagamento de forma protegida.
            </p>
          </div>
        </section>

        {/* Right Column: Ticket Selector Card (Sticky) */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-sm overflow-hidden flex flex-col justify-between">
            
            {/* Header selection state */}
            <div className="p-5 border-b border-[#EAEAEA] bg-neutral-50 flex items-center justify-between">
              {selectedSector ? (
                <button
                  onClick={() => setSelectedSector(null)}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <FaArrowLeft className="w-3 h-3" />
                  <span>Voltar</span>
                </button>
              ) : (
                <span className="text-sm font-bold text-neutral-800">Escolha uma opção</span>
              )}
              {selectedSector && (
                <span className="text-xs font-bold uppercase text-[#FF3200] tracking-wider">
                  {selectedSector.sectorName}
                </span>
              )}
            </div>

            {/* Content Selection list */}
            <div className="p-5 min-h-[200px] max-h-[360px] overflow-y-auto space-y-3">
              {!selectedSector ? (
                // State 1: Sector list options
                sectors.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-8">Nenhum lote de ingresso ativo disponível.</p>
                ) : (
                  sectors.map((sec) => (
                    <div
                      key={`${sec.sectorId}-${sec.sectorName}`}
                      onClick={() => setSelectedSector(sec)}
                      className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">SETOR</span>
                        <h4 className="font-bold text-sm text-neutral-900 group-hover:text-[#FF3200] transition-colors leading-tight">
                          {sec.sectorName}
                        </h4>
                        <span className="text-xs text-neutral-500 font-bold block">
                          R$ {sec.minPrice.toFixed(2).replace('.', ',')} a R$ {sec.maxPrice.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <FaChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#FF3200] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))
                )
              ) : (
                // State 2: Detailed Ticket list
                selectedSector.batches.map((batch) => {
                  const qty = quantities[batch.id] || 0;
                  const isSoldOut = batch.availableQuantity <= 0 || !batch.isActive;
                  const priceNum = Number(batch.price);
                  const taxNum = priceNum * 0.10;

                  return (
                    <div
                      key={batch.id}
                      className="p-4 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                              {batch.name}
                            </span>
                            {batch.meiaEntrada && (
                              <span className="bg-[#FF3200]/10 text-[#FF3200] border border-[#FF3200]/20 text-[9px] px-1 py-0.2 rounded font-bold tracking-wide uppercase">
                                Meia
                              </span>
                            )}
                          </div>
                          <span className="text-base font-black text-neutral-900 block leading-tight">
                            R$ {priceNum.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] text-neutral-500 block font-semibold">
                            (+ R$ {taxNum.toFixed(2).replace('.', ',')} taxa de serviço)
                          </span>
                        </div>

                        {/* Sold Out badge vs Qty Selector */}
                        {isSoldOut ? (
                          <span className="text-xs font-bold text-neutral-400 uppercase py-1.5 px-3 bg-neutral-200/50 rounded-lg">
                            Esgotado
                          </span>
                        ) : (
                          <div className="flex items-center gap-2.5 bg-neutral-200/50 px-2.5 py-1.5 rounded-lg select-none">
                            <button
                                onClick={() => handleQtyChange(batch.id, -1)}
                                className="text-neutral-600 hover:text-neutral-900 font-bold text-xs cursor-pointer focus:outline-none border-none bg-transparent px-1"
                              >
                                <FaMinus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-xs font-bold text-neutral-900 w-4 text-center">{qty}</span>
                              <button
                                onClick={() => handleQtyChange(batch.id, 1)}
                                className="text-neutral-600 hover:text-neutral-900 font-bold text-xs cursor-pointer focus:outline-none border-none bg-transparent px-1"
                              >
                                <FaPlus className="w-2.5 h-2.5" />
                              </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between text-[9px] text-neutral-400 pt-1 border-t border-[#EAEAEA]">
                        <span>Lote digital ativo</span>
                        <span>Vendas online</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom summary and Action Panel */}
            <div className="p-5 border-t border-[#EAEAEA] bg-neutral-50/50 space-y-4">
              
              {/* Order total info */}
              <div className="flex justify-between items-baseline">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-500 uppercase">Total do Pedido</span>
                  {totalQuantity > 0 && (
                    <button
                      onClick={() => setShowSummary(!showSummary)}
                      className="text-[10px] text-[#FF3200] hover:text-[#E62D00] font-bold block border-none bg-transparent cursor-pointer p-0"
                    >
                      {showSummary ? 'Ver menos resumo ▲' : 'Ver resumo do pedido ▼'}
                    </button>
                  )}
                </div>
                <span className="text-2xl font-black text-neutral-900">
                  R$ {totalAmount.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {/* Collapsible itemized summary drawer */}
              {showSummary && totalQuantity > 0 && (
                <div className="p-3 bg-white rounded-xl text-xs space-y-2 border border-[#EAEAEA] animate-in slide-in-from-bottom-2 duration-200 shadow-sm">
                  {Object.entries(quantities).map(([batchId, qty]) => {
                    if (qty <= 0) return null;
                    const batch = eventData.batches?.find(b => b.id === batchId);
                    if (!batch) return null;
                    const priceNum = Number(batch.price);
                    const taxNum = priceNum * 0.10;
                    return (
                      <div key={batchId} className="flex justify-between text-neutral-700 leading-snug">
                        <span>{qty}x {batch.name} {batch.meiaEntrada ? '(Meia)' : ''}</span>
                        <span className="font-semibold text-neutral-950">
                          R$ {((priceNum + taxNum) * qty).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-[#EAEAEA] flex justify-between text-[10px] text-neutral-400">
                    <span>Incluso: 10% Conveniência</span>
                    <span className="font-bold">Taxa inclusa</span>
                  </div>
                </div>
              )}

              {/* Coupon discount link */}
              <button className="flex items-center gap-1.5 text-xs text-[#FF3200] hover:text-[#E62D00] font-bold border-none bg-transparent cursor-pointer p-0 transition-colors">
                <FaTag className="w-3.5 h-3.5" />
                <span>Inserir cupom de desconto</span>
              </button>

              {/* Bottom Buttons Action */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleCheckout}
                  disabled={totalQuantity === 0}
                  className={`w-full py-3.5 text-white font-bold rounded-full text-sm text-center border-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    totalQuantity > 0
                      ? 'bg-[#FF3200] hover:bg-[#E62D00] active:scale-[0.98]'
                      : 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
                  }`}
                >
                  {totalQuantity > 0 && (
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
                      {totalQuantity}
                    </span>
                  )}
                  <span>Comprar Ingressos</span>
                </button>

                {totalQuantity > 0 && (
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-2.5 rounded-full font-bold transition-all text-xs text-center border border-[#FF3200] text-[#FF3200] bg-transparent hover:bg-[#FF3200]/5 cursor-pointer active:scale-[0.98]"
                  >
                    Adicionar ao Carrinho
                  </button>
                )}

                {/* Auxiliary back button in detail view */}
                {selectedSector && (
                  <button
                    onClick={() => setSelectedSector(null)}
                    className="w-full py-2.5 text-neutral-500 hover:text-neutral-800 font-bold rounded-xl text-xs transition-colors border-none bg-transparent cursor-pointer"
                  >
                    Adicionar mais itens
                  </button>
                )}
              </div>
            </div>

          </div>
        </aside>

      </main>

      {/* FOOTER */}
      <footer className="py-8 text-center text-neutral-400 text-xs border-t border-[#EAEAEA] max-w-6xl mx-auto w-full mt-12">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}
