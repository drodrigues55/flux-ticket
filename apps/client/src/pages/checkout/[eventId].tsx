import { useRouter } from 'next/router';
import { useTicketLock } from '../../hooks/useTicketLock';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@flux/ui';
import { useState, useEffect } from 'react';
import Script from 'next/script';

interface InstallmentOption {
  installments: number;
  installment_amount: number;
  total_amount: number;
  recommended_message: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { eventId, ticketId: queryTicketId, userId: queryUserId, batchId: queryBatchId } = router.query;

  // Estados de Identidade da Reserva
  const [ticketId, setTicketId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const activeEventId = (eventId as string) || '';
  const activeBatchId = (queryBatchId as string) || '';

  // Sincroniza parâmetros de query se disponíveis
  useEffect(() => {
    if (queryTicketId) setTicketId(queryTicketId as string);
    if (queryUserId) setUserId(queryUserId as string);
  }, [queryTicketId, queryUserId]);

  // Estados de Pagamento
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'success' | 'pending_pix' | 'pending_card_review' | 'rejected' | 'expired'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Estado do Formulário
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [email, setEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [issuerId, setIssuerId] = useState('visa');
  const [installments, setInstallments] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(100.0); // em reais (dinâmico)
  const [eventTitle, setEventTitle] = useState('Carregando evento...');

  // Dados do PIX recebidos do MP
  const [pixCode, setPixCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');

  // Opções de parcelamento dinâmico
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);

  // Lógica quando o lock expira no hook
  const handleLockExpired = () => {
    setPaymentStatus('expired');
    setErrorMessage('Sua sessão de reserva expirou. O ingresso foi liberado de volta ao estoque.');
    setTimeout(() => {
      router.push(`/events`);
    }, 4000);
  };

  const { timeLeft, formattedTime } = useTicketLock({
    userId,
    ticketId,
    eventId: activeEventId,
    batchId: activeBatchId,
    onExpired: handleLockExpired,
  });

  // Progresso do temporizador (180 segundos)
  const progressPercent = (timeLeft / 180) * 100;

  // Carrega informações reais do evento, preço e cria a reserva no mount
  useEffect(() => {
    if (!activeEventId || !activeBatchId) return;

    const fetchDetailsAndReserve = async () => {
      try {
        // 1. Busca detalhes do evento para preencher título e valor do lote
        const res = await fetch(`/api/events/${activeEventId}`);
        if (!res.ok) {
          throw new Error('Falha ao obter detalhes do evento.');
        }
        const data = await res.json();
        setEventTitle(data.title);

        const matchingBatch = data.batches?.find((b: any) => b.id === activeBatchId);
        if (!matchingBatch) {
          throw new Error('Lote não encontrado para este evento.');
        }

        const priceInReais = Number(matchingBatch.price) / 100;
        setTicketPrice(priceInReais);
        calculateInstallments(priceInReais);

        // 2. Cria a reserva do ingresso no backend se não vier da URL
        if (!queryTicketId && !ticketId) {
          const reserveRes = await fetch('/api/tickets/reserve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId: activeEventId,
              batchId: activeBatchId,
              price: priceInReais,
            }),
          });

          if (!reserveRes.ok) {
            const errData = await reserveRes.json();
            throw new Error(errData.message || 'Erro ao realizar a reserva de ingresso.');
          }

          const reserveData = await reserveRes.json();
          setTicketId(reserveData.ticketId);
          setUserId(reserveData.userId);
        }
      } catch (err: any) {
        console.error('[CHECKOUT INITIALIZE ERROR]', err);
        setErrorMessage(err.message || 'Erro ao inicializar página de pagamento.');
      }
    };

    fetchDetailsAndReserve();
  }, [activeEventId, activeBatchId, queryTicketId, ticketId]);

  // Calcula opções de parcelamento com base no valor
  const calculateInstallments = (price: number) => {
    const options: InstallmentOption[] = [
      {
        installments: 1,
        installment_amount: price,
        total_amount: price,
        recommended_message: `1x de R$ ${price.toFixed(2)} sem juros`,
      },
      {
        installments: 2,
        installment_amount: price / 2,
        total_amount: price,
        recommended_message: `2x de R$ ${(price / 2).toFixed(2)} sem juros`,
      },
      {
        installments: 3,
        installment_amount: price / 3,
        total_amount: price,
        recommended_message: `3x de R$ ${(price / 3).toFixed(2)} sem juros`,
      },
      {
        installments: 6,
        installment_amount: (price * 1.05) / 6,
        total_amount: price * 1.05,
        recommended_message: `6x de R$ ${((price * 1.05) / 6).toFixed(2)} (com juros)`,
      },
      {
        installments: 12,
        installment_amount: (price * 1.1) / 12,
        total_amount: price * 1.1,
        recommended_message: `12x de R$ ${((price * 1.1) / 12).toFixed(2)} (com juros)`,
      },
    ];
    setInstallmentOptions(options);
  };

  // Escuta mudanças de número de cartão para descobrir bandeira/bin
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length >= 6) {
      const bin = cleanNumber.substring(0, 6);
      // Aqui integraria com o MP SDK real: window.MercadoPago.getPaymentMethod({ bin })
      // Simulação de bandeiras baseadas no primeiro dígito
      if (bin.startsWith('4')) {
        setIssuerId('visa');
      } else if (bin.startsWith('5')) {
        setIssuerId('master');
      } else if (bin.startsWith('3')) {
        setIssuerId('amex');
      } else {
        setIssuerId('other');
      }
    }
  }, [cardNumber]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentStatus === 'expired') return;
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      let payload: any = {
        ticketId,
        buyerCpf,
        paymentMethod: {
          method: paymentMethod,
        },
      };

      if (paymentMethod === 'credit_card') {
        // No checkout real com MP SDK, tokenizaríamos o cartão primeiro:
        // const cardToken = await mp.fields.createCardToken({...});
        // Para nossa integração híbrida NestJS (com mock de dev):
        let cardToken = 'mock-approved-token';

        // Simulação de testes para tokens mock
        if (cardNumber.includes('1111') || cardholderName.toLowerCase().includes('pending')) {
          cardToken = 'mock-pending-token';
        } else if (cardNumber.includes('2222') || cardholderName.toLowerCase().includes('rejected') || cardholderName.toLowerCase().includes('fail')) {
          cardToken = 'mock-rejected-token';
        }

        payload.paymentMethod = {
          method: 'credit_card',
          token: cardToken,
          installments: Number(installments),
          issuerId,
          email,
        };
      }

      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Falha ao processar o pagamento.');
      }

      if (data.status === 'approved') {
        setPaymentStatus('success');
      } else if (data.status === 'pending' || data.status === 'in_process') {
        if (paymentMethod === 'pix') {
          setPixCode(data.qrCode);
          setPixQrBase64(data.qrCodeBase64);
          setPaymentStatus('pending_pix');
        } else {
          setPaymentStatus('pending_card_review');
        }
      } else {
        setPaymentStatus('rejected');
        setErrorMessage('O pagamento foi recusado. Tente outro cartão.');
      }
    } catch (err: any) {
      console.error(err);
      setPaymentStatus('rejected');
      setErrorMessage(err.message || 'Erro ao processar transação.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    alert('Código PIX copiado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-cosmic-dark text-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 selection:bg-cosmic-neon/30 selection:text-cosmic-neon">
      {/* Mercado Pago Web Tokenizer SDK Script */}
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="lazyOnload" />

      {/* Background neon grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <main className="max-w-4xl mx-auto w-full relative z-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Seção Esquerda: Formulário de Pagamento */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-neutral-850/80 shadow-2xl relative overflow-hidden">
              {/* Top border glowing line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cosmic-neon to-transparent" />

              <CardHeader>
                <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                  Detalhes do Faturamento
                </CardTitle>
                <CardDescription>
                  Selecione o método de pagamento e conclua sua compra com segurança.
                </CardDescription>
              </CardHeader>

              {paymentStatus === 'success' ? (
                <div className="text-center py-12 space-y-4 px-6">
                  <div className="w-16 h-16 bg-cosmic-neon/10 border border-cosmic-neon rounded-full flex items-center justify-center mx-auto animate-neon-glow">
                    <svg className="w-8 h-8 text-cosmic-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-cosmic-neon">Pagamento Aprovado!</h3>
                  <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                    Seu ingresso foi emitido e assinado digitalmente com sucesso. A assinatura HMAC já está salva na portaria.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => router.push('/events')} className="mt-4">
                    Voltar para Eventos
                  </Button>
                </div>
              ) : paymentStatus === 'pending_card_review' ? (
                <div className="text-center py-12 space-y-4 px-6">
                  <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-yellow-500">Pagamento em Análise</h3>
                  <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                    O Mercado Pago está revisando a transação do cartão. O lock do seu ingresso foi estendido por 15 minutos para sua segurança.
                  </p>
                </div>
              ) : paymentStatus === 'pending_pix' ? (
                <div className="text-center py-8 space-y-6 px-6">
                  <div className="w-12 h-12 bg-cosmic-neon/10 border border-cosmic-neon rounded-full flex items-center justify-center mx-auto animate-neon-glow">
                    <span className="font-bold text-cosmic-neon text-xs">PIX</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Aguardando Pagamento</h3>

                  {/* Mock/Real QR Code Image representation */}
                  {pixQrBase64 && (
                    <div className="bg-white p-3 rounded-lg w-44 h-44 mx-auto border border-neutral-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      <img
                        src={`data:image/png;base64,${pixQrBase64}`}
                        alt="QR Code PIX"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-neutral-400 text-xs max-w-sm mx-auto">
                      Copie o código PIX abaixo para pagar no aplicativo do seu banco. Sua reserva expira em 15 minutos.
                    </p>

                    <div className="flex items-center bg-[#1A1A1A] border border-neutral-850 p-2.5 rounded-lg max-w-md mx-auto">
                      <input
                        type="text"
                        readOnly
                        value={pixCode}
                        className="bg-transparent text-neutral-300 text-xs flex-1 outline-none font-mono truncate mr-2"
                      />
                      <Button variant="primary" size="sm" onClick={copyToClipboard} className="shrink-0">
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : paymentStatus === 'expired' ? (
                <div className="text-center py-12 space-y-4 px-6">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-red-500">Reserva Expirada</h3>
                  <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                    {errorMessage} Redirecionando...
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit}>
                  {/* Selector de Método de Pagamento */}
                  <div className="grid grid-cols-2 gap-4 px-6 pt-2 pb-4 border-b border-neutral-850">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`flex items-center justify-center p-3 rounded-lg border font-bold text-sm transition-all duration-200 ${paymentMethod === 'credit_card'
                          ? 'border-cosmic-neon bg-cosmic-neon/10 text-cosmic-neon shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                          : 'border-neutral-800 bg-[#151515] text-neutral-400 hover:text-white'
                        }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`flex items-center justify-center p-3 rounded-lg border font-bold text-sm transition-all duration-200 ${paymentMethod === 'pix'
                          ? 'border-cosmic-neon bg-cosmic-neon/10 text-cosmic-neon shadow-[0_0_12px_rgba(0,229,255,0.1)]'
                          : 'border-neutral-800 bg-[#151515] text-neutral-400 hover:text-white'
                        }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m4 11h.01M5 8h2m9 0h3m-11 4h.01M16 16h3M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      PIX Instantâneo
                    </button>
                  </div>

                  <CardContent className="space-y-4 pt-4">
                    {errorMessage && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-lg">
                        {errorMessage}
                      </div>
                    )}

                    {paymentMethod === 'credit_card' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">E-mail *</label>
                            <Input
                              type="email"
                              placeholder="exemplo@email.com"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              disabled={paymentStatus === 'processing'}
                              className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 border-[#2C2C2C] bg-[#121212]"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">CPF do Titular *</label>
                            <Input
                              type="text"
                              placeholder="000.000.000-00"
                              required
                              value={buyerCpf}
                              onChange={(e) => setBuyerCpf(e.target.value)}
                              disabled={paymentStatus === 'processing'}
                              className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 border-[#2C2C2C] bg-[#121212]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Nome Impresso no Cartão *</label>
                          <Input
                            type="text"
                            placeholder="JOAO H SILVA"
                            required
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            disabled={paymentStatus === 'processing'}
                            className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 border-[#2C2C2C] bg-[#121212] uppercase"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Número do Cartão *</label>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="4000 1234 5678 9010"
                              required
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              disabled={paymentStatus === 'processing'}
                              className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 border-[#2C2C2C] bg-[#121212]"
                            />
                            <div className="absolute right-3 top-3 text-neutral-500 text-xs font-bold font-mono tracking-widest uppercase">
                              {issuerId}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Validade *</label>
                            <Input
                              type="text"
                              placeholder="MM/AA"
                              required
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              disabled={paymentStatus === 'processing'}
                              className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 border-[#2C2C2C] bg-[#121212]"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Código CVC *</label>
                            <Input
                              type="text"
                              placeholder="123"
                              required
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              disabled={paymentStatus === 'processing'}
                              className="focus:ring-[#00E5FF] focus:border-[#00E5FF] focus:ring-1 border-[#2C2C2C] bg-[#121212]"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Parcelamento (Mercado Pago) *</label>
                          <select
                            required
                            value={installments}
                            onChange={(e) => setInstallments(Number(e.target.value))}
                            disabled={paymentStatus === 'processing'}
                            className="w-full bg-[#121212] border border-[#2C2C2C] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200"
                          >
                            {installmentOptions.map((opt) => (
                              <option key={opt.installments} value={opt.installments}>
                                {opt.recommended_message}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="bg-cosmic-slate p-4 border border-cosmic-grey rounded-lg space-y-3">
                        <h4 className="font-semibold text-cosmic-neon text-sm flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pagamento PIX Instantâneo
                        </h4>
                        <ul className="text-neutral-400 text-xs space-y-2 list-disc list-inside">
                          <li>O QR code e o código copia-e-cola serão gerados após confirmar a compra.</li>
                          <li>O estoque do ingresso ficará garantido por 15 minutos após a geração do PIX.</li>
                          <li>A validação de compensação é automática e instantânea.</li>
                        </ul>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex-col space-y-3">
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-3 hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
                      disabled={paymentStatus === 'processing' || !ticketId}
                    >
                      {paymentStatus === 'processing' ? (
                        <span className="flex items-center space-x-2">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-neutral-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processando com Mercado Pago...
                        </span>
                      ) : !ticketId ? (
                        'Inicializando Reserva...'
                      ) : paymentMethod === 'pix' ? (
                        'Gerar Código PIX e Pagar'
                      ) : (
                        `Pagar R$ ${ticketPrice.toFixed(2)} com Cartão`
                      )}
                    </Button>
                    <div className="flex items-center justify-center space-x-2 text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Transação criptografada de ponta a ponta</span>
                    </div>
                  </CardFooter>
                </form>
              )}
            </Card>
          </div>

          {/* Seção Direita: Temporizador de Segurança & Resumo */}
          <div className="lg:col-span-5 space-y-6">

            {/* Bloco de Contagem Regressiva */}
            <Card className="border-neutral-850/80 bg-gradient-to-br from-cosmic-slate to-[#1a2327]">
              <CardHeader className="items-center text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-cosmic-neon bg-cosmic-neon/10 border border-cosmic-neon/30 rounded-full px-3 py-1">
                  Tempo Restante
                </span>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-4 space-y-4">
                {/* Visual circular timer indicator */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-neutral-800"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-cosmic-neon transition-all duration-1000 ease-linear"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * progressPercent) / 100}
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-3xl font-mono font-black text-white tracking-wider">
                      {formattedTime}
                    </span>
                    <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mt-1">
                      Minutos
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-1.5 max-w-[240px]">
                  <h4 className="text-sm font-semibold text-neutral-200">Reserva de Inventário Ativa</h4>
                  <p className="text-xs text-neutral-400">
                    Seu ingresso está temporariamente bloqueado para você. O cronômetro se renovará automaticamente enquanto você finaliza.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Resumo do Pedido */}
            <Card className="border-neutral-850/80">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm py-2 border-b border-neutral-800/60">
                  <div>
                    <p className="font-bold text-neutral-200">{eventTitle}</p>
                    <p className="text-xs text-neutral-400">1x Ingresso Lote Ativo</p>
                  </div>
                  <span className="font-mono text-cosmic-neon font-bold">R$ {ticketPrice.toFixed(2)}</span>
                </div>

                <div className="space-y-2 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Taxa de Conveniência</span>
                    <span className="font-mono">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descontos</span>
                    <span className="font-mono">R$ 0,00</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-neutral-800 font-bold">
                  <span>Total</span>
                  <span className="text-xl font-mono text-cosmic-neon font-black">R$ {ticketPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </main>

      <footer className="text-center text-xs text-neutral-500 py-6 relative z-10">
        <p>&copy; {new Date().getFullYear()} Flux Ticketss. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
