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
  ticket: {
    id: string;
    meiaEntrada: boolean;
    price: number;
    status: string;
    batch: {
      name: string;
      sectorName: string;
      event: {
        title: string;
        date: string;
        location: string;
      };
    };
  };
}

export default function CheckoutSuccessPage({ ticket }: SuccessPageProps) {
  const router = useRouter();

  const formattedDate = new Date(ticket.batch.event.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] font-sans antialiased text-slate-900">
      <Header />

      <main className="flex-grow flex items-center justify-center px-6 py-16 bg-gradient-to-tr from-[#f3e5f5] via-[#fafafa] to-[#ede7f6]">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-neutral-200/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* Top color accent strip - Solid Green */}
          <div className="h-2 w-full bg-emerald-500" />

          {/* Success Hero Header */}
          <div className="p-8 text-center border-b border-neutral-100 space-y-4">
            <div className="w-20 h-20 bg-emerald-50 border-4 border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-sm">
              <FaCircleCheck className="w-12 h-12" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Compra Aprovada!</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Seu ingresso foi reservado e a transação de pagamento concluída com sucesso.
              </p>
            </div>
          </div>

          {/* Ticket Information Section */}
          <div className="p-8 space-y-6">
            
            {/* Stepper Status Bar */}
            <div className="border-b border-neutral-100 pb-6">
              <div className="flex items-center justify-between w-full relative">
                {/* Progress Line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 z-0" />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500 transition-all duration-500 z-0" 
                  style={{ width: ticket.meiaEntrada ? '50%' : '100%' }}
                />

                {/* Step 1: Compra Aprovada */}
                <div className="flex flex-col items-center z-10 bg-white px-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    ✓
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 mt-2 text-center">Compra Aprovada</span>
                </div>

                {/* Step 2 & 3 */}
                {ticket.meiaEntrada ? (
                  <>
                    <div className="flex flex-col items-center z-10 bg-white px-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm animate-pulse">
                        2
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 mt-2 text-center">Validação Pendente</span>
                    </div>

                    <div className="flex flex-col items-center z-10 bg-white px-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-400 border border-neutral-200/60 flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <span className="text-[10px] font-bold text-neutral-400 mt-2 text-center">Ingresso Liberado</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center z-10 bg-white px-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      ✓
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 mt-2 text-center">Ingresso Liberado</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-neutral-200/50 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <div className="border-b border-neutral-200/60 pb-3 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evento</span>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {ticket.batch.event.title}
                  </h3>
                </div>
                {ticket.meiaEntrada && (
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                    Meia-Entrada
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <FaCalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Data e Hora</span>
                    <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <FaLocationDot className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Local</span>
                    <span className="text-xs font-semibold text-slate-700">{ticket.batch.event.location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-200/60 pt-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <FaTicketSimple className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Ingresso / Setor</span>
                    <span className="text-xs font-semibold text-slate-700">{ticket.batch.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <FaTag className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Valor Pago</span>
                    <span className="text-base font-bold text-slate-700">R$ {ticket.price.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>
            </div>

            {ticket.meiaEntrada && (
              <div className="bg-slate-50 border border-neutral-200 border-l-4 border-l-red-600 p-5 rounded-r-2xl rounded-l-md flex gap-3.5 items-start">
                <FaAddressCard className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">Atenção: Valide sua meia-entrada</h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    Seu ingresso está pendente até que o comprovante (DNE ou similar) seja enviado.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-100">
              {ticket.meiaEntrada ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={() => router.push(`/profile/validate/${ticket.id}`)}
                      className="flex-1 bg-[#6200EE] hover:bg-[#5000c7] text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FaAddressCard className="w-4 h-4" />
                      Validar Meia-Entrada
                    </button>
                    <button
                      onClick={() => router.push('/profile')}
                      className="flex-1 border-2 border-[#6200EE] text-[#6200EE] hover:bg-[#6200EE]/5 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FaTicketSimple className="w-4 h-4" />
                      Ver Meus Ingressos
                      <FaArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => router.push('/')}
                    className="w-full text-slate-500 hover:text-slate-800 py-2 font-bold text-sm flex items-center justify-center gap-2 hover:underline cursor-pointer"
                  >
                    <FaHouse className="w-4 h-4" />
                    Voltar ao início
                  </button>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={() => router.push('/profile')}
                    className="flex-1 bg-[#6200EE] hover:bg-[#5000c7] text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FaTicketSimple className="w-4 h-4" />
                    Ver Meus Ingressos
                    <FaArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="bg-white hover:bg-neutral-50 text-slate-600 hover:text-slate-800 border border-slate-200 px-6 py-3.5 rounded-2xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FaHouse className="w-4 h-4" />
                    Voltar ao início
                  </button>
                </div>
              )}
            </div>
          </div>



        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-8 border-t border-neutral-200/60 max-w-6xl mx-auto w-full">
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
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        batch: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    return {
      props: {
        ticket: {
          id: ticket.id,
          meiaEntrada: ticket.meiaEntrada,
          price: ticket.price.toNumber(),
          status: ticket.status,
          batch: {
            name: ticket.batch.name,
            sectorName: ticket.batch.sectorName,
            event: {
              title: ticket.batch.event.title,
              date: ticket.batch.event.date.toISOString(),
              location: ticket.batch.event.location,
            },
          },
        },
      },
    };
  } catch (error) {
    console.error('Error fetching ticket in success page:', error);
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};
