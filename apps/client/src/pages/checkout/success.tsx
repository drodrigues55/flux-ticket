import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Header } from '../../components/header';
import { prisma } from '@flux/database';
import {
  FaCircleCheck,
  FaTicketSimple,
  FaCalendarDays,
  FaLocationDot,
  FaArrowRight,
  FaAddressCard,
  FaHouse,
  FaTag
} from 'react-icons/fa6';

interface SuccessPageProps {
  tickets: Array<{
    id: string;
    meiaEntrada: boolean;
    price: number;
    status: string;
    holderName: string | null;
    holderCpf: string | null;
    buyerName: string;
    batch: {
      name: string;
      sectorName: string | null;
      event: {
        title: string;
        date: string;
        location: string;
      };
    };
  }>;
}

export default function CheckoutSuccessPage({ tickets = [] }: SuccessPageProps) {
  const router = useRouter();

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        Carregando...
      </div>
    );
  }

  const primaryTicket = tickets[0];
  const totalPaid = tickets.reduce((sum, t) => sum + t.price, 0);
  const hasMeia = tickets.some((t) => t.meiaEntrada);

  const formattedDate = new Date(primaryTicket.batch.event.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[180px] pointer-events-none" />
      <Header />

      <main className="flex-grow flex items-center justify-center px-6 py-16 relative z-10">
        <div className="relative w-full max-w-2xl bg-[#18181B] rounded-3xl border border-white/10 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* Top color accent strip - Solid Green */}
          <div className="h-2 w-full bg-emerald-500" />

          {/* Success Hero Header */}
          <div className="p-8 text-center border-b border-white/5 space-y-4">
            <div className="w-20 h-20 bg-emerald-500/10 border-4 border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
              <FaCircleCheck className="w-12 h-12" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-3xl font-black tracking-tight text-white">Compra Aprovada!</h2>
              <p className="text-slate-450 text-sm max-w-md mx-auto">
                Seu{tickets.length > 1 ? 's' : ''} ingresso{tickets.length > 1 ? 's foram' : ' foi'} reservado{tickets.length > 1 ? 's' : ''} e a transação de pagamento concluída com sucesso.
              </p>
            </div>
          </div>

          {/* Ticket Information Section */}
          <div className="p-8 space-y-6">
            
            {/* Stepper Status Bar */}
            <div className="border-b border-white/5 pb-6">
              <div className="flex items-center justify-between w-full relative">
                {/* Progress Line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/5 z-0" />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-500 z-0" 
                  style={{ width: hasMeia ? '50%' : '100%' }}
                />

                {/* Step 1: Compra Aprovada */}
                <div className="flex flex-col items-center z-10 bg-[#18181B] px-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    ✓
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-2 text-center">Compra Aprovada</span>
                </div>

                {/* Step 2 & 3 */}
                {hasMeia ? (
                  <>
                    <div className="flex flex-col items-center z-10 bg-[#18181B] px-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm animate-pulse">
                        2
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 mt-2 text-center">Validação Pendente</span>
                    </div>

                    <div className="flex flex-col items-center z-10 bg-[#18181B] px-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 text-slate-400 border border-white/10 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-2 text-center">Ingresso Liberado</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center z-10 bg-[#18181B] px-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      ✓
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 mt-2 text-center">Ingresso Liberado</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#080D1A]/50 border border-white/10 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="border-b border-white/5 pb-3 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Evento</span>
                  <h3 className="text-lg font-extrabold text-white leading-tight">
                    {primaryTicket.batch.event.title}
                  </h3>
                </div>
                {hasMeia && (
                  <span className="bg-white/5 text-slate-350 border border-white/10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                    Meia-Entrada
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-450">
                  <FaCalendarDays className="w-4 h-4 text-slate-450 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block uppercase leading-none">Data e Hora</span>
                    <span className="text-xs font-semibold text-white">{formattedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-450">
                  <FaLocationDot className="w-4 h-4 text-slate-450 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block uppercase leading-none">Local</span>
                    <span className="text-xs font-semibold text-white">{primaryTicket.batch.event.location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                <div className="flex items-center gap-3 text-slate-450">
                  <FaTicketSimple className="w-4 h-4 text-slate-450 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block uppercase leading-none">Ingresso / Setor</span>
                    <span className="text-xs font-semibold text-white">
                      {tickets.length}x {primaryTicket.batch.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-450">
                  <FaTag className="w-4 h-4 text-slate-450 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block uppercase leading-none">Valor Pago</span>
                    <span className="text-base font-bold text-white">R$ {totalPaid.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            </div>

            {hasMeia && (
              <div className="bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-600 p-5 rounded-r-2xl rounded-l-md flex gap-3.5 items-start">
                <FaAddressCard className="w-6 h-6 text-red-650 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">Atenção: Valide sua meia-entrada</h4>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Seu{tickets.length > 1 ? 's' : ''} ingresso{tickets.length > 1 ? 's estão' : ' está'} pendente{tickets.length > 1 ? 's' : ''} até que o comprovante (DNE ou similar) seja enviado na sua carteira de ingressos.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => router.push('/profile')}
                  className="flex-1 bg-[#9146FF] hover:bg-[#A970FF] text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  <FaTicketSimple className="w-4 h-4" />
                  Acessar Carteira de Ingressos
                  <FaArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="bg-transparent hover:bg-white/5 text-slate-350 hover:text-white border border-white/10 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaHouse className="w-4 h-4" />
                  Voltar ao início
                </button>
              </div>
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { ticketId } = context.query;
  if (!ticketId || typeof ticketId !== 'string') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  try {
    const ticketIds = ticketId.split(',');
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      include: {
        batch: {
          include: {
            event: true,
          },
        },
      },
    });

    if (tickets.length === 0) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    const serializedTickets = tickets.map((t) => ({
      id: t.id,
      meiaEntrada: t.meiaEntrada,
      price: t.price.toNumber(),
      status: t.status,
      holderName: t.holderName,
      holderCpf: t.holderCpf,
      batch: {
        name: t.batch.name,
        sectorName: t.batch.sectorName,
        event: {
          title: t.batch.event.title,
          date: t.batch.event.date.toISOString(),
          location: t.batch.event.location,
        },
      },
    }));

    return {
      props: {
        tickets: serializedTickets,
      },
    };
  } catch (error) {
    console.error('Error fetching tickets in success page:', error);
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};
