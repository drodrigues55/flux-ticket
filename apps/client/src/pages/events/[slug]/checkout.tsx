import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Header } from '../../../components/header';
import { FaClock, FaTicket, FaCreditCard, FaLock, FaPix } from 'react-icons/fa6';
import { formatPaymentError } from '../../../lib/payment-errors';

interface ApiError {
  message: string;
}

export default function EventCheckoutPage() {
  const router = useRouter();
  const { slug, reservationId, eventId, batchId, quantity } = router.query as {
    slug: string;
    reservationId: string;
    eventId: string;
    batchId: string;
    quantity: string;
  };

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Expiration countdown (3 minutes / 180 seconds)
  const [timeLeft, setTimeLeft] = useState(180);

  // Buyer Info
  const [buyerName, setBuyerName] = useState('');
  const [email, setEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('pix');

  // Card Info
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // PIX Response states
  const [pixCode, setPixCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending_pix' | 'success' | 'failed'>('idle');
  const [orderId, setOrderId] = useState('');
  const [checkoutTicketIds, setCheckoutTicketIds] = useState<string[]>([]);
  const [expirationStatus, setExpirationStatus] = useState<'active' | 'checking' | 'available' | 'unavailable'>('active');

  const cleanCpf = buyerCpf.replace(/\D/g, '');
  const buyerInfoComplete = buyerName.trim().length >= 3 && email.trim().length > 0 && cleanCpf.length >= 11;
  const paymentInfoComplete = paymentMethod === 'pix' || (cardNumber.trim() && cardholderName.trim() && cardExpiry.trim() && cardCvc.trim());
  const isCheckoutCompact = Boolean(buyerInfoComplete && paymentInfoComplete);
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 180) * 100));

  useEffect(() => {
    if (!slug) return;
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/public/events/${slug}`);
        const data = await res.json();
        setEvent(data.data || data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [slug]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft > 0 || expirationStatus !== 'active') return;

    let cancelled = false;
    setExpirationStatus('checking');

    async function checkAvailability() {
      let available = false;
      try {
        const res = await fetch(`/api/public/events/${slug}/tickets`);
        if (res.ok) {
          const ticketTypes = await res.json();
          const batches = (Array.isArray(ticketTypes) ? ticketTypes : []).flatMap((ticketType: any) => ticketType.batches || []);
          available = batches.some((batch: any) => {
            const matchesBatch = batchId ? batch.id === batchId : true;
            return matchesBatch && Number(batch.availableQuantity) > 0;
          });
        }
      } catch (err) {
        console.error('[EXPIRED AVAILABILITY CHECK ERROR]', err);
      }

      window.setTimeout(() => {
        if (!cancelled) setExpirationStatus(available ? 'available' : 'unavailable');
      }, 5000);
    }

    checkAvailability();

    return () => {
      cancelled = true;
    };
  }, [batchId, expirationStatus, slug, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goBackToPreviousScreen = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(slug ? `/events/${slug}` : '/events');
  };

  const scrollToTopEased = () => new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const startY = window.scrollY;
    if (startY <= 0) {
      resolve();
      return;
    }

    const duration = 650;
    const start = performance.now();
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      window.scrollTo(0, startY * (1 - easeInOut(progress)));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(step);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft <= 0) {
      setError({ message: 'A reserva expirou. Por favor, volte e selecione os ingressos novamente.' });
      return;
    }

    setSaving(true);
    setError(null);

    const paymentMethodPayload: any = { method: paymentMethod };
    if (paymentMethod === 'credit_card') {
      paymentMethodPayload.token = 'mock-card-token-' + Math.random().toString(36).substring(2);
      paymentMethodPayload.installments = 1;
      paymentMethodPayload.issuerId = 'visa';
      paymentMethodPayload.email = email;
    }

    const payload = {
      reservationId,
      buyerName,
      email,
      buyerCpf: cleanCpf,
      paymentMethod: paymentMethodPayload,
      holders: Array.from({ length: Number(quantity) }).map(() => ({
        name: buyerName,
        cpf: cleanCpf,
      })),
    };

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw { message: formatPaymentError(json, 'Erro ao processar o pagamento.') };

      const ticketIds = Array.isArray(json.ticketIds)
        ? json.ticketIds
        : typeof json.ticketId === 'string'
          ? json.ticketId.split(',').filter(Boolean)
          : [];
      const nextOrderId = json.orderId || '';
      setOrderId(nextOrderId);
      setCheckoutTicketIds(ticketIds);
      if (paymentMethod === 'pix') {
        setPixCode(json.pixCode || json.qrCode || '00020126360014br.gov.bcb.pix...');
        setPixQrBase64(json.pixQrBase64 || json.qrCodeBase64 || '');
        setPaymentStatus('pending_pix');
      } else {
        await scrollToTopEased();
        if (nextOrderId) {
          router.push(`/orders/${nextOrderId}/confirmation?ticketId=${ticketIds.join(',')}`);
        } else {
          router.push(`/checkout/success?ticketId=${ticketIds.join(',')}`);
        }
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSimulatePixPaid = () => {
    scrollToTopEased().then(() => {
      if (orderId) {
        router.push(`/orders/${orderId}/confirmation?ticketId=${checkoutTicketIds.join(',')}`);
      } else {
        router.push(`/checkout/success?ticketId=${checkoutTicketIds.join(',')}`);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#03060B] text-white">
        <Header />
        <div className="p-12 text-center text-neutral-400 text-sm">Carregando checkout...</div>
      </div>
    );
  }

  if (timeLeft <= 0) {
    const isChecking = expirationStatus === 'checking';
    const isAvailable = expirationStatus === 'available';
    return (
      <div className="min-h-screen bg-[#03060B] text-white flex flex-col justify-center items-center p-6 space-y-5">
        <FaClock className={isAvailable ? 'text-amber-400 text-5xl' : 'text-red-500 text-5xl'} />
        <div className="space-y-2 text-center max-w-md">
          <h1 className="text-xl font-bold">Tempo Expirado</h1>
          <p className="text-neutral-400 text-sm">
            {isChecking
              ? 'Estamos verificando se o ingresso ainda está disponível.'
              : isAvailable
                ? 'Ainda há ingressos disponíveis. Volte para a tela anterior e faça uma nova reserva.'
                : 'Não encontramos disponibilidade para este ingresso no momento.'}
          </p>
        </div>
        {isChecking && <div className="w-8 h-8 border-4 border-white/10 border-t-[#FF3200] rounded-full animate-spin" />}
        <Button onClick={goBackToPreviousScreen}>Voltar para a tela anterior</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <Header />

      <main className={`flex-grow max-w-4xl mx-auto px-6 w-full z-10 ${isCheckoutCompact ? 'py-5 space-y-4' : 'py-12 space-y-6'}`}>
        {isCheckoutCompact && (
          <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/10 overflow-hidden">
            <div className="h-1.5 bg-white/10">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 60 ? 'bg-amber-400' : 'bg-[#FF3200]'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-amber-400">
              <span>Reserva ativa</span>
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className={isCheckoutCompact ? 'text-xl font-bold' : 'text-2xl font-bold'}>Finalizar Compra</h1>
          {!isCheckoutCompact && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded text-amber-500 text-xs font-bold px-3 py-1">
              <FaClock />
              <span>Reserva expira em: {formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {paymentStatus === 'pending_pix' ? (
          <Card className="p-6 bg-neutral-900 border border-white/10 rounded-2xl text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Pagamento PIX Gerado</h2>
              <p className="text-xs text-neutral-400">Escaneie o QR code ou copie a chave Pix abaixo para concluir.</p>
            </div>
            
            {pixQrBase64 && (
              <div className="w-48 h-48 bg-white p-2 rounded-lg mx-auto flex items-center justify-center">
                <img src={`data:image/png;base64,${pixQrBase64}`} alt="QR Code" className="w-full h-full" />
              </div>
            )}

            <div className="bg-neutral-950 p-3 rounded border border-white/5 text-xs font-mono break-all text-neutral-400">
              {pixCode}
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <Button onClick={handleSimulatePixPaid} className="w-full">Confirmar Pagamento Simulado</Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className={`grid grid-cols-1 md:grid-cols-3 ${isCheckoutCompact ? 'gap-4' : 'gap-6'}`}>
            <div className={`md:col-span-2 ${isCheckoutCompact ? 'space-y-4' : 'space-y-6'}`}>
              {/* Buyer info card */}
              <Card className={`${isCheckoutCompact ? 'p-4' : 'p-6'} bg-neutral-900 border border-white/10 rounded-2xl space-y-4`}>
                <h3 className={isCheckoutCompact ? 'text-base font-bold' : 'text-lg font-bold'}>Dados do Comprador</h3>
                <div className={isCheckoutCompact ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : 'space-y-3'}>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-400">Nome Completo</span>
                    <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-400">E-mail</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-neutral-400">CPF</span>
                    <input type="text" value={buyerCpf} onChange={e => setBuyerCpf(e.target.value)} required placeholder="000.000.000-00" className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                  </label>
                </div>
              </Card>

              {/* Payment selection */}
              <Card className={`${isCheckoutCompact ? 'p-4' : 'p-6'} bg-neutral-900 border border-white/10 rounded-2xl space-y-4`}>
                <h3 className={isCheckoutCompact ? 'text-base font-bold' : 'text-lg font-bold'}>Forma de Pagamento</h3>
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border font-bold text-sm cursor-pointer ${
                      paymentMethod === 'pix' ? 'border-[#FF3200] bg-[#FF3200]/5 text-[#FF3200]' : 'border-white/10 bg-transparent text-neutral-400'
                    }`}
                  >
                    <FaPix /> Pix
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border font-bold text-sm cursor-pointer ${
                      paymentMethod === 'credit_card' ? 'border-[#FF3200] bg-[#FF3200]/5 text-[#FF3200]' : 'border-white/10 bg-transparent text-neutral-400'
                    }`}
                  >
                    <FaCreditCard /> Cartão de Crédito
                  </button>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className={isCheckoutCompact ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3' : 'space-y-3 pt-3'}>
                    <label className={isCheckoutCompact ? 'block space-y-1 sm:col-span-2' : 'block space-y-1'}>
                      <span className="text-xs font-bold text-neutral-400">Número do Cartão</span>
                      <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-neutral-400">Nome no Cartão</span>
                      <input type="text" value={cardholderName} onChange={e => setCardholderName(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                    </label>
                    <div className={isCheckoutCompact ? 'grid grid-cols-2 gap-3 sm:col-span-2' : 'grid grid-cols-2 gap-4'}>
                      <label className="block space-y-1">
                        <span className="text-xs font-bold text-neutral-400">Validade</span>
                        <input type="text" placeholder="MM/AA" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-bold text-neutral-400">CVV</span>
                        <input type="text" value={cardCvc} onChange={e => setCardCvc(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                      </label>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Event Overview Sidebar */}
            <div className="space-y-4">
              <Card className={`${isCheckoutCompact ? 'p-4 space-y-3 md:sticky md:top-4' : 'p-6 space-y-4'} bg-neutral-900 border border-white/10 rounded-2xl`}>
                <h3 className="text-md font-bold">Resumo do Pedido</h3>
                {event && (
                  <div className={`${isCheckoutCompact ? 'space-y-2' : 'space-y-3'} text-sm`}>
                    <div>
                      <div className="font-bold text-white">{event.title}</div>
                      {!isCheckoutCompact && <div className="text-xs text-neutral-400 mt-0.5">Data: {new Date(event.date).toLocaleDateString('pt-BR')}</div>}
                    </div>
                    <div className={`${isCheckoutCompact ? 'pt-2' : 'pt-3'} flex justify-between border-t border-white/5 text-xs text-neutral-400`}>
                      <span>Ingressos:</span>
                      <span>{quantity}x</span>
                    </div>
                    <div className={`${isCheckoutCompact ? 'pt-2' : 'pt-3'} flex justify-between border-t border-white/5 font-bold text-white`}>
                      <span>Total:</span>
                      <span className={`${isCheckoutCompact ? 'text-base' : 'text-lg'} text-[#FF3200] font-mono`}>
                        {event.ticketTypes[0] ? (Number(event.ticketTypes[0].batches[0]?.price) * Number(quantity)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Processando...' : 'Finalizar Pagamento'}
                </Button>
              </Card>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Card({ children, className }: any) {
  return <div className={`border rounded-lg ${className}`}>{children}</div>;
}

function Button({ children, className, onClick, type, disabled }: any) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`h-11 px-6 rounded-lg bg-[#FF3200] hover:bg-[#E62D00] text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
