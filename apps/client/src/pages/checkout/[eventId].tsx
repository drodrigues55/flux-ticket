import { useRouter } from 'next/router';
import { useTicketLock } from '../../hooks/useTicketLock';
import { useState, useEffect } from 'react';
import Script from 'next/script';
import {
  FaCreditCard,
  FaShieldHalved,
  FaClock,
  FaCalendarDays,
  FaLocationDot,
  FaTicket,
  FaArrowLeft,
  FaCircleCheck,
  FaCopy,
  FaPix,
  FaLock
} from 'react-icons/fa6';

interface InstallmentOption {
  installments: number;
  installment_amount: number;
  total_amount: number;
  recommended_message: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { eventId, ticketId: queryTicketId, userId: queryUserId, batchId: queryBatchId, quantity: queryQuantity } = router.query;
  const activeQuantity = Number(queryQuantity) || 1;

  // Estados de Identidade da Reserva
  const [ticketId, setTicketId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [event, setEvent] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

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
  const [buyerName, setBuyerName] = useState('');
  const [email, setEmail] = useState('');
  const [buyerCpf, setBuyerCpf] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [issuerId, setIssuerId] = useState('visa');
  const [installments, setInstallments] = useState(1);
  const [ticketPrice, setTicketPrice] = useState(100.0); // em reais
  const [eventTitle, setEventTitle] = useState('Carregando evento...');
  const [copied, setCopied] = useState(false);

  // Dados dos titulares adicionais
  const [holders, setHolders] = useState<Array<{ name: string; cpf: string }>>([]);

  // Dados do PIX recebidos do MP
  const [pixCode, setPixCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');

  // Opções de parcelamento dinâmico
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);

  // Validador de E-mail
  const [emailError, setEmailError] = useState('');

  // Cupom de Desconto
  const [couponCode, setCouponCode] = useState('');

  // Estados touched para validação visual
  const [nameTouched, setNameTouched] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [buttonAlertText, setButtonAlertText] = useState('');

  // Inicializa o array de holders com base na quantidade selecionada
  useEffect(() => {
    if (activeQuantity > 0) {
      setHolders(
        Array.from({ length: activeQuantity }, (_, i) => ({
          name: i === 0 ? buyerName : '',
          cpf: i === 0 ? buyerCpf : '',
        }))
      );
    }
  }, [activeQuantity]);

  // Sincroniza o primeiro titular com os dados do comprador
  useEffect(() => {
    setHolders((prev) => {
      const updated = [...prev];
      if (updated[0]) {
        updated[0].name = buyerName;
        updated[0].cpf = buyerCpf;
      }
      return updated;
    });
  }, [buyerName, buyerCpf]);

  const validateEmail = () => {
    if (!email) {
      setEmailError('E-mail é obrigatório');
      return;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      setEmailError('Por favor, insira um e-mail válido (exemplo@email.com)');
    } else {
      setEmailError('');
    }
  };

  // Helper flags
  const isBuyerInfoComplete =
    buyerName.trim().length > 3 &&
    email.trim().length > 5 &&
    !emailError &&
    (buyerCpf.length === 14 || buyerCpf.length === 18);

  const isHoldersInfoComplete = holders.every((h, idx) => {
    if (idx === 0) return true;
    return h.name.trim().length > 3 && (h.cpf.length === 14 || h.cpf.length === 18);
  });

  const isCardInfoComplete =
    cardNumber.length === 19 &&
    cardholderName.trim().length > 3 &&
    cardExpiry.length === 5 &&
    cardCvc.length >= 3;

  // Validador de Formulário Completo
  const isFormComplete =
    isBuyerInfoComplete &&
    isHoldersInfoComplete &&
    (paymentMethod === 'pix' || (paymentMethod === 'credit_card' && isCardInfoComplete));

  const isNameInvalid = (nameTouched || submitAttempted) && buyerName.trim().length <= 3;
  const isCpfInvalid = (cpfTouched || submitAttempted) && buyerCpf.length !== 14 && buyerCpf.length !== 18;

  const isCardNumberInvalid = submitAttempted && cardNumber.length !== 19;
  const isCardholderNameInvalid = submitAttempted && cardholderName.trim().length <= 3;
  const isCardExpiryInvalid = submitAttempted && cardExpiry.length !== 5;
  const isCardCvcInvalid = submitAttempted && cardCvc.length < 3;

  // Rola a página para cima automaticamente quando o formulário é completamente preenchido
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  useEffect(() => {
    if (isFormComplete) {
      if (!hasScrolledUp) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setHasScrolledUp(true);
      }
    } else {
      setHasScrolledUp(false);
    }
  }, [isFormComplete, hasScrolledUp]);

