import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect } from 'react';
import { prisma } from '@flux/database';
import { track } from '../../lib/analytics';
import {
  FaCalendarDays,
  FaLocationDot,
  FaTicketSimple,
  FaTag,
  FaUser,
  FaAddressCard,
  FaShieldHalved,
  FaQrcode
} from 'react-icons/fa6';

interface PublicTicketPageProps {
  ticket: {
    id: string;
    status: string;
    price: number;
    meiaEntrada: boolean;
    hmacSignature: string | null;
    holderName: string | null;
    holderCpf: string | null;
    buyer: {
      name: string;
    };
    batch: {
      id: string;
      name: string;
      sectorName: string | null;
      event: {
        id: string;
        title: string;
        date: string;
        location: string;
      };
    };
  } | null;
}

export default function PublicTicketPage({ ticket }: PublicTicketPageProps) {
  useEffect(() => {
    if (!ticket) return;
    track({
      event: 'ticket_page_viewed',
      properties: {
        eventId: ticket.batch.event.id,
        batchId: ticket.batch.id,
        status: ticket.status,
      },
    });
  }, [ticket]);

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-neutral-200/60 shadow-lg space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Ingresso Não Encontrado</h1>
          <p className="text-slate-500 text-sm">
            O link de acesso utilizado é inválido ou o ingresso foi removido do sistema.
          </p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(ticket.batch.event.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayName = ticket.holderName || ticket.buyer.name.split('@')[0];
  const displayCpf = ticket.holderCpf || 'Não informado';

  const isValid = ticket.status === 'VALID';
  const isPending = ticket.status === 'PENDING_VALIDATION';
  const isConsumed = ticket.status === 'CONSUMED';

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <Head>
        <title>Ingresso - {ticket.batch.event.title}</title>
      </Head>
      
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[180px] pointer-events-none" />

      {/* Header */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-white/5 bg-[#0D1526]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <svg className="w-8 h-8 text-[#B388FF]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V6zm2 1v10h12V7H6zm3 2h6v2H9V9zm0 4h6v2H9v-2z" />
          </svg>
          <span className="font-extrabold text-xl tracking-tight text-white">Flux Tickets</span>
        </div>
        <div className="text-slate-400 text-xs font-semibold select-none">
          Acesso ao Ingresso
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-6 md:py-12">
        <div className="w-full max-w-lg bg-[#080D1A]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl relative">
          {/* Top color tag */}
          <div className={`h-2 w-full ${isValid ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : isConsumed ? 'bg-slate-500' : 'bg-red-500'}`} />

          <div className="p-6 md:p-8 space-y-6">
            
            {/* Event Name Banner */}
            <div className="text-center space-y-2 pb-4 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B388FF]">Ingresso Digital</span>
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                {ticket.batch.event.title}
              </h2>
              <div className="pt-2 flex justify-center">
                {isValid ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Ingresso Ativo / Válido
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                    Validação Pendente
                  </span>
                ) : isConsumed ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-bold bg-slate-500/10 px-3 py-1 rounded-full border border-slate-500/20">
                    Utilizado na Portaria
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    {ticket.status}
                  </span>
                )}
              </div>
            </div>

            {/* QR Code Section */}
            {(isValid || isPending) && ticket.hmacSignature && (
              <div className="space-y-4 text-center">
                <div className="bg-white p-4 rounded-3xl w-60 h-60 mx-auto border border-white/10 shadow-lg flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      JSON.stringify({
                        ticketId: ticket.id,
                        version: 1,
                        signature: ticket.hmacSignature,
                      })
                    )}`}
                    alt="QR Code do Ingresso"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 text-[9px] text-[#B388FF] font-extrabold uppercase bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    <FaShieldHalved className="w-3 h-3 text-[#B388FF]" />
                    Autenticidade Digital Verificada
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto leading-relaxed pt-1">
                    Apresente este QR Code na portaria do evento. A assinatura digital garante a autenticidade offline.
                  </p>
                </div>
              </div>
            )}

            {/* Event Info Grid */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <FaCalendarDays className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Data e Hora</span>
                    <span className="text-xs font-semibold text-white mt-0.5 block">{formattedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FaLocationDot className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Local</span>
                    <span className="text-xs font-semibold text-white mt-0.5 block truncate max-w-[150px]" title={ticket.batch.event.location}>
                      {ticket.batch.event.location}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="flex items-center gap-3">
                  <FaTicketSimple className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Ingresso / Setor</span>
                    <span className="text-xs font-semibold text-white mt-0.5 block">
                      {ticket.batch.name} {ticket.batch.sectorName && `- ${ticket.batch.sectorName}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FaTag className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Valor Pago</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">R$ {ticket.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Holder details */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/5 flex items-center gap-2">
                <FaUser className="text-purple-400" />
                Dados do Titular
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">Nome</span>
                  <span className="text-xs font-bold text-white mt-1 block truncate" title={displayName}>{displayName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">CPF</span>
                  <span className="text-xs font-bold text-white mt-1 block">{displayCpf}</span>
                </div>
              </div>
            </div>

            {isPending && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 items-start">
                <FaAddressCard className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-amber-300">Validação Meia-Entrada Requerida</h4>
                  <p className="text-[10px] leading-relaxed text-slate-350">
                    O comprador original precisa anexar o comprovante de meia-entrada no painel de controle.
                  </p>
                </div>
              </div>
            )}

            {/* Actions Section */}
            {(isValid || isPending || isConsumed) && (
              <div className="pt-4 border-t border-white/5 space-y-3">
                <a
                  href={`/ticket/${ticket.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all font-semibold text-xs tracking-wide text-white uppercase text-center cursor-pointer"
                >
                  Imprimir Ingresso (PDF)
                </a>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      try {
                        window.location.href = `/api/tickets/${ticket.id}/pkpass`;
                      } catch (e) {
                        alert('Não foi possível preparar o arquivo Apple Wallet.');
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all font-bold text-[10px] text-slate-300 uppercase tracking-wide cursor-pointer"
                  >
                    Apple Wallet
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/tickets/${ticket.id}/googlepay`);
                        if (!res.ok) throw new Error('Falha ao preparar Google Wallet');
                        const data = await res.json();
                        if (data.saveUrl) {
                          window.location.href = data.saveUrl;
                        } else {
                          alert('Link do Google Wallet indisponível para este ingresso.');
                        }
                      } catch (e) {
                        alert('Não foi possível preparar o Google Wallet.');
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all font-bold text-[10px] text-slate-300 uppercase tracking-wide cursor-pointer"
                  >
                    Google Wallet
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      <footer className="text-center text-[10px] text-slate-500 py-6 border-t border-white/5 max-w-lg mx-auto w-full">
        &copy; {new Date().getFullYear()} Flux Tickets. Todos os direitos reservados.
      </footer>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { ticketId } = context.query;
  
  if (!ticketId || typeof ticketId !== 'string') {
    return { props: { ticket: null } };
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        buyer: true,
        batch: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!ticket) {
      return { props: { ticket: null } };
    }

    return {
      props: {
        ticket: {
          id: ticket.id,
          status: ticket.status,
          price: ticket.price.toNumber(),
          meiaEntrada: ticket.meiaEntrada,
          hmacSignature: ticket.hmacSignature,
          holderName: ticket.holderName,
          holderCpf: ticket.holderCpf,
          buyer: {
            name: ticket.buyer.name,
          },
          batch: {
            id: ticket.batch.id,
            name: ticket.batch.name,
            sectorName: ticket.batch.sectorName,
            event: {
              id: ticket.batch.event.id,
              title: ticket.batch.event.title,
              date: ticket.batch.event.date.toISOString(),
              location: ticket.batch.event.location,
            },
          },
        },
      },
    };
  } catch (error) {
    console.error('Error fetching ticket in public page:', error);
    return { props: { ticket: null } };
  }
};
