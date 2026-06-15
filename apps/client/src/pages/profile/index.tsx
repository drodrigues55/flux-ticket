import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Header } from '../../components/header';
import {
  FaEnvelope,
  FaKey,
  FaSpinner,
  FaTicketSimple,
  FaCalendarDays,
  FaLocationDot,
  FaAddressCard,
  FaArrowRightFromBracket,
  FaQrcode,
  FaXmark,
  FaApple,
  FaGooglePay,
  FaLink,
  FaRotate
} from 'react-icons/fa6';

interface Ticket {
  id: string;
  status: string;
  price: number;
  meiaEntrada: boolean;
  hmacSignature?: string;
  buyerCpf: string;
  createdAt: string;
  holderName?: string | null;
  holderCpf?: string | null;
  isTransferred: boolean;
  batch: {
    name: string;
    sectorName?: string;
    event: {
      id: string;
      title: string;
      date: string;
      location: string;
    };
  };
}

export default function ProfilePage() {
  const router = useRouter();

  // Auth state
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedQrTicket, setSelectedQrTicket] = useState<Ticket | null>(null);

  // Transfer modal state
  const [selectedTransferTicket, setSelectedTransferTicket] = useState<Ticket | null>(null);
  const [transferName, setTransferName] = useState('');
  const [transferCpf, setTransferCpf] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [copiedLinkTicketId, setCopiedLinkTicketId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredTickets = tickets.filter((ticket) =>
    ticket.batch.event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.batch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check session on mount
  useEffect(() => {
    const session = localStorage.getItem('flux_user_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setLoggedInUser(parsed);
      } catch (err) {
        localStorage.removeItem('flux_user_session');
      }
    }
  }, []);

  // Fetch tickets when loggedInUser updates
  useEffect(() => {
    if (!loggedInUser) return;
    const userId = loggedInUser.id;

    async function fetchTickets() {
      setLoadingTickets(true);
      try {
        const res = await fetch(`/api/tickets/user?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data);
        }
      } catch (err) {
        console.error('[TICKETS FETCH ERROR]', err);
      } finally {
        setLoadingTickets(false);
      }
    }

    fetchTickets();
  }, [loggedInUser]);

  // Auth flow handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar código.');

      setStep('otp');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) return;

    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido.');

      localStorage.setItem('flux_user_session', JSON.stringify(data.user));
      setLoggedInUser(data.user);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('flux_user_session');
    setLoggedInUser(null);
    setStep('email');
    setEmail('');
    setOtpCode('');
    setTickets([]);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferTicket || !loggedInUser) return;

    setTransferLoading(true);
    setTransferError('');
    setTransferSuccess(false);

    try {
      const res = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTransferTicket.id,
          holderName: transferName,
          holderCpf: transferCpf,
          currentUserId: loggedInUser.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar transferência.');

      setTransferSuccess(true);

      // Refresh tickets list
      const ticketRes = await fetch(`/api/tickets/user?userId=${loggedInUser.id}`);
      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        setTickets(ticketData);
      }

      // Close modal after delay
      setTimeout(() => {
        setSelectedTransferTicket(null);
        setTransferName('');
        setTransferCpf('');
        setTransferSuccess(false);
      }, 2000);
    } catch (err: any) {
      setTransferError(err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleCopyAccessLink = (ticketId: string) => {
    const url = window.location.origin + '/ticket/' + ticketId;
    navigator.clipboard.writeText(url);
    setCopiedLinkTicketId(ticketId);
    setTimeout(() => {
      setCopiedLinkTicketId(null);
    }, 2500);
  };

  const handleDownloadPkpass = (ticketId: string) => {
    // Direct trigger download of pkpass
    window.location.href = `/api/tickets/${ticketId}/pkpass`;
  };

  const handleSaveGooglePay = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/googlepay`);
      if (res.ok) {
        const data = await res.json();
        if (data.saveUrl) {
          window.open(data.saveUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('[GOOGLE PAY ERROR]', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[180px] pointer-events-none" />
      <Header />

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-12 flex flex-col">
        {!loggedInUser ? (
          // Auth Section
          <div className="flex-grow flex items-center justify-center py-10">
            <div className="w-full max-w-md bg-[#18181B] rounded-3xl border border-white/10 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-r from-[#1F1F23]/50 to-[#252528]/30 text-center space-y-2">
                <div className="w-12 h-12 bg-[#9146FF]/10 text-[#B388FF] rounded-2xl flex items-center justify-center mx-auto text-xl">
                  <FaKey />
                </div>
                <h2 className="text-xl font-extrabold text-white">Acesse seus Ingressos</h2>
                <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
                  Enviaremos um código único de 6 dígitos para o seu e-mail para acesso seguro.
                </p>
              </div>

              <div className="p-8">
                {authError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl font-medium mb-5">
                    {authError}
                  </div>
                )}

                {step === 'email' ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-450">Endereço de E-mail</label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                          type="email"
                          placeholder="seuemail@exemplo.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#080D1A]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] focus:bg-[#080D1A] transition-all duration-200"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-[#9146FF] hover:bg-[#A970FF] text-white rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : 'Enviar Código'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-450">Código de 6 dígitos</label>
                      <div className="relative">
                        <FaKey className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#080D1A]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] focus:bg-[#080D1A] transition-all duration-200 text-center tracking-widest font-mono text-lg font-bold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otpCode.length < 6}
                      className="w-full py-3.5 bg-[#2E7D32] hover:bg-[#1b5e20] text-white rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : 'Confirmar e Entrar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="w-full text-center text-xs font-semibold text-slate-400 hover:text-[#B388FF] mt-2 block border-none bg-transparent cursor-pointer"
                    >
                      Alterar E-mail
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Authenticated Dashboard
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* User Header Block */}
            <div className="bg-gradient-to-br from-[#4A148C] via-[#6200EE] to-[#3700B3] text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between items-start gap-4 relative overflow-hidden animate-in fade-in duration-300">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#B388FF]">Sua Carteira Digital</span>
                <h2 className="text-xl md:text-2xl font-black leading-tight">Olá, {loggedInUser.name.split('@')[0]}!</h2>
                <p className="text-slate-200 text-xs md:text-sm font-light">
                  Gerencie seus ingressos, histórico de compras e configurações de perfil com facilidade.
                </p>
              </div>

              {/* Search Bar inside banner */}
              <div className="relative w-full max-w-lg mt-2 z-10">
                <input
                  type="text"
                  placeholder="Pesquisar ingressos em minha carteira..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full bg-white/10 focus:bg-white text-white focus:text-slate-800 placeholder-white/60 focus:placeholder-slate-400 border border-white/20 rounded-2xl pl-4 pr-10 py-2.5 text-xs outline-none focus:ring-2 focus:ring-white/15 transition-all duration-200"
                />
                <svg className={`w-4 h-4 absolute right-3 top-3.5 transition-colors ${searchFocused ? 'text-slate-400' : 'text-white/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Main Content Layout (Sidebar + Content) */}
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span className="w-1 h-4 bg-[#9146FF] rounded-full inline-block" />
                Meus Ingressos
              </h3>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Left Sidebar */}
                <div className="w-full md:w-52 shrink-0 bg-[#18181B] border border-white/5 rounded-3xl p-3 space-y-1 shadow-sm">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#9146FF]/10 text-[#B388FF] transition-colors cursor-pointer text-left">
                    <FaTicketSimple className="w-3.5 h-3.5" />
                    Meus Ingressos
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer text-left">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Histórico
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer text-left">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Perfil
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#252528] transition-colors cursor-pointer text-left">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pagamentos
                  </button>
                </div>

                {/* Right Content */}
                <div className="flex-grow space-y-6 w-full">
                  {loadingTickets ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-[#18181B] border border-white/5 rounded-3xl">
                      <FaSpinner className="w-8 h-8 animate-spin text-[#9146FF]" />
                      <p className="text-sm font-semibold text-slate-400">Carregando seus ingressos...</p>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-16 px-6 border border-white/5 bg-[#18181B] rounded-3xl space-y-5 flex flex-col items-center justify-center shadow-sm animate-in fade-in duration-300">
                      <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center text-slate-400">
                        <FaTicketSimple className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <h4 className="font-extrabold text-sm text-white">
                          {searchQuery ? 'Nenhum ingresso encontrado para sua busca.' : 'Você não possui ingressos ativos no momento.'}
                        </h4>
                        <p className="text-slate-400 text-xs max-w-sm mx-auto">
                          {searchQuery ? 'Tente buscar por termos diferentes ou limpe o campo de busca.' : 'Confira as sugestões abaixo ou o seu histórico de compras.'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (searchQuery) {
                            setSearchQuery('');
                          } else {
                            router.push('/');
                          }
                        }}
                        className="bg-[#9146FF] hover:bg-[#A970FF] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                      >
                        {searchQuery ? 'Limpar Busca' : 'Ver Catálogo Completo'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                      {filteredTickets.map((ticket) => {
                        const eventDate = new Date(ticket.batch.event.date).toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        const isValid = ticket.status === 'VALID';

                        return (
                          <div
                            key={ticket.id}
                            className={`bg-[#18181B] border border-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                              ticket.isTransferred || (ticket.holderCpf && ticket.holderCpf !== ticket.buyerCpf)
                                ? 'opacity-70 saturate-50 hover:opacity-85'
                                : ''
                            }`}
                          >
                            <div className="p-6 space-y-4">
                              {/* Event info */}
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {ticket.batch.name}
                                  </span>
                                  <h4 className="font-extrabold text-sm text-white leading-snug">
                                    {ticket.batch.event.title}
                                  </h4>
                                  {ticket.holderName && (
                                    <div className="text-[10px] text-slate-400 font-semibold mt-1">
                                      Titular: <span className="font-bold text-slate-200">{ticket.holderName}</span>
                                    </div>
                                  )}
                                </div>

                                {ticket.meiaEntrada && (
                                  <span className="bg-white/5 text-slate-350 border border-white/10 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                    Meia
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2 border-t border-white/5 pt-3">
                                <div className="flex items-center gap-2 text-xs text-slate-350">
                                  <FaCalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{eventDate}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-350">
                                  <FaLocationDot className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span className="truncate">{ticket.batch.event.location}</span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="pt-2 flex flex-wrap gap-1.5">
                                {(ticket.isTransferred || (ticket.holderCpf && ticket.holderCpf !== ticket.buyerCpf)) && (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-bold">
                                    Transferido
                                  </span>
                                )}
                                {ticket.status === 'VALID' ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    Ingresso Ativo
                                  </span>
                                ) : ticket.status === 'PENDING_VALIDATION' ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
                                    Pendente de Comprovação
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                                    {ticket.status}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card footer action buttons */}
                            <div className="bg-[#0D1526]/50 border-t border-white/5 p-4 flex flex-col gap-2.5">
                              {ticket.isTransferred || (ticket.holderCpf && ticket.holderCpf !== ticket.buyerCpf) ? (
                                <>
                                  <button
                                    onClick={() => handleCopyAccessLink(ticket.id)}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <FaLink className="w-3.5 h-3.5" />
                                    {copiedLinkTicketId === ticket.id ? 'Link Copiado!' : 'Copiar Link de Acesso'}
                                  </button>
                                  {!ticket.isTransferred && (
                                    <button
                                      onClick={() => setSelectedTransferTicket(ticket)}
                                      className="w-full py-2.5 bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <FaRotate className="w-3.5 h-3.5" />
                                      Alterar Titularidade
                                    </button>
                                  )}
                                </>
                              ) : isValid ? (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => handleDownloadPkpass(ticket.id)}
                                      className="bg-[#1e1e1e] hover:bg-black text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <FaApple className="w-4 h-4" />
                                      Apple Wallet
                                    </button>
                                    <button
                                      onClick={() => handleSaveGooglePay(ticket.id)}
                                      className="bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <FaGooglePay className="w-6 h-6 text-[#1A73E8]" />
                                      Google Pay
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => setSelectedQrTicket(ticket)}
                                    className="w-full py-2 bg-[#9146FF] hover:bg-[#A970FF] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <FaQrcode className="w-3.5 h-3.5" />
                                    Visualizar QR Code
                                  </button>
                                  <button
                                    onClick={() => setSelectedTransferTicket(ticket)}
                                    className="w-full py-2.5 bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <FaRotate className="w-3.5 h-3.5" />
                                    Alterar Titularidade
                                  </button>
                                </>
                              ) : ticket.status === 'PENDING_VALIDATION' ? (
                                <>
                                  <button
                                    onClick={() => router.push(`/profile/validate/${ticket.id}`)}
                                    className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <FaAddressCard className="w-4 h-4" />
                                    Validar Meia-Entrada
                                  </button>
                                  <button
                                    onClick={() => setSelectedTransferTicket(ticket)}
                                    className="w-full py-2.5 bg-transparent hover:bg-white/5 text-slate-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <FaRotate className="w-3.5 h-3.5" />
                                    Alterar Titularidade
                                  </button>
                                </>
                              ) : (
                                <div className="text-center text-xs text-slate-400 py-1.5">
                                  Este ingresso não está ativo.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggestions block shows up if tickets is empty */}
                  {tickets.length === 0 && (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-300 delay-100">
                      <h3 className="text-sm font-black text-white">
                        Sugestões para Você
                      </h3>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Event 1 */}
                        <div className="bg-[#18181B] border border-white/5 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row hover:shadow-[0_0_15px_rgba(145,70,255,0.15)] transition-all">
                          <div className="w-full sm:w-32 h-24 relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white p-3 text-center shrink-0">
                            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                              </svg>
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-wider relative z-10 leading-snug">Música</span>
                          </div>
                          <div className="p-4 flex flex-col justify-between flex-grow">
                            <div className="space-y-0.5">
                              <h4 className="font-extrabold text-xs text-white leading-snug">Festival de Música da Cidade</h4>
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">OUT 12, 2026</span>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => router.push('/')}
                                className="bg-[#9146FF] hover:bg-[#A970FF] text-white px-3.5 py-1.5 rounded-xl font-bold text-[9px] transition-all cursor-pointer border-none"
                              >
                                Ver Detalhes
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Event 2 */}
                        <div className="bg-[#18181B] border border-white/5 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row hover:shadow-[0_0_15px_rgba(145,70,255,0.15)] transition-all">
                          <div className="w-full sm:w-32 h-24 relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center text-white p-3 text-center shrink-0">
                            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
                              </svg>
                            </div>
                            <span className="font-black text-[10px] uppercase tracking-wider relative z-10 leading-snug">Teatro</span>
                          </div>
                          <div className="p-4 flex flex-col justify-between flex-grow">
                            <div className="space-y-0.5">
                              <h4 className="font-extrabold text-xs text-white leading-snug">Teatro: A Comédia do Ano</h4>
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">SET 30, 2026</span>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => router.push('/')}
                                className="bg-[#9146FF] hover:bg-[#A970FF] text-white px-3.5 py-1.5 rounded-xl font-bold text-[9px] transition-all cursor-pointer border-none"
                              >
                                Comprar Ingressos
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Viewer Modal */}
      {selectedQrTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181B] rounded-3xl border border-white/10 shadow-2xl p-6 w-full max-w-sm relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedQrTicket(null)}
              className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 p-1.5 rounded-full cursor-pointer text-slate-400 transition-all duration-200 z-10 border-none"
            >
              <FaXmark className="w-4 h-4" />
            </button>

            <div className="text-center space-y-5 py-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-white text-lg leading-tight">
                  {selectedQrTicket.batch.event.title}
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Setor: {selectedQrTicket.batch.name}
                </p>
              </div>

              {/* Dynamic QR Code based on HMAC signature link */}
              <div className="bg-white p-4 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `https://flux-tickets.com/verify/${selectedQrTicket.id}?sig=${selectedQrTicket.hmacSignature}`
                  )}`}
                  alt="QR Code do Ingresso"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <FaQrcode className="w-3.5 h-3.5" />
                  Assinatura HMAC Válida
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                  Apresente este QR Code na portaria do evento. A assinatura digital garante a autenticidade offline.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {selectedTransferTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181B] rounded-3xl border border-white/10 shadow-2xl p-6 w-full max-w-md relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setSelectedTransferTicket(null);
                setTransferName('');
                setTransferCpf('');
                setTransferError('');
                setTransferSuccess(false);
              }}
              className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 p-1.5 rounded-full cursor-pointer text-slate-400 transition-all duration-200 z-10 border-none"
            >
              <FaXmark className="w-4 h-4" />
            </button>

            <form onSubmit={handleTransferSubmit} className="space-y-5 py-2">
              <div className="space-y-1">
                <h3 className="font-extrabold text-white text-lg leading-tight">
                  Alterar Titularidade
                </h3>
                <p className="text-slate-400 text-xs font-medium">
                  Transfira este ingresso para outra pessoa. Esta ação é irreversível e o ingresso ficará cinza na sua lista.
                </p>
              </div>

              {transferError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl font-medium">
                  {transferError}
                </div>
              )}

              {transferSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl font-medium">
                  Titularidade alterada com sucesso!
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nome do Novo Titular</label>
                    <input
                      type="text"
                      required
                      value={transferName}
                      onChange={(e) => setTransferName(e.target.value)}
                      placeholder="Nome completo do amigo/filiado"
                      className="w-full bg-[#080D1A]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] focus:bg-[#080D1A] transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">CPF do Novo Titular</label>
                    <input
                      type="text"
                      required
                      value={transferCpf}
                      onChange={(e) => setTransferCpf(e.target.value.replace(/\D/g, ''))}
                      placeholder="Somente números (ex: 12345678909)"
                      maxLength={11}
                      className="w-full bg-[#080D1A]/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#9146FF]/20 focus:border-[#9146FF] focus:bg-[#080D1A] transition-all duration-200 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={transferLoading}
                    className="w-full py-3.5 bg-[#9146FF] hover:bg-[#A970FF] text-white rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 border-none"
                  >
                    {transferLoading ? <FaSpinner className="w-4 h-4 animate-spin" /> : 'Confirmar Transferência'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-slate-550 py-8 border-t border-white/5 max-w-6xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}
