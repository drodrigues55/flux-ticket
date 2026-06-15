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
  FaGooglePay
} from 'react-icons/fa6';

interface Ticket {
  id: string;
  status: string;
  price: number;
  meiaEntrada: boolean;
  hmacSignature?: string;
  createdAt: string;
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
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans antialiased text-slate-900">
      <Header />

      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-12 flex flex-col">
        {!loggedInUser ? (
          // Auth Section
          <div className="flex-grow flex items-center justify-center py-10">
            <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-200/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 md:p-8 border-b border-neutral-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/30 text-center space-y-2">
                <div className="w-12 h-12 bg-[#6200EE]/10 text-[#6200EE] rounded-2xl flex items-center justify-center mx-auto text-xl">
                  <FaKey />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Acesse seus Ingressos</h2>
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
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Endereço de E-mail</label>
                      <div className="relative">
                        <FaEnvelope className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                          type="email"
                          placeholder="seuemail@exemplo.com"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6200EE]/20 focus:border-[#6200EE] focus:bg-white transition-all duration-200"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-[#6200EE] hover:bg-[#5000c7] text-white rounded-2xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : 'Enviar Código'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Código de 6 dígitos</label>
                      <div className="relative">
                        <FaKey className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#F8F9FA] border border-neutral-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#6200EE]/20 focus:border-[#6200EE] focus:bg-white transition-all duration-200 text-center tracking-widest font-mono text-lg font-bold"
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
                      className="w-full text-center text-xs font-semibold text-slate-500 hover:text-[#6200EE] mt-2 block border-none bg-transparent cursor-pointer"
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
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#6200EE] rounded-full inline-block" />
                Meus Ingressos
              </h3>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Left Sidebar */}
                <div className="w-full md:w-52 shrink-0 bg-white border border-neutral-200/60 rounded-3xl p-3 space-y-1 shadow-sm">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#6200EE]/10 text-[#6200EE] transition-colors cursor-pointer text-left">
                    <FaTicketSimple className="w-3.5 h-3.5" />
                    Meus Ingressos
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-850 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Histórico
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-855 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Perfil
                  </button>
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-855 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pagamentos
                  </button>
                </div>

                {/* Right Content */}
                <div className="flex-grow space-y-6 w-full">
                  {loadingTickets ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-neutral-200/60 rounded-3xl">
                      <FaSpinner className="w-8 h-8 animate-spin text-[#6200EE]" />
                      <p className="text-sm font-semibold text-slate-400">Carregando seus ingressos...</p>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-16 px-6 border border-neutral-200/60 bg-white rounded-3xl space-y-5 flex flex-col items-center justify-center shadow-sm animate-in fade-in duration-300">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                        <FaTicketSimple className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 text-center">
                        <h4 className="font-extrabold text-sm text-slate-900">
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
                        className="bg-[#6200EE] hover:bg-[#5000c7] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
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
                            className="bg-white border border-neutral-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div className="p-6 space-y-4">
                              {/* Event info */}
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {ticket.batch.name}
                                  </span>
                                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                                    {ticket.batch.event.title}
                                  </h4>
                                </div>

                                {ticket.meiaEntrada && (
                                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                    Meia
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2 border-t border-neutral-100 pt-3">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <FaCalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{eventDate}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <FaLocationDot className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{ticket.batch.event.location}</span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="pt-2">
                                {ticket.status === 'VALID' ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    Ingresso Ativo
                                  </span>
                                ) : ticket.status === 'PENDING_VALIDATION' ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                    Pendente de Comprovação
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] text-red-600 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                    {ticket.status}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card footer action buttons */}
                            <div className="bg-slate-50 border-t border-neutral-100 p-4 flex flex-col gap-2.5">
                              {isValid ? (
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
                                      className="bg-white hover:bg-neutral-50 text-slate-800 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                    >
                                      <FaGooglePay className="w-6 h-6 text-[#1A73E8]" />
                                      Google Pay
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => setSelectedQrTicket(ticket)}
                                    className="w-full py-2 bg-[#6200EE] hover:bg-[#5000c7] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <FaQrcode className="w-3.5 h-3.5" />
                                    Visualizar QR Code
                                  </button>
                                </>
                              ) : ticket.status === 'PENDING_VALIDATION' ? (
                                <button
                                  onClick={() => router.push(`/profile/validate/${ticket.id}`)}
                                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                  <FaAddressCard className="w-4 h-4" />
                                  Validar Meia-Entrada
                                </button>
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
                      <h3 className="text-sm font-black text-slate-900">
                        Sugestões para Você
                      </h3>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Event 1 */}
                        <div className="bg-white border border-neutral-200/60 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row hover:shadow-md transition-all">
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
                              <h4 className="font-extrabold text-xs text-slate-900 leading-snug">Festival de Música da Cidade</h4>
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">OUT 12, 2026</span>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => router.push('/')}
                                className="bg-[#6200EE] hover:bg-[#5000c7] text-white px-3.5 py-1.5 rounded-xl font-bold text-[9px] transition-all cursor-pointer"
                              >
                                Ver Detalhes
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Event 2 */}
                        <div className="bg-white border border-neutral-200/60 rounded-3xl overflow-hidden shadow-sm flex flex-col sm:flex-row hover:shadow-md transition-all">
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
                              <h4 className="font-extrabold text-xs text-slate-900 leading-snug">Teatro: A Comédia do Ano</h4>
                              <span className="text-[9px] text-slate-400 font-bold uppercase block">SET 30, 2026</span>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => router.push('/')}
                                className="bg-[#6200EE] hover:bg-[#5000c7] text-white px-3.5 py-1.5 rounded-xl font-bold text-[9px] transition-all cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl p-6 w-full max-w-sm relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedQrTicket(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full cursor-pointer text-slate-500 transition-all duration-200 z-10"
            >
              <FaXmark className="w-4 h-4" />
            </button>

            <div className="text-center space-y-5 py-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                  {selectedQrTicket.batch.event.title}
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Setor: {selectedQrTicket.batch.name}
                </p>
              </div>

              {/* Dynamic QR Code based on HMAC signature link */}
              <div className="bg-slate-50 p-4 rounded-2xl w-48 h-48 mx-auto border border-neutral-200/80 shadow-md flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `https://flux-tickets.com/verify/${selectedQrTicket.id}?sig=${selectedQrTicket.hmacSignature}`
                  )}`}
                  alt="QR Code do Ingresso"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
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

      <footer className="text-center text-xs text-slate-400 py-8 border-t border-neutral-200/60 max-w-6xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}
