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
  FaHouse
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
            <div className="bg-slate-50 border border-neutral-200/50 rounded-2xl p-6 space-y-4 relative overflow-hidden">
              {/* Ticket background icon decoration */}
              <FaTicketSimple className="absolute -right-6 -bottom-6 w-32 h-32 text-slate-200/50 pointer-events-none transform -rotate-12" />

              <div className="border-b border-neutral-200/60 pb-3 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evento</span>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {ticket.batch.event.title}
                  </h3>
                </div>
                {ticket.meiaEntrada && (
                  <span className="bg-[#FF9100]/10 text-[#FF6D00] border border-[#FF9100]/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                    Meia-Entrada
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <FaCalendarDays className="w-4 h-4 text-[#6200EE] shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Data e Hora</span>
                    <span className="text-xs font-semibold">{formattedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <FaLocationDot className="w-4 h-4 text-[#6200EE] shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Local</span>
                    <span className="text-xs font-semibold">{ticket.batch.event.location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-neutral-200/60 pt-4">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Ingresso / Setor</span>
                  <span className="text-sm font-bold text-slate-800">{ticket.batch.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Valor Pago</span>
                  <span className="text-lg font-black text-[#6200EE]">R$ {ticket.price.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            {ticket.meiaEntrada && (
              <div className="bg-[#FFF3E0] border border-[#FFE0B2] text-[#E65100] rounded-2xl p-5 flex gap-3.5 items-start">
                <FaAddressCard className="w-6 h-6 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm">Validação de Meia-Entrada Necessária</h4>
                  <p className="text-xs leading-relaxed text-[#EF6C00]">
                    Como você adquiriu um ingresso do tipo **Meia-Entrada**, seu ingresso ficará pendente de validação até que você envie um comprovante de estudante válido (DNE ou similar).
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-100">
              {ticket.meiaEntrada && (
                <button
                  onClick={() => router.push(`/profile/validate/${ticket.id}`)}
                  className="flex-1 bg-[#FF6D00] hover:bg-[#E65100] text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaAddressCard className="w-4 h-4" />
                  Validar Meia-Entrada
                </button>
              )}
              
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
