import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useEffect } from 'react';
import { prisma } from '@flux/database';

interface PrintablePdfTicketProps {
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
      email: string;
    };
    batch: {
      name: string;
      sectorName: string | null;
      event: {
        title: string;
        date: string;
        location: string;
      };
    };
  } | null;
}

export default function PrintablePdfTicket({ ticket }: PrintablePdfTicketProps) {
  const isPrintable = ticket && ['VALID', 'PENDING_VALIDATION', 'CONSUMED'].includes(ticket.status);

  useEffect(() => {
    if (isPrintable) {
      // Pequeno timeout para garantir que o QR Code e os estilos carregaram
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPrintable]);

  if (!ticket || !isPrintable) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-black text-slate-900">Ingresso Inválido para Impressão</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {!ticket
              ? 'O ingresso solicitado não foi encontrado.'
              : `Este ingresso possui o status "${ticket.status}" e não está disponível para impressão.`}
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

  const qrPayload = JSON.stringify({
    ticketId: ticket.id,
    version: 1,
    signature: ticket.hmacSignature,
  });

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans p-8 flex flex-col items-center justify-center">
      <Head>
        <title>Ingresso PDF - {ticket.batch.event.title}</title>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white;
              color: black;
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none;
            }
            .print-container {
              border: none !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}} />
      </Head>

      <div className="print-container w-full max-w-2xl border-2 border-dashed border-slate-300 rounded-3xl p-8 bg-white shadow-sm space-y-6 relative">
        {/* Top Header */}
        <div className="flex justify-between items-center border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">FLUX TICKETS</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ingresso Oficial de Entrada</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              ID: {ticket.id.substring(0, 8).toUpperCase()}...
            </span>
          </div>
        </div>

        {/* Event Title */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-650 bg-purple-100 px-2 py-0.5 rounded">Evento</span>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">{ticket.batch.event.title}</h2>
        </div>

        {/* Main Content Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Data e Hora</span>
                <span className="text-sm font-bold text-slate-800">{formattedDate}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Local</span>
                <span className="text-sm font-bold text-slate-800 truncate block">{ticket.batch.event.location}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Ingresso / Setor</span>
                <span className="text-sm font-bold text-slate-800">
                  {ticket.batch.name} {ticket.batch.sectorName && `- ${ticket.batch.sectorName}`}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Tipo / Valor</span>
                <span className="text-sm font-bold text-slate-800">
                  {ticket.meiaEntrada ? 'Meia-Entrada' : 'Inteira'} - R$ {ticket.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Holder details */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Titular do Ingresso</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block">Nome</span>
                  <span className="text-sm font-bold text-slate-800">{displayName}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">CPF</span>
                  <span className="text-sm font-bold text-slate-800">{displayCpf}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center border-l md:border-l border-slate-200 pl-0 md:pl-6 space-y-2">
            <div className="border border-slate-200 p-2 bg-white rounded-2xl shadow-sm">
              <img src={qrCodeUrl} alt="QR Code do Ingresso" className="w-40 h-40 object-contain" />
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Acesso Digital</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 gap-2">
          <span>Este ingresso é pessoal e intransferível sem autorização prévia.</span>
          <span className="font-bold font-mono">flux-tickets.com - Autenticidade Garantida</span>
        </div>
      </div>

      {/* Manual print button helper */}
      <div className="no-print mt-8">
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-full font-bold text-sm tracking-wide shadow-md transition-all cursor-pointer"
        >
          Imprimir Ingresso
        </button>
      </div>
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
            email: ticket.buyer.email,
          },
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
    console.error('Error fetching ticket in printable page:', error);
    return { props: { ticket: null } };
  }
};
