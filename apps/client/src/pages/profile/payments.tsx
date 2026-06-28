import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../../components/header';
import { FaCcAmex, FaCcDiscover, FaCcMastercard, FaCcVisa, FaCreditCard, FaKey, FaPen, FaPlus, FaShieldHalved, FaTrash } from 'react-icons/fa6';

interface SavedCard {
  id: string;
  brand: string;
  holder: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
}

const navItems = [
  { label: 'Meus Ingressos', href: '/profile' },
  { label: 'Perfil', href: '/profile/account' },
  { label: 'Pagamentos', href: '/profile/payments', active: true },
];

const emptyCard = {
  holder: '',
  number: '',
  expiry: '',
  cvv: '',
};

const detectCardBrand = (cardNumber: string) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return { brand: 'Visa', Icon: FaCcVisa };
  if (/^(5[1-5]|2[2-7])/.test(digits)) return { brand: 'Mastercard', Icon: FaCcMastercard };
  if (/^3[47]/.test(digits)) return { brand: 'Amex', Icon: FaCcAmex };
  if (/^(6011|65|64[4-9])/.test(digits)) return { brand: 'Discover', Icon: FaCcDiscover };
  return { brand: 'Cartao', Icon: FaCreditCard };
};

export default function ProfilePaymentsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [editingCard, setEditingCard] = useState<SavedCard | null>(null);
  const [cardDraft, setCardDraft] = useState(emptyCard);
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const canMutate = otpStep === 'verified';
  const maskedNumber = useMemo(() => cardDraft.number.replace(/\D/g, '').slice(-4), [cardDraft.number]);
  const detectedCard = useMemo(() => detectCardBrand(cardDraft.number), [cardDraft.number]);
  const hasCardDraft = useMemo(() => Boolean(cardDraft.holder.trim() || cardDraft.number.trim() || cardDraft.expiry.trim() || cardDraft.cvv.trim()), [cardDraft]);

  useEffect(() => {
    const session = localStorage.getItem('flux_user_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUserEmail(parsed.email || '');
      } catch (err) {}
    }

    const savedCards = localStorage.getItem('flux_saved_cards');
    const savedActivity = localStorage.getItem('flux_payment_activity');
    if (savedCards) {
      try {
        setCards(JSON.parse(savedCards));
      } catch (err) {
        localStorage.removeItem('flux_saved_cards');
      }
    }
    if (savedActivity) {
      try {
        setActivity(JSON.parse(savedActivity));
      } catch (err) {
        localStorage.removeItem('flux_payment_activity');
      }
    }
  }, []);

  const persist = (nextCards: SavedCard[], nextActivity: ActivityItem[]) => {
    setCards(nextCards);
    setActivity(nextActivity);
    localStorage.setItem('flux_saved_cards', JSON.stringify(nextCards));
    localStorage.setItem('flux_payment_activity', JSON.stringify(nextActivity));
  };

  const addActivity = (label: string, detail: string, nextCards = cards) => {
    const nextActivity = [
      { id: crypto.randomUUID(), label, detail, createdAt: new Date().toISOString() },
      ...activity,
    ].slice(0, 8);
    persist(nextCards, nextActivity);
  };

  const requestOtp = async () => {
    if (!userEmail) {
      setMessage('Entre no perfil antes de alterar pagamentos.');
      return;
    }

    setLoadingOtp(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nao foi possivel enviar o codigo.');
      setOtpStep('sent');
      setMessage('Codigo enviado para seu e-mail.');
    } catch (err: any) {
      setMessage(err.message || 'Falha ao enviar codigo.');
    } finally {
      setLoadingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setLoadingOtp(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email: userEmail, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Codigo invalido.');
      if (data.user) localStorage.setItem('flux_user_session', JSON.stringify(data.user));
      setOtpStep('verified');
      setMessage('Identidade confirmada. Voce pode alterar cartoes.');
    } catch (err: any) {
      setMessage(err.message || 'Falha ao validar codigo.');
    } finally {
      setLoadingOtp(false);
    }
  };

  const saveCard = () => {
    if (!canMutate) {
      setMessage('Confirme o codigo por e-mail antes de salvar cartoes.');
      return;
    }
    if (!cardDraft.holder.trim() || maskedNumber.length < 4 || !cardDraft.expiry.trim() || cardDraft.cvv.replace(/\D/g, '').length < 3) {
      setMessage('Preencha numero, validade, CVV e titular do cartao.');
      return;
    }

    let nextCards: SavedCard[];
    if (editingCard) {
      nextCards = cards.map((card) => card.id === editingCard.id
        ? { ...card, brand: detectedCard.brand, holder: cardDraft.holder, last4: maskedNumber, expiry: cardDraft.expiry }
        : card);
      addActivity('Cartao atualizado', `${detectedCard.brand} final ${maskedNumber}`, nextCards);
    } else {
      const nextCard: SavedCard = {
        id: crypto.randomUUID(),
        brand: detectedCard.brand,
        holder: cardDraft.holder,
        last4: maskedNumber,
        expiry: cardDraft.expiry,
        isDefault: cards.length === 0,
      };
      nextCards = [...cards, nextCard];
      addActivity('Cartao adicionado', `${nextCard.brand} final ${nextCard.last4}`, nextCards);
    }

    setCardDraft(emptyCard);
    setEditingCard(null);
    setOtpStep('idle');
    setOtpCode('');
  };

  const editCard = (card: SavedCard) => {
    setEditingCard(card);
    setCardDraft({ holder: card.holder, number: card.last4, expiry: card.expiry, cvv: '' });
  };

  const deleteCard = (card: SavedCard) => {
    if (!canMutate) {
      setMessage('Confirme o codigo por e-mail antes de excluir cartoes.');
      return;
    }
    const nextCards = cards.filter((item) => item.id !== card.id);
    persist(nextCards, [
      { id: crypto.randomUUID(), label: 'Cartao removido', detail: `${card.brand} final ${card.last4}`, createdAt: new Date().toISOString() },
      ...activity,
    ].slice(0, 8));
    setOtpStep('idle');
    setOtpCode('');
  };

  const handleCardAction = () => {
    if (otpStep === 'sent') {
      verifyOtp();
      return;
    }

    if (otpStep === 'verified') {
      saveCard();
      return;
    }

    requestOtp();
  };

  const cardActionLabel = loadingOtp
    ? otpStep === 'sent'
      ? 'Confirmando...'
      : 'Enviando...'
    : otpStep === 'sent'
      ? 'Confirmar codigo'
      : otpStep === 'verified'
        ? editingCard
          ? 'Salvar cartao'
          : 'Adicionar cartao'
        : 'Enviar codigo';

  return (
    <div className="min-h-screen flex flex-col flux-page font-sans antialiased">
      <Header />

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          <section className="flux-card p-6 md:p-8 rounded-[20px] shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wide text-[#FF3200]">Pagamentos</span>
              <h1 className="text-2xl font-black text-[var(--text)] mt-1">Cartoes e atividades</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2 max-w-2xl">
                Adicione, edite ou exclua cartoes apos confirmar sua identidade por e-mail.
              </p>
            </div>
          </section>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <aside className="w-full md:w-52 shrink-0 flux-card p-3 space-y-1 shadow-sm">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] text-xs text-left transition-colors cursor-pointer ${
                    item.active
                      ? 'font-bold bg-[#FF3200]/10 text-[#FF3200]'
                      : 'font-semibold text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </aside>

            <section className="flex-grow w-full space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="flux-card p-5 rounded-[20px] space-y-4">
                  <div className="flex items-center gap-2">
                    <FaPlus className="text-[#FF3200]" />
                    <h2 className="text-sm font-black text-[var(--text)]">{editingCard ? 'Editar cartao' : 'Adicionar cartao'}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative sm:col-span-2">
                      <detectedCard.Icon className="absolute left-4 top-3.5 w-5 h-5 text-[var(--text-subtle)]" />
                      <input
                        className="flux-input w-full pl-12 pr-4 py-3 text-sm"
                        value={cardDraft.number}
                        onChange={(event) => setCardDraft({ ...cardDraft, number: event.target.value.replace(/[^\d\s]/g, '').slice(0, 23) })}
                        placeholder="Numero do cartao"
                        inputMode="numeric"
                      />
                    </div>
                    <input
                      className="flux-input px-4 py-3 text-sm"
                      value={cardDraft.expiry}
                      onChange={(event) => setCardDraft({ ...cardDraft, expiry: event.target.value.replace(/[^\d/]/g, '').slice(0, 5) })}
                      placeholder="Validade MM/AA"
                      inputMode="numeric"
                    />
                    <input
                      className="flux-input px-4 py-3 text-sm"
                      value={cardDraft.cvv}
                      onChange={(event) => setCardDraft({ ...cardDraft, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                      placeholder="CVV"
                      inputMode="numeric"
                    />
                    <input
                      className="flux-input px-4 py-3 text-sm sm:col-span-2"
                      value={cardDraft.holder}
                      onChange={(event) => setCardDraft({ ...cardDraft, holder: event.target.value })}
                      placeholder="Nome do titular"
                    />
                  </div>
                  {message && (
                    <div className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface-muted)] border border-[var(--border)] rounded-[14px] p-3">
                      {message}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleCardAction}
                        disabled={!hasCardDraft || loadingOtp || (otpStep === 'sent' && otpCode.length < 6)}
                        className="w-full bg-[#FF3200] hover:bg-[#E62D00] text-white px-5 py-3 rounded-[14px] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cardActionLabel}
                      </button>
                      {editingCard && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCard(null);
                            setCardDraft(emptyCard);
                            setOtpStep('idle');
                            setOtpCode('');
                          }}
                          className="w-full flux-secondary-button px-5 py-3 rounded-[14px] text-sm font-bold"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    {hasCardDraft && (
                      <div className="w-full border border-[#FF3200]/20 bg-[#FF3200]/5 rounded-[14px] p-3 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                            <FaShieldHalved className="text-[#FF3200]" />
                            Verificacao por e-mail
                          </div>
                          <p className="text-xs font-semibold text-[var(--text-muted)]">
                            Solicite o codigo para confirmar sua identidade antes de alterar cartoes.
                          </p>
                        </div>
                        {otpStep === 'sent' && (
                          <div className="relative">
                            <FaKey className="absolute left-4 top-3.5 text-[var(--text-subtle)]" />
                            <input
                              value={otpCode}
                              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="flux-input w-full pl-11 pr-4 py-3 text-sm"
                              placeholder="Codigo de 6 digitos"
                            />
                          </div>
                        )}
                        {otpStep === 'verified' && (
                          <p className="text-xs font-bold text-emerald-600">Identidade confirmada para esta alteracao.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flux-card p-5 rounded-[20px] space-y-4">
                  <h2 className="text-sm font-black text-[var(--text)]">Cartoes salvos</h2>
                  {cards.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Nenhum cartao cadastrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {cards.map((card) => (
                        <div key={card.id} className="border border-[var(--border)] rounded-[14px] p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-[#FF3200]/10 text-[#FF3200] flex items-center justify-center">
                              <FaCreditCard />
                            </div>
                            <div>
                              <p className="text-sm font-black text-[var(--text)]">{card.brand} final {card.last4}</p>
                              <p className="text-xs text-[var(--text-muted)]">{card.holder} - vence {card.expiry}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => editCard(card)} className="flux-secondary-button p-2 rounded-[10px]" title="Editar cartao">
                              <FaPen className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => deleteCard(card)} className="text-red-600 bg-red-500/10 hover:bg-red-500/15 p-2 rounded-[10px] border border-red-500/20" title="Excluir cartao">
                              <FaTrash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flux-card p-5 rounded-[20px] space-y-4">
                <h2 className="text-sm font-black text-[var(--text)]">Atividades recentes</h2>
                {activity.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">As proximas alteracoes de cartao aparecerao aqui.</p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {activity.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-[var(--text)]">{item.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{item.detail}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-[var(--text-subtle)]">
                          {new Date(item.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
