import { useRouter } from 'next/router';
import { useTicketLock } from '../../hooks/useTicketLock';
import { useState, useEffect, useMemo } from 'react';
import Script from 'next/script';
import { isValidCpf } from '@flux/types';
import { formatPaymentError } from '../../lib/payment-errors';
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
  const { eventId, ticketId: queryTicketId, userId: queryUserId, batchId: queryBatchId, quantity: queryQuantity, batches: queryBatches } = router.query;

  // Parsed batches for multiple items
  const parsedBatches = useMemo(() => {
    if (!queryBatches || typeof queryBatches !== 'string') {
      if (queryBatchId) {
        return [{ batchId: queryBatchId as string, quantity: Number(queryQuantity) || 1 }];
      }
      return [];
    }
    return queryBatches.split(',').map(item => {
      const [bId, qty] = item.split(':');
      return { batchId: bId, quantity: Number(qty) || 1 };
    });
  }, [queryBatches, queryBatchId, queryQuantity]);

  const activeQuantity = useMemo(() => {
    return parsedBatches.reduce((acc, item) => acc + item.quantity, 0);
  }, [parsedBatches]);

  const activeBatchId = useMemo(() => {
    if (parsedBatches.length > 0) {
      return parsedBatches[0].batchId;
    }
    return (queryBatchId as string) || '';
  }, [parsedBatches, queryBatchId]);

  // Identity state
  const [ticketId, setTicketId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [event, setEvent] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [selectedBatches, setSelectedBatches] = useState<any[]>([]);

  const activeEventId = (eventId as string) || '';

  // Sync params
  useEffect(() => {
    if (queryTicketId) setTicketId(queryTicketId as string);
    if (queryUserId) setUserId(queryUserId as string);
  }, [queryTicketId, queryUserId]);

  // Payment states
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'success' | 'pending_pix' | 'pending_card_review' | 'rejected' | 'expired'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
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
  const [ticketPrice, setTicketPrice] = useState(100.0);
  const [eventTitle, setEventTitle] = useState('Carregando evento...');
  const [copied, setCopied] = useState(false);

  // Additional holders
  const [holders, setHolders] = useState<Array<{ name: string; cpf: string }>>([]);

  // PIX details
  const [pixCode, setPixCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');

  // Dynamic installments
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([]);

  // E-mail validation
  const [emailError, setEmailError] = useState('');

  // Coupon code
  const [couponCode, setCouponCode] = useState('');

  // Touched states
  const [nameTouched, setNameTouched] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [buttonAlertText, setButtonAlertText] = useState('');

  // Initialize holders
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

  // Sync first holder
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
    isValidCpf(buyerCpf);

  const isHoldersInfoComplete = holders.every((h, idx) => {
    if (idx === 0) return true;
    return h.name.trim().length > 3 && isValidCpf(h.cpf);
  });

  const isCardInfoComplete =
    cardNumber.length === 19 &&
    cardholderName.trim().length > 3 &&
    cardExpiry.length === 5 &&
    cardCvc.length >= 3;

  const isFormComplete =
    isBuyerInfoComplete &&
    isHoldersInfoComplete &&
    (paymentMethod === 'pix' || (paymentMethod === 'credit_card' && isCardInfoComplete));

  const isNameInvalid = (nameTouched || submitAttempted) && buyerName.trim().length <= 3;
  const isCpfInvalid = (cpfTouched || submitAttempted) && !isValidCpf(buyerCpf);

  const isCardNumberInvalid = submitAttempted && cardNumber.length !== 19;
  const isCardholderNameInvalid = submitAttempted && cardholderName.trim().length <= 3;
  const isCardExpiryInvalid = submitAttempted && cardExpiry.length !== 5;
  const isCardCvcInvalid = submitAttempted && cardCvc.length < 3;

  // Lock expiration handler
  const handleLockExpired = () => {
    setPaymentStatus('expired');
    setErrorMessage('Sua sessão de reserva expirou. O ingresso foi liberado de volta ao estoque.');
  };

  const returnToEvent = () => {
    router.push(activeEventId ? `/event/${activeEventId}` : '/events');
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

  const { timeLeft, formattedTime } = useTicketLock({
    userId,
    ticketId,
    eventId: activeEventId,
    batchId: activeBatchId,
    onExpired: handleLockExpired,
  });

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 180) * 100));

  // Fetch and reserve
  useEffect(() => {
    if (!activeEventId || parsedBatches.length === 0) return;

    const fetchDetailsAndReserve = async () => {
      try {
        const res = await fetch(`/api/events/${activeEventId}`);
        if (!res.ok) {
          throw new Error('Falha ao obter detalhes do evento.');
        }
        const data = await res.json();
        setEvent(data);
        setEventTitle(data.title);

        let computedTotalPrice = 0;
        const resolvedBatches: any[] = [];
        
        parsedBatches.forEach(item => {
          const matchingBatch = data.batches?.find((b: any) => b.id === item.batchId);
          if (matchingBatch) {
            resolvedBatches.push({ ...matchingBatch, selectedQty: item.quantity });
            computedTotalPrice += Number(matchingBatch.price) * item.quantity;
          }
        });

        if (resolvedBatches.length === 0) {
          throw new Error('Lote(s) não encontrado(s) para este evento.');
        }

        setSelectedBatch(resolvedBatches[0]);
        setSelectedBatches(resolvedBatches);
        setTicketPrice(computedTotalPrice / activeQuantity);
        calculateInstallments(computedTotalPrice);

        if (!queryTicketId && !ticketId) {
          const reserveRes = await fetch('/api/tickets/reserve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              eventId: activeEventId,
              items: parsedBatches.map(item => {
                const batch = data.batches?.find((b: any) => b.id === item.batchId);
                return {
                  batchId: item.batchId,
                  price: Number(batch?.price || 0),
                  isHalfPrice: !!batch?.meiaEntrada,
                  quantity: item.quantity
                };
              })
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
  }, [activeEventId, parsedBatches, queryTicketId, ticketId, activeQuantity]);

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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';

    formatted = raw
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setBuyerCpf(formatted.substring(0, 14));
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
        throw new Error(formatPaymentError(data));
      }

      if (data.status === 'approved') {
        await scrollToTopEased();
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

  // Checkout page current step calculation
  const currentStep = useMemo(() => {
    if (paymentMethod !== null && isBuyerInfoComplete && isHoldersInfoComplete) return 3;
    if (isBuyerInfoComplete) return 2;
    return 1;
  }, [paymentStatus, paymentMethod, isBuyerInfoComplete, isHoldersInfoComplete]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] font-sans antialiased text-[#111111] relative overflow-hidden">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="lazyOnload" />

      <main className="max-w-6xl mx-auto w-full px-6 py-12 flex-grow relative z-10">
        
        {/* Navigation back */}
        <button
          onClick={returnToEvent}
          className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-[#FF3200] transition-colors mb-6 cursor-pointer border-none bg-transparent"
        >
          <FaArrowLeft className="w-4 h-4" />
          Voltar para Eventos
        </button>

        {/* STEP PROGRESS BAR */}
        <div className="max-w-xl mx-auto mb-10 flex items-center justify-between text-xs font-bold text-neutral-450 border-b border-[#EAEAEA] pb-6">
          <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-[#FF3200]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 1 ? 'border-[#FF3200] bg-[#FF3200] text-white' : 'border-neutral-300'}`}>1</span>
            Identificação
          </div>
          <div className="h-0.5 flex-grow mx-4 bg-[#EAEAEA]" />
          <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-[#FF3200]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 2 ? 'border-[#FF3200] bg-[#FF3200] text-white' : 'border-neutral-300'}`}>2</span>
            Titulares
          </div>
          <div className="h-0.5 flex-grow mx-4 bg-[#EAEAEA]" />
          <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-[#FF3200]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 3 ? 'border-[#FF3200] bg-[#FF3200] text-white' : 'border-neutral-300'}`}>3</span>
            Pagamento
          </div>
          <div className="h-0.5 flex-grow mx-4 bg-[#EAEAEA]" />
          <div className={`flex items-center gap-1.5 ${currentStep >= 4 ? 'text-[#FF3200]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${currentStep >= 4 ? 'border-[#FF3200] bg-[#FF3200] text-white' : 'border-neutral-300'}`}>4</span>
            Conclusão
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-[#EAEAEA] bg-neutral-50/50">
                <h2 className="text-2xl font-bold text-neutral-900 leading-tight">
                  Finalize sua compra
                </h2>
                <p className="text-neutral-500 text-sm mt-1">
                  Confirme seus dados e escolha a forma de pagamento de maneira 100% segura.
                </p>
              </div>

              {paymentStatus === 'pending_card_review' ? (
                <div className="text-center py-16 px-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-amber-50 border-4 border-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 shadow-sm animate-pulse">
                    <FaClock className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900">Pagamento em Análise</h3>
                  <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed font-light">
                    O Mercado Pago está revisando a transação do cartão. O lock do seu ingresso foi estendido por 15 minutos para sua segurança.
                  </p>
                </div>
              ) : paymentStatus === 'pending_pix' ? (
                <div className="text-center py-10 px-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-full shadow-sm">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Aguardando Pagamento
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900">Pague via PIX</h3>

                  {pixQrBase64 && (
                    <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto border border-[#EAEAEA]">
                      <img
                        src={`data:image/png;base64,${pixQrBase64}`}
                        alt="QR Code PIX"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-4 max-w-md mx-auto">
                    <p className="text-neutral-500 text-xs leading-relaxed font-light">
                      Copie o código PIX abaixo para pagar no aplicativo do seu banco. Sua reserva expira em 15 minutos.
                    </p>

                    <div className="flex items-center bg-[#FAFAFA] border border-[#DCDCDC] p-2 rounded-full">
                      <input
                        type="text"
                        readOnly
                        value={pixCode}
                        className="bg-transparent text-neutral-800 text-xs font-semibold flex-1 outline-none font-sans truncate px-4 border-none"
                      />
                      <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-1.5 px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer border-none ${copied
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#FF3200] hover:bg-[#E62D00] text-white shadow-sm'
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
                  <div className="w-20 h-20 bg-red-50 border-4 border-red-100 rounded-full flex items-center justify-center mx-auto text-red-550 shadow-sm">
                    <FaClock className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900">Reserva Expirada</h3>
                  <p className="text-neutral-500 text-sm max-w-sm mx-auto leading-relaxed">
                    {errorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={returnToEvent}
                    className="bg-[#FF3200] hover:bg-[#E62D00] text-white px-8 py-3 rounded-full font-bold transition-all shadow-sm active:scale-95 text-sm cursor-pointer inline-block border-none"
                  >
                    Voltar para o evento
                  </button>
                </div>
              ) : (
                <form id="checkout-form" onSubmit={handlePaymentSubmit} className="divide-y divide-[#EAEAEA]">
                  {/* 1. DADOS DE ACESSO */}
                  <div className="p-6 md:p-8 space-y-4">
                    <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#FF3200]/10 text-[#FF3200] text-xs font-bold flex items-center justify-center">1</span>
                      Dados do comprador
                    </h3>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Nome Completo *</label>
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
                        className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white ${isNameInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                          }`}
                      />
                      {isNameInvalid && (
                        <p className="text-red-500 text-xs font-medium mt-1">Insira seu nome completo (mínimo 4 caracteres)</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">E-mail *</label>
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
                        className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white ${emailError ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                          }`}
                      />
                      {emailError && (
                        <p className="text-red-500 text-xs font-medium mt-1">{emailError}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">CPF do Comprador *</label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        required
                        value={buyerCpf}
                        onChange={(e) => {
                          handleCpfChange(e);
                          if (cpfTouched && isValidCpf(e.target.value)) {
                            setCpfTouched(false);
                          }
                        }}
                        onBlur={() => setCpfTouched(true)}
                        disabled={paymentStatus === 'processing'}
                        className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white ${isCpfInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                          }`}
                      />
                      {isCpfInvalid && (
                        <p className="text-red-500 text-xs font-medium mt-1">Insira um CPF válido</p>
                      )}
                    </div>
                  </div>

                  {/* Titularidade dos ingressos */}
                  {activeQuantity > 1 && (
                    <div className="p-6 md:p-8 border-b border-[#EAEAEA] space-y-4">
                      <h4 className="text-sm font-bold text-neutral-850 uppercase tracking-wider">Identificação dos Ingressos</h4>
                      <p className="text-neutral-500 text-xs leading-normal font-light">
                        Preencha o Nome e o CPF de cada titular. Você poderá alterar estas informações posteriormente no seu perfil.
                      </p>
                      
                      {holders.map((holder, index) => {
                        if (index === 0) return null;
                        return (
                          <div key={index} className="p-5 bg-neutral-50 border border-[#EAEAEA] rounded-2xl space-y-3">
                            <span className="text-xs font-bold text-neutral-700 block">
                              Ingresso #{index + 1}
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Nome do Titular *</label>
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
                                  className="w-full bg-white border border-[#DCDCDC] rounded-full px-4 py-2.5 text-xs text-neutral-800 outline-none focus:ring-2 focus:ring-[#FF3200]/10 focus:border-[#FF3200] transition-all"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">CPF do Titular *</label>
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
                                  className="w-full bg-white border border-[#DCDCDC] rounded-full px-4 py-2.5 text-xs text-neutral-800 outline-none focus:ring-2 focus:ring-[#FF3200]/10 focus:border-[#FF3200] transition-all"
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
                    <div className="p-6 md:px-8 bg-neutral-50/50 border-y border-[#EAEAEA]">
                      <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-[#FF3200]/10 text-[#FF3200] text-xs font-bold flex items-center justify-center">2</span>
                        Forma de Pagamento
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${paymentMethod === 'credit_card'
                            ? 'border-[#FF3200] bg-[#FF3200]/5 text-[#FF3200] shadow-sm'
                            : 'border-[#EAEAEA] bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 hover:bg-neutral-50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <FaCreditCard className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-sm">Cartão de Crédito</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${paymentMethod === 'credit_card'
                            ? 'border-[#FF3200] bg-[#FF3200] text-white scale-110'
                            : 'border-neutral-300 bg-transparent'
                            }`}>
                            {paymentMethod === 'credit_card' && <FaCircleCheck className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('pix')}
                          className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${paymentMethod === 'pix'
                            ? 'border-[#FF3200] bg-[#FF3200]/5 text-[#FF3200] shadow-sm'
                            : 'border-[#EAEAEA] bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 hover:bg-neutral-50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <FaPix className="w-5 h-5 shrink-0" />
                            <span className="font-bold text-sm">PIX Instantâneo</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${paymentMethod === 'pix'
                            ? 'border-[#FF3200] bg-[#FF3200] text-white scale-110'
                            : 'border-neutral-300 bg-transparent'
                            }`}>
                            {paymentMethod === 'pix' && <FaCircleCheck className="w-4 h-4 text-white" />}
                          </div>
                        </button>
                      </div>
                    </div>

                    {paymentMethod !== null && (
                      <div className="p-6 md:p-8 space-y-5 animate-in fade-in slide-in-from-top-3 duration-250">
                        {errorMessage && (
                          <div className="bg-red-50 border border-red-200 text-red-500 text-xs p-4 rounded-xl font-medium">
                            {errorMessage}
                          </div>
                        )}

                        {paymentMethod === 'credit_card' ? (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Número do Cartão *</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="4000 1234 5678 9010"
                                  required
                                  value={cardNumber}
                                  onChange={handleCardNumberChange}
                                  disabled={paymentStatus === 'processing'}
                                  className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white ${isCardNumberInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                                    }`}
                                />
                                <div className="absolute right-5 top-3.5 text-[#FF3200] text-xs font-bold uppercase font-mono select-none">
                                  {issuerId}
                                </div>
                              </div>
                              {isCardNumberInvalid && (
                                <p className="text-red-500 text-xs font-medium mt-1">Insira um número de cartão válido (16 dígitos)</p>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Nome Impresso no Cartão *</label>
                              <input
                                type="text"
                                placeholder="JOAO H SILVA"
                                required
                                value={cardholderName}
                                onChange={(e) => setCardholderName(e.target.value)}
                                disabled={paymentStatus === 'processing'}
                                className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 uppercase focus:bg-white ${isCardholderNameInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                                  }`}
                              />
                              {isCardholderNameInvalid && (
                                <p className="text-red-500 text-xs font-medium mt-1">Insira o nome impresso no cartão (mínimo 4 caracteres)</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Validade *</label>
                                <input
                                  type="text"
                                  placeholder="MM/AA"
                                  required
                                  value={cardExpiry}
                                  onChange={handleExpiryChange}
                                  disabled={paymentStatus === 'processing'}
                                  className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white ${isCardExpiryInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                                    }`}
                                />
                                {isCardExpiryInvalid && (
                                  <p className="text-red-500 text-xs font-medium mt-1">Validade inválida (MM/AA)</p>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Código CVC *</label>
                                <input
                                  type="text"
                                  placeholder="123"
                                  required
                                  value={cardCvc}
                                  onChange={handleCvcChange}
                                  disabled={paymentStatus === 'processing'}
                                  className={`w-full bg-[#FAFAFA] border rounded-full px-5 py-3 text-sm text-neutral-800 outline-none transition-all duration-200 focus:bg-white ${isCardCvcInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-500/10' : 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-2 focus:ring-[#FF3200]/10'
                                    }`}
                                />
                                {isCardCvcInvalid && (
                                  <p className="text-red-500 text-xs font-medium mt-1">CVC inválido (3 ou 4 dígitos)</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Parcelamento (Mercado Pago) *</label>
                              <select
                                required
                                value={installments}
                                onChange={(e) => setInstallments(Number(e.target.value))}
                                disabled={paymentStatus === 'processing'}
                                className="w-full bg-[#FAFAFA] border border-[#DCDCDC] rounded-full px-5 py-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#FF3200]/10 focus:border-[#FF3200] focus:bg-white transition-all duration-200 cursor-pointer"
                              >
                                {installmentOptions.map((opt) => (
                                  <option key={opt.installments} value={opt.installments} className="text-neutral-800">
                                    {opt.recommended_message}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl space-y-3">
                            <h4 className="font-bold text-emerald-600 text-sm flex items-center">
                              <FaCircleCheck className="w-4 h-4 mr-2 text-emerald-650" />
                              Pagamento PIX Instantâneo
                            </h4>
                            <ul className="text-neutral-500 text-xs space-y-2 list-disc list-inside font-light">
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
                    <div className="p-6 md:p-8 bg-neutral-50/30 border-t border-[#EAEAEA] space-y-3 animate-in fade-in duration-200">
                      <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF3200]/10 text-[#FF3200] text-[10px] font-bold flex items-center justify-center">3</span>
                        Informações Relevantes
                      </h3>
                      <div className="text-xs text-neutral-500 space-y-2 leading-relaxed font-light">
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

          {/* Right Column: Timer & Summary */}
          <div className="lg:col-span-5 space-y-6">
            {/* Countdown timer bar */}
            <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-sm overflow-hidden">
              <div className="h-1.5 bg-neutral-100">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 60 ? 'bg-amber-500' : 'bg-[#FF3200]'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-bold ${timeLeft < 60 ? 'text-amber-600' : 'text-[#FF3200]'}`}>
                    {timeLeft < 60 ? 'Tempo esgotando' : 'Reserva ativa'}
                  </span>
                  <span className={`text-lg font-sans font-black tracking-wider ${timeLeft < 60 ? 'text-amber-600' : 'text-neutral-900'}`}>
                    {formattedTime}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-normal font-light">
                  Seus ingressos estão reservados enquanto você conclui a compra.
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-sm p-6 space-y-5">
              <h3 className="text-lg font-bold text-neutral-900 border-b border-[#EAEAEA] pb-3">Resumo do Pedido</h3>

              {event && (
                <div className="flex gap-4 items-start pb-4 border-b border-[#EAEAEA]">
                  {event.image && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm shrink-0 border border-[#EAEAEA]">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-neutral-900 leading-tight">{event.title}</p>
                    {displayDateStr && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <FaCalendarDays className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{displayDateStr}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <FaLocationDot className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-start text-sm">
                  <div>
                    <span className="font-bold text-neutral-900">{activeQuantity}x Ingresso(s)</span>
                    {selectedBatches.length > 0 ? (
                      <div className="space-y-0.5 mt-1.5">
                        {selectedBatches.map((sb, idx) => (
                          <span key={idx} className="text-[11px] text-neutral-500 block font-medium">
                            {sb.selectedQty}x {sb.name} ({sb.sectorName?.toUpperCase() || 'GERAL'})
                          </span>
                        ))}
                      </div>
                    ) : selectedBatch && (
                      <span className="text-xs text-neutral-500 block mt-0.5 font-medium">
                        Setor: {selectedBatch.sectorName?.toUpperCase() || 'SUPERIOR'}
                      </span>
                    )}
                  </div>
                  <span className="font-sans text-neutral-900 font-bold mt-0.5">R$ {(ticketPrice * activeQuantity).toFixed(2).replace('.', ',')}</span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-500 pt-2 border-t border-[#EAEAEA]">
                  <div className="flex justify-between">
                    <span>Taxa de Conveniência</span>
                    <span className="font-sans">R$ 0,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descontos</span>
                    <span className="font-sans">R$ 0,00</span>
                  </div>
                </div>

                {/* Discount Coupon code */}
                <div className="pt-2.5 pb-1 border-t border-[#EAEAEA]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cupom indisponível"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled
                      className="flex-1 bg-neutral-100 border border-[#DCDCDC] rounded-full px-4 py-1.5 text-xs text-neutral-400 outline-none cursor-not-allowed uppercase"
                    />
                    <button
                      type="button"
                      disabled
                      className="px-4 py-1.5 rounded-full text-xs font-bold transition-all border-none bg-neutral-100 text-neutral-400 cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Safety seal indicator */}
                <div className="flex items-center justify-center space-x-2 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl py-2.5 px-3">
                  <FaLock className="w-3.5 h-3.5 text-emerald-650 shrink-0" />
                  <span className="font-extrabold uppercase tracking-wider">Ambiente 100% Seguro</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#EAEAEA]">
                  <span className="text-base font-bold text-neutral-900">Total</span>
                  <span className="text-3xl font-sans text-[#FF3200] font-black tracking-tight">R$ {(ticketPrice * activeQuantity).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Form Action submit button */}
              {paymentStatus !== 'pending_pix' && paymentStatus !== 'pending_card_review' && paymentStatus !== 'expired' && (
                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type={paymentMethod === null ? 'button' : 'submit'}
                    form="checkout-form"
                    disabled={paymentStatus === 'processing' || !ticketId}
                    className={`w-full py-4 rounded-full font-bold transition-all text-sm text-center block border border-transparent ${paymentMethod !== null && paymentStatus !== 'processing' && ticketId ? 'active:scale-[0.98]' : ''
                      } ${paymentStatus === 'processing' || !ticketId
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none'
                        : paymentMethod === null
                          ? 'bg-transparent text-[#FF3200] border-2 border-[#FF3200] shadow-none pointer-events-none'
                          : paymentMethod === 'pix'
                            ? 'bg-[#FF3200] text-white hover:bg-[#E62D00] cursor-pointer hover:shadow-md'
                            : !isFormComplete
                              ? 'bg-neutral-100 text-neutral-450 cursor-pointer shadow-none hover:bg-neutral-200/50'
                              : 'bg-[#FF3200] text-white hover:bg-[#E62D00] cursor-pointer hover:shadow-md'
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

      <footer className="text-center text-xs text-neutral-400 py-8 border-t border-[#EAEAEA] max-w-6xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}
