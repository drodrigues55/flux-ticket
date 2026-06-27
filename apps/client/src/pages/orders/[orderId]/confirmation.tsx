import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '../../../components/header';
import { prisma } from '@flux/database';
import { FaCircleCheck, FaTicket, FaEnvelope, FaDownload } from 'react-icons/fa6';

interface ConfirmationPageProps {
  order: {
    id: string;
    status: string;
    totalAmount: number;
    deliveryStatus: string;
    event: {
      title: string;
      date: string;
      location: string;
    };
    tickets: Array<{
      id: string;
      holderName: string | null;
      holderCpf: string | null;
      price: number;
      batch: {
        name: string;
      };
    }>;
  };
}

export default function OrderConfirmationPage({ order }: ConfirmationPageProps) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  if (!order) {
    return (
      <div className="min-h-screen bg-[#03060B] flex items-center justify-center text-white text-sm">
        Carregando confirmação...
      </div>
    );
  }

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    try {
      const res = await fetch(`/api/public/orders/${order.id}/resend-tickets`, {
        method: 'POST',
      });
      if (res.ok) {
        setResendMessage('Pedido de reenvio enviado com sucesso!');
      } else {
        setResendMessage('Erro ao solicitar reenvio dos ingressos.');
      }
    } catch (err) {
      setResendMessage('Falha na comunicação com o servidor.');
    } finally {
      setResending(false);
    }
  };

  const formattedDate = new Date(order.event.date).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#03060B] font-sans antialiased text-white relative overflow-hidden">
      <Header />

      <main className="flex-grow flex items-center justify-center px-6 py-16 relative z-10">
        <div className="w-full max-w-2xl bg-neutral-900 rounded-3xl border border-white/10 overflow-hidden shadow-xl">
          <div className="h-2 w-full bg-emerald-500" />
          
          <div className="p-8 text-center border-b border-white/5 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <FaCircleCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Compra Confirmada!</h2>
              <p className="text-neutral-400 text-sm">Seu pedido foi processado com sucesso.</p>
            </div>
          </div>

          <div className="p-8 space-y-6 text-sm">
            {/* Delivery Status Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              order.deliveryStatus === 'DELIVERED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-neutral-800 border-white/10 text-neutral-400'
            }`}>
              <div>
                <span className="font-bold text-xs uppercase block tracking-wider opacity-85">Status de Entrega</span>
                <span className="text-sm font-bold mt-0.5">
                  {order.deliveryStatus === 'DELIVERED' ? 'Enviado por E-mail' : 'Processando Envio...'}
                </span>
              </div>
              <button
                onClick={handleResend}
                disabled={resending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white border-none cursor-pointer disabled:opacity-50"
              >
                <FaEnvelope /> {resending ? 'Reenviando...' : 'Reenviar E-mail'}
              </button>
            </div>

            {resendMessage && (
              <div className="p-3 bg-neutral-800 rounded border border-white/10 text-xs text-neutral-300">
                {resendMessage}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-bold text-neutral-300">Detalhes do Evento</h4>
              <div className="p-4 bg-neutral-950/50 rounded-xl border border-white/5 space-y-2">
                <div className="font-bold text-white">{order.event.title}</div>
                <div className="text-xs text-neutral-400">📅 {formattedDate}</div>
                <div className="text-xs text-neutral-400">📍 {order.event.location}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-neutral-300">Seus Ingressos</h4>
              <p className="text-xs text-neutral-400">Clique em um ingresso para visualizar e imprimir seu QR Code.</p>
              <div className="space-y-2">
                {order.tickets.map(t => (
                  <Link key={t.id} href={`/tickets/${t.id}`} className="block group">
                    <div className="p-4 bg-neutral-950/35 border border-white/5 group-hover:border-[#FF3200] rounded-xl flex justify-between items-center transition-all cursor-pointer">
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-xs text-neutral-300 group-hover:text-[#FF3200]">
                          <FaTicket /> {t.batch.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">Portador: {t.holderName || 'Convidado'} (CPF: {t.holderCpf || 'N/A'})</div>
                      </div>
                      <span className="text-xs font-bold text-[#FF3200] flex items-center gap-1">
                        Visualizar <FaDownload className="text-[10px]" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex gap-4">
              <Link href="/events" className="flex-1">
                <button className="w-full h-11 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold text-sm cursor-pointer border-none">
                  Explorar mais eventos
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { orderId } = context.query;
  if (!orderId || typeof orderId !== 'string') {
    return { redirect: { destination: '/events', permanent: false } };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        tickets: {
          include: {
            batch: true,
          },
        },
      },
    });

    if (!order) {
      return { redirect: { destination: '/events', permanent: false } };
    }

    const deliveryJob = await prisma.outboxEvent.findFirst({
      where: { aggregateType: 'ORDER_PAID', aggregateId: order.id, type: 'tickets.delivery' },
      orderBy: { createdAt: 'desc' }
    });

    let deliveryStatus = 'PENDING';
    if (deliveryJob) {
      if (deliveryJob.status === 'PROCESSED') {
        deliveryStatus = 'DELIVERED';
      } else if (deliveryJob.status === 'FAILED') {
        deliveryStatus = 'FAILED';
      }
    }

    return {
      props: {
        order: {
          id: order.id,
          status: order.status,
          totalAmount: order.netAmount.toNumber(),
          deliveryStatus,
          event: {
            title: order.event.title,
            date: order.event.date.toISOString(),
            location: order.event.location,
          },
          tickets: order.tickets.map(t => ({
            id: t.id,
            holderName: t.holderName,
            holderCpf: t.holderCpf,
            price: t.price.toNumber(),
            batch: {
              name: t.batch.name,
            },
          })),
        },
      },
    };
  } catch (err) {
    console.error('Error loading confirmation order:', err);
    return { redirect: { destination: '/events', permanent: false } };
  }
};
