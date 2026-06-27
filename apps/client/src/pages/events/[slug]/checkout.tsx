import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft <= 0) {
      setError({ message: 'A reserva expirou. Por favor, volte e selecione os ingressos novamente.' });
      return;
    }

    setSaving(true);
    setError(null);

    const cleanCpf = buyerCpf.replace(/\D/g, '');

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

      setOrderId(json.orderId);
      if (paymentMethod === 'pix') {
        setPixCode(json.pixCode || '00020126360014br.gov.bcb.pix...');
        setPixQrBase64(json.pixQrBase64 || '');
        setPaymentStatus('pending_pix');
      } else {
        setPaymentStatus('success');
        // Redirect to confirmation
        router.push(`/orders/${json.orderId}/confirmation?ticketId=${json.ticketIds?.join(',') || ''}`);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSimulatePixPaid = () => {
    setPaymentStatus('success');
    router.push(`/orders/${orderId}/confirmation`);
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
    return (
      <div className="min-h-screen bg-[#03060B] text-white flex flex-col justify-center items-center p-6 space-y-4">
        <FaClock className="text-red-500 text-5xl" />
        <h1 className="text-xl font-bold">Tempo Expirado!</h1>
        <p className="text-neutral-400 text-sm text-center">Sua reserva de ingressos expirou. Volte para a página do evento para tentar novamente.</p>
        <Link href={`/events/${slug}`}>
          <Button>Voltar para o Evento</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <Header />

      <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full space-y-6 z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Finalizar Compra</h1>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded text-amber-500 text-xs font-bold">
            <FaClock />
            <span>Reserva expira em: {formatTime(timeLeft)}</span>
          </div>
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Buyer info card */}
              <Card className="p-6 bg-neutral-900 border border-white/10 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold">Dados do Comprador</h3>
                <div className="space-y-3">
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
              <Card className="p-6 bg-neutral-900 border border-white/10 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold">Forma de Pagamento</h3>
                
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
                  <div className="space-y-3 pt-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-neutral-400">Número do Cartão</span>
                      <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-neutral-400">Nome no Cartão</span>
                      <input type="text" value={cardholderName} onChange={e => setCardholderName(e.target.value)} required className="w-full h-11 bg-neutral-950 border border-white/10 rounded-lg px-3 text-sm text-white" />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
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
              <Card className="p-6 bg-neutral-900 border border-white/10 rounded-2xl space-y-4">
                <h3 className="text-md font-bold">Resumo do Pedido</h3>
                {event && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-bold text-white">{event.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">📅 {new Date(event.date).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-white/5 text-xs text-neutral-400">
                      <span>Ingressos:</span>
                      <span>{quantity}x</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-white/5 font-bold text-white">
                      <span>Total:</span>
                      <span className="text-lg text-[#FF3200] font-mono">
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