  // Rola a página para cima quando o status do pagamento muda
  useEffect(() => {
    if (paymentStatus !== 'idle') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [paymentStatus]);

  // Lógica quando o lock expira no hook
  const handleLockExpired = () => {
    setPaymentStatus('expired');
    setErrorMessage('Sua sessão de reserva expirou. O ingresso foi liberado de volta ao estoque.');
    setTimeout(() => {
      router.push(`/`);
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
        setEvent(data);
        setEventTitle(data.title);

        const matchingBatch = data.batches?.find((b: any) => b.id === activeBatchId);
        if (!matchingBatch) {
          throw new Error('Lote não encontrado para este evento.');
        }
        setSelectedBatch(matchingBatch);

        const priceInReais = Number(matchingBatch.price);
        setTicketPrice(priceInReais);
        calculateInstallments(priceInReais * activeQuantity);

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
              isHalfPrice: !!matchingBatch.meiaEntrada,
              quantity: activeQuantity,
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
  }, [activeEventId, activeBatchId, queryTicketId, ticketId, activeQuantity]);

  // Calcula opções de parcelamento com base no valor (máximo 4x com taxas fictícias/juros)
  const calculateInstallments = (price: number) => {
    const options: InstallmentOption[] = [
      {
        installments: 1,
        installment_amount: price,
        total_amount: price,
        recommended_message: `1x de R$ ${price.toFixed(2).replace('.', ',')}`,
      },
      {
        installments: 2,
        installment_amount: (price * 1.03) / 2,
        total_amount: price * 1.03,
        recommended_message: `2x de R$ ${((price * 1.03) / 2).toFixed(2).replace('.', ',')} (com juros)`,
      },
      {
        installments: 3,
        installment_amount: (price * 1.05) / 3,
        total_amount: price * 1.05,
        recommended_message: `3x de R$ ${((price * 1.05) / 3).toFixed(2).replace('.', ',')} (com juros)`,
      },
      {
        installments: 4,
        installment_amount: (price * 1.07) / 4,
        total_amount: price * 1.07,
        recommended_message: `4x de R$ ${((price * 1.07) / 4).toFixed(2).replace('.', ',')} (com juros)`,
      },
    ];
    setInstallmentOptions(options);
  };

  // Formatadores de Inputs
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';

    if (raw.length <= 11) {
      // Format as CPF: 000.000.000-00
      formatted = raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Format as CNPJ: 00.000.000/0000-00
      formatted = raw
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    setBuyerCpf(formatted.substring(0, 18));
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.replace(/(\d{2})(\d)/, '$1/$2');
    setCardExpiry(formatted.substring(0, 5));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCardCvc(value.substring(0, 4));
  };

  // Escuta mudanças de número de cartão para descobrir bandeira/bin
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length >= 6) {
      const bin = cleanNumber.substring(0, 6);
      if (bin.startsWith('4')) {
        setIssuerId('visa');
      } else if (bin.startsWith('5')) {
        setIssuerId('mastercard');
      } else if (bin.startsWith('3')) {
        setIssuerId('amex');
      } else {
        setIssuerId('cartão');
      }
    }
  }, [cardNumber]);

  const handlePaymentSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (paymentStatus === 'expired') return;
    if (paymentMethod === null) return;

    if (!isFormComplete) {
      setSubmitAttempted(true);
      setNameTouched(true);
      setCpfTouched(true);
      validateEmail();

      if (paymentMethod === null) {
        setButtonAlertText('Escolha uma forma de pagamento');
      } else if (!isBuyerInfoComplete) {
        setButtonAlertText('Preencha os dados do comprador');
      } else if (paymentMethod === 'credit_card' && !isCardInfoComplete) {
        setButtonAlertText('Preencha os dados do cartão');
      }

      setTimeout(() => {
        setButtonAlertText('');
      }, 3000);
      return;
    }

    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      let payload: any = {
        ticketId,
        buyerCpf,
        email,
        buyerName,
        paymentMethod: {
          method: paymentMethod,
        },
        holders,
      };

      if (paymentMethod === 'credit_card') {
        let cardToken = 'mock-approved-token';

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
        router.push(`/checkout/success?ticketId=${ticketId || data.ticketId}`);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const displayDateStr = event?.date
    ? new Date(event.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[180px] pointer-events-none" />
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="lazyOnload" />

      <main className="max-w-6xl mx-auto w-full px-6 py-12 flex-grow relative z-10">
        {/* Voltar para eventos */}
        <button
          onClick={() => router.push(activeEventId ? `/?eventId=${activeEventId}` : '/')}
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-[#B388FF] transition-colors mb-8 cursor-pointer border-none bg-transparent"
        >
          <FaArrowLeft className="w-4 h-4" />
          Voltar para Eventos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Seção Esquerda: Formulário de Pagamento */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#18181B] rounded-3xl border border-white/10 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-[#1F1F23]/50 to-[#252528]/30">
                <h2 className="text-2xl font-extrabold text-white leading-tight">
                  Finalize sua compra
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Confirme seus dados e escolha a forma de pagamento.
                </p>
              </div>

              {paymentStatus === 'success' ? (
                <div className="text-center py-16 px-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-emerald-500/10 border-4 border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
                    <FaCircleCheck className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Pagamento Aprovado!</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    Seu ingresso foi emitido e assinado digitalmente com sucesso. A assinatura HMAC já está salva na portaria.
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="bg-[#9146FF] hover:bg-[#A970FF] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm cursor-pointer inline-block mt-4 border-none"
                  >
                    Voltar para Início
                  </button>
                </div>
              ) : paymentStatus === 'pending_card_review' ? (
                <div className="text-center py-16 px-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-amber-500/10 border-4 border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-400 shadow-sm animate-pulse">
                    <FaClock className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Pagamento em Análise</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    O Mercado Pago está revisando a transação do cartão. O lock do seu ingresso foi estendido por 15 minutos para sua segurança.
                  </p>
                </div>
              ) : paymentStatus === 'pending_pix' ? (
                <div className="text-center py-10 px-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full shadow-sm">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                    Aguardando Pagamento
                  </div>
                  <h3 className="text-2xl font-black text-white">Pague via PIX</h3>

                  {pixQrBase64 && (
                    <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto border-none">
                      <img
                        src={`data:image/png;base64,${pixQrBase64}`}
                        alt="QR Code PIX"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-4 max-w-md mx-auto">
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Copie o código PIX abaixo para pagar no aplicativo do seu banco. Sua reserva expira em 15 minutos.
                    </p>

                    <div className="flex items-center bg-[#080D1A]/50 border border-white/10 p-2 rounded-xl">
                      <input
                        type="text"
                        readOnly
                        value={pixCode}
                        className="bg-transparent text-white text-xs font-semibold flex-1 outline-none font-sans truncate px-2 border-none"
                      />
                      <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer border-none ${copied
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#9146FF] hover:bg-[#A970FF] text-white shadow-sm'
                          }`}
                      >
                        {copied ? (
                          <>
                            <FaCircleCheck className="w-3.5 h-3.5" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <FaCopy className="w-3.5 h-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : paymentStatus === 'expired' ? (
                <div className="text-center py-16 px-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-red-500/10 border-4 border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-450 shadow-sm">
                    <FaClock className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Reserva Expirada</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                    {errorMessage} Redirecionando...
                  </p>
                </div>
              ) : (
                <form id="checkout-form" onSubmit={handlePaymentSubmit} className="divide-y divide-white/5">
                  {/* 1. DADOS DE ACESSO */}
                  <div className="p-6 md:p-8 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#9146FF]/10 text-[#B388FF] text-xs font-bold flex items-center justify-center">1</span>
                      Dados do comprador
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nome Completo *</label>
                      <input
                        type="text"
                        placeholder="Nome Completo do Comprador"
                        required
                        value={buyerName}
                        onChange={(e) => {
                          setBuyerName(e.target.value);
                          if (nameTouched && e.target.value.trim().length > 3) {
                            setNameTouched(false);
                          }
                        }}
                        onBlur={() => setNameTouched(true)}
                        disabled={paymentStatus === 'processing'}
                        className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 ${isNameInvalid ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                          }`}
                      />
                      {isNameInvalid && (
                        <p className="text-red-500 text-xs font-medium mt-1">Insira seu nome completo (mínimo 4 caracteres)</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">E-mail *</label>
                      <input
                        type="email"
                        placeholder="exemplo@email.com"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) {
                            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (regex.test(e.target.value)) {
                              setEmailError('');
                            }
                          }
                        }}
                        onBlur={validateEmail}
                        disabled={paymentStatus === 'processing'}
                        className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 ${emailError ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                          }`}
                      />
                      {emailError && (
                        <p className="text-red-500 text-xs font-medium mt-1">{emailError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">CPF do Comprador *</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        required
                        value={buyerCpf}
                        onChange={(e) => {
                          handleCpfChange(e);
                          const len = e.target.value.replace(/\D/g, '').length;
                          if (cpfTouched && (len === 11 || len === 14)) {
                            setCpfTouched(false);
                          }
                        }}
                        onBlur={() => setCpfTouched(true)}
                        disabled={paymentStatus === 'processing'}
                        className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 ${isCpfInvalid ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                          }`}
                      />
                      {isCpfInvalid && (
                        <p className="text-red-500 text-xs font-medium mt-1">Insira um CPF (11 dígitos) ou CNPJ (14 dígitos) válido</p>
                      )}
                    </div>
                  </div>

                  {/* Titularidade dos ingressos */}
                  {activeQuantity > 1 && (
                    <div className="p-6 md:p-8 border-b border-white/5 space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Identificação dos Ingressos</h4>
                      <p className="text-slate-450 text-xs leading-normal">
                        Preencha o Nome e o CPF de cada titular. Você poderá alterar estas informações posteriormente no seu perfil.
                      </p>
                      
                      {holders.map((holder, index) => {
                        if (index === 0) return null; // O primeiro ingresso usa os dados do comprador
                        return (
                          <div key={index} className="p-4 bg-[#1F1F23]/40 border border-white/5 rounded-2xl space-y-3">
                            <span className="text-xs font-bold text-slate-300 block">
                              Ingresso #{index + 1}
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome do Titular *</label>
                                <input
                                  type="text"
                                  placeholder="Nome Completo do Titular"
                                  required
                                  value={holder.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHolders((prev) => {
                                      const next = [...prev];
                                      if (next[index]) next[index].name = val;
                                      return next;
                                    });
                                  }}
                                  className="w-full bg-[#080D1A]/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CPF do Titular *</label>
                                <input
                                  type="text"
                                  placeholder="000.000.000-00"
                                  required
                                  value={holder.cpf}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const clean = val.replace(/\D/g, '').substring(0, 11);
                                    const formatted = clean
                                      .replace(/(\d{3})(\d)/, '$1.$2')
                                      .replace(/(\d{3})(\d)/, '$1.$2')
                                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                    setHolders((prev) => {
                                      const next = [...prev];
                                      if (next[index]) next[index].cpf = formatted;
                                      return next;
                                    });
                                  }}
                                  className="w-full bg-[#080D1A]/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. MÉTODO DE PAGAMENTO */}
                  <div>
                    <div className="p-6 md:px-8 bg-[#1F1F23]/20 border-y border-white/5">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-[#9146FF]/10 text-[#B388FF] text-xs font-bold flex items-center justify-center">2</span>
                        Forma de Pagamento
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${paymentMethod === 'credit_card'
                            ? 'border-[#9146FF] bg-[#9146FF]/10 text-[#B388FF] shadow-lg shadow-[#9146FF]/5'
                            : 'border-white/10 bg-[#0D1526]/30 text-slate-400 hover:border-white/20 hover:text-white hover:bg-[#0D1526]/50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <FaCreditCard className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-sm">Cartão de Crédito</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${paymentMethod === 'credit_card'
                            ? 'border-[#9146FF] bg-[#9146FF] text-white scale-110'
                            : 'border-white/10 bg-transparent'
                            }`}>
                            {paymentMethod === 'credit_card' && <FaCircleCheck className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pix')}
                          className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${paymentMethod === 'pix'
                            ? 'border-[#9146FF] bg-[#9146FF]/10 text-[#B388FF] shadow-lg shadow-[#9146FF]/5'
                            : 'border-white/10 bg-[#0D1526]/30 text-slate-400 hover:border-white/20 hover:text-white hover:bg-[#0D1526]/50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <FaPix className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-sm">PIX Instantâneo</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${paymentMethod === 'pix'
                            ? 'border-[#9146FF] bg-[#9146FF] text-white scale-110'
                            : 'border-white/10 bg-transparent'
                            }`}>
                            {paymentMethod === 'pix' && <FaCircleCheck className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      </div>
                    </div>

                    {paymentMethod !== null && (
                      <div className="p-6 md:p-8 space-y-5 animate-in fade-in slide-in-from-top-3 duration-250">
                        {errorMessage && (
                          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl font-medium">
                            {errorMessage}
                          </div>
                        )}

                        {paymentMethod === 'credit_card' ? (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Número do Cartão *</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="4000 1234 5678 9010"
                                  required
                                  value={cardNumber}
                                  onChange={handleCardNumberChange}
                                  disabled={paymentStatus === 'processing'}
                                  className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 ${isCardNumberInvalid ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                                    }`}
                                />
                                <div className="absolute right-4 top-3.5 text-[#B388FF] text-xs font-bold uppercase font-mono select-none">
                                  {issuerId}
                                </div>
                              </div>
                              {isCardNumberInvalid && (
                                <p className="text-red-500 text-xs font-medium mt-1">Insira um número de cartão válido (16 dígitos)</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nome Impresso no Cartão *</label>
                              <input
                                type="text"
                                placeholder="JOAO H SILVA"
                                required
                                value={cardholderName}
                                onChange={(e) => setCardholderName(e.target.value)}
                                disabled={paymentStatus === 'processing'}
                                className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 uppercase ${isCardholderNameInvalid ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                                  }`}
                              />
                              {isCardholderNameInvalid && (
                                <p className="text-red-500 text-xs font-medium mt-1">Insira o nome impresso no cartão (mínimo 4 caracteres)</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Validade *</label>
                                <input
                                  type="text"
                                  placeholder="MM/AA"
                                  required
                                  value={cardExpiry}
                                  onChange={handleExpiryChange}
                                  disabled={paymentStatus === 'processing'}
                                  className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 ${isCardExpiryInvalid ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                                    }`}
                                />
                                {isCardExpiryInvalid && (
                                  <p className="text-red-500 text-xs font-medium mt-1">Validade inválida (MM/AA)</p>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Código CVC *</label>
                                <input
                                  type="text"
                                  placeholder="123"
                                  required
                                  value={cardCvc}
                                  onChange={handleCvcChange}
                                  disabled={paymentStatus === 'processing'}
                                  className={`w-full bg-[#080D1A]/50 border rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 transition-all duration-200 ${isCardCvcInvalid ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-[#9146FF] focus:bg-[#080D1A]'
                                    }`}
                                />
                                {isCardCvcInvalid && (
                                  <p className="text-red-500 text-xs font-medium mt-1">CVC inválido (3 ou 4 dígitos)</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Parcelamento (Mercado Pago) *</label>
                              <select
                                required
                                value={installments}
                                onChange={(e) => setInstallments(Number(e.target.value))}
                                disabled={paymentStatus === 'processing'}
                                className="w-full bg-[#080D1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] focus:bg-[#080D1A] transition-all duration-200 cursor-pointer"
                              >
                                {installmentOptions.map((opt) => (
                                  <option key={opt.installments} value={opt.installments} className="bg-[#18181B] text-white">
                                    {opt.recommended_message}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-500/5 border border-emerald-500/25 p-5 rounded-2xl space-y-3">
                            <h4 className="font-bold text-emerald-400 text-sm flex items-center">
                              <FaCircleCheck className="w-4 h-4 mr-2 text-emerald-450" />
                              Pagamento PIX Instantâneo
                            </h4>
                            <ul className="text-slate-400 text-xs space-y-2 list-disc list-inside">
                              <li>O QR Code e o código "copia e cola" serão exibidos após a confirmação.</li>
                              <li>Após gerar o código, você terá 15 minutos para concluir o pagamento e garantir seu ingresso.</li>
                              <li>A confirmação do pagamento é automática e você receberá seu ingresso logo em seguida.</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. INFORMAÇÕES RELEVANTES */}
                  {paymentMethod !== null && (
                    <div className="p-6 md:p-8 bg-[#1F1F23]/10 border-t border-white/5 space-y-3 animate-in fade-in duration-200">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#9146FF]/10 text-[#B388FF] text-[10px] font-bold flex items-center justify-center">3</span>
                        Informações Relevantes
                      </h3>
                      <div className="text-xs text-slate-450 space-y-2 leading-relaxed">
                        <p>• Seu ingresso será gerado automaticamente com o nome e CPF informados acima.</p>
                        <p>• O ingresso digital será liberado imediatamente após a confirmação do pagamento.</p>
                        <p>• O tempo exibido garante a sua reserva. Se o tempo expirar, o ingresso retorna ao sistema para venda.</p>
                        <p>• Ao finalizar, você concorda com os nossos termos de uso e política de reembolso.</p>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Seção Direita: Temporizador de Segurança & Resumo */}
          <div className="lg:col-span-5 space-y-6">
            {/* Bloco de Contagem Regressiva */}
            <div className="bg-[#18181B] rounded-3xl border border-white/10 shadow-sm p-6 flex flex-col items-center space-y-4">
              <span className={`text-xs font-bold uppercase tracking-wider rounded-full px-4 py-1.5 border transition-all duration-300 ${timeLeft < 60
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse'
                : 'text-[#B388FF] bg-[#9146FF]/10 border-[#9146FF]/20'
                }`}>
                {timeLeft < 60 ? 'Atenção: Tempo Esgotando!' : 'Tempo Restante'}
              </span>

              {/* Visual circular timer indicator */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-white/5"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className={`transition-all duration-1000 ease-linear ${timeLeft < 60 ? 'stroke-amber-500 animate-pulse' : 'stroke-[#9146FF]'
                      }`}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={402}
                    strokeDashoffset={402 - (402 * progressPercent) / 100}
                  />
                </svg>
                <div className="text-center">
                  <span className={`text-3xl font-sans font-black tracking-wider transition-colors duration-300 ${timeLeft < 60 ? 'text-amber-400' : 'text-white'
                    }`}>
                    {formattedTime}
                  </span>
                  <p className="text-[10px] uppercase font-bold text-slate-450 tracking-widest mt-1">
                    Minutos
                  </p>
                </div>
              </div>

              <div className="text-center space-y-1 max-w-[240px]">
                <h4 className="text-sm font-bold text-white">Seus ingressos estão reservados</h4>
                <p className="text-xs text-slate-450 leading-normal">
                  O tempo é renovado enquanto você preenche os dados.
                </p>
              </div>
            </div>

            {/* Resumo do Pedido */}
            <div className="bg-[#18181B] rounded-3xl border border-white/10 shadow-sm p-6 space-y-5">
              <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3">Resumo do Pedido</h3>

              {event && (
                <div className="flex gap-4 items-start pb-4 border-b border-white/5">
                  {event.image && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0 border border-white/10">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-white leading-tight">{event.title}</p>
                    {displayDateStr && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-450">
                        <FaCalendarDays className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span>{displayDateStr}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-450">
                        <FaLocationDot className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span className="truncate max-w-[180px]">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-bold text-white">{activeQuantity}x Ingresso(s)</span>
                    {selectedBatch && (
                      <span className="text-xs text-slate-450 block mt-0.5 font-semibold">
                        Setor: {selectedBatch.sectorName?.toUpperCase() || 'SUPERIOR'}
                      </span>
                    )}
                  </div>
                  <span className="font-sans text-white font-bold">R$ {(ticketPrice * activeQuantity).toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-450 pt-2 border-t border-white/5">
                  <div className="flex justify-between">
                    <span>Taxa de Conveniência</span>
                    <span className="font-sans">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descontos</span>
                    <span className="font-sans">R$ 0,00</span>
                  </div>
                </div>

                {/* Cupom de Desconto */}
                <div className="pt-2.5 pb-1 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cupom de desconto"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-[#080D1A]/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#9146FF] uppercase"
                    />
                    <button
                      type="button"
                      disabled={!couponCode.trim()}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none ${!couponCode.trim()
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : 'bg-[#9146FF] hover:bg-[#A970FF] text-white cursor-pointer shadow-sm hover:shadow'
                        }`}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Selo de Segurança */}
                <div className="flex items-center justify-center space-x-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2.5 px-3">
                  <FaLock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-extrabold uppercase tracking-wider">Ambiente 100% Seguro</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-base font-extrabold text-white">Total</span>
                  <span className="text-3xl font-sans text-[#B388FF] font-black tracking-tight">R$ {(ticketPrice * activeQuantity).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Botão de Finalizar Pagamento no Resumo (Lado Direito) */}
              {paymentStatus !== 'success' && paymentStatus !== 'pending_pix' && paymentStatus !== 'pending_card_review' && paymentStatus !== 'expired' && (
                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type={paymentMethod === null ? 'button' : 'submit'}
                    form="checkout-form"
                    disabled={paymentStatus === 'processing' || !ticketId}
                    className={`w-full py-4 rounded-2xl font-bold transition-all text-sm text-center block border border-transparent ${paymentMethod !== null && paymentStatus !== 'processing' && ticketId ? 'active:scale-[0.98]' : ''
                      } ${paymentStatus === 'processing' || !ticketId
                        ? 'bg-white/5 text-slate-550 cursor-not-allowed shadow-none'
                        : paymentMethod === null
                          ? 'bg-transparent text-[#B388FF] border-2 border-[#9146FF] shadow-none pointer-events-none'
                          : paymentMethod === 'pix'
                            ? 'bg-emerald-650 text-white hover:bg-emerald-700 cursor-pointer hover:shadow-lg shadow-emerald-600/30'
                            : !isFormComplete
                              ? 'bg-white/5 text-slate-550 cursor-pointer shadow-none hover:bg-white/10'
                              : 'bg-emerald-650 text-white hover:bg-emerald-700 cursor-pointer hover:shadow-lg shadow-emerald-600/30'
                      }`}
                  >
                    {paymentStatus === 'processing' ? (
                      <span className="flex items-center justify-center space-x-2">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </span>
                    ) : !ticketId ? (
                      'Inicializando Reserva...'
                    ) : paymentMethod === null ? (
                      'Escolha uma forma de pagamento'
                    ) : buttonAlertText ? (
                      buttonAlertText
                    ) : !isBuyerInfoComplete ? (
                      'Preencha os dados do comprador'
                    ) : paymentMethod === 'pix' ? (
                      'Gerar Código Pix'
                    ) : !isCardInfoComplete ? (
                      'Preencha os dados do cartão'
                    ) : (
                      'Finalizar Compra'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-550 py-8 border-t border-white/5 max-w-6xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}
