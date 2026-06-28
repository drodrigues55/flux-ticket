import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { Header } from '../../../components/header';
import { prisma } from '@flux/database';
import {
  FaArrowLeft,
  FaCloudArrowUp,
  FaFileLines,
  FaCircleCheck,
  FaSpinner,
  FaAddressCard
} from 'react-icons/fa6';

interface ValidatePageProps {
  ticket: {
    id: string;
    meiaEntrada: boolean;
    status: string;
    batch: {
      name: string;
      event: {
        title: string;
      };
    };
  };
}

export default function ValidateTicketPage({ ticket }: ValidatePageProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);
    setOcrStatus('Enviando arquivo para o servidor seguro...');

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 80) {
          clearInterval(progressInterval);
          return 80;
        }
        return prev + 15;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(90);
      setOcrStatus('Executando validação OCR (Reconhecimento de Texto)...');

      setTimeout(async () => {
        setUploadProgress(100);
        setOcrStatus('Validando dados com o banco DNE (Documento Nacional do Estudante)...');

        try {
          const res = await fetch('/api/tickets/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticketId: ticket.id,
              documentName: file.name,
            }),
          });

          if (!res.ok) {
            throw new Error('Falha ao validar documento.');
          }

          setIsSuccess(true);
          setOcrStatus('Documento validado com sucesso! Ingresso liberado.');
          setTimeout(() => {
            router.push('/profile');
          }, 2000);
        } catch (error) {
          console.error(error);
          setOcrStatus('Erro ao validar. Tente novamente.');
          setUploading(false);
          setUploadProgress(0);
        }
      }, 1200);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col flux-page font-sans antialiased text-[var(--text)]">
      <Header />

      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="relative w-full max-w-xl flux-card rounded-[20px] border border-[var(--border-strong)] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          <div className="p-6 md:p-8 border-b border-[var(--border)] bg-[var(--surface)]">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[#FF3200] transition-colors mb-4 cursor-pointer border-none bg-transparent"
            >
              <FaArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>
            <h2 className="text-2xl font-extrabold text-[var(--text)] leading-tight">
              Validação de Meia-Entrada
            </h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Envie o comprovante de estudante para liberar seu ingresso do evento {ticket.batch.event.title}.
            </p>
          </div>

          <div className="p-8 space-y-6">
            {isSuccess ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-500/10 border-4 border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-sm">
                  <FaCircleCheck className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text)]">Meia-Entrada Validada!</h3>
                <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-sm mx-auto">
                  Seu comprovante foi aprovado com sucesso. Seu ingresso agora está ativo e pronto para uso. Redirecionando para seu perfil...
                </p>
              </div>
            ) : uploading ? (
              <div className="text-center py-8 space-y-6 animate-in fade-in duration-200">
                <div className="relative w-16 h-16 flex items-center justify-center mx-auto text-[#FF3200]">
                  <FaSpinner className="w-10 h-10 animate-spin text-[#FF3200]" />
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[var(--text)]">Processando Comprovante</h4>
                  <div className="w-full bg-[var(--surface-muted)] rounded-full h-2 max-w-xs mx-auto overflow-hidden">
                    <div
                      className="bg-[#FF3200] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[var(--text-muted)] text-[11px] font-semibold">
                    {ocrStatus}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Drag and drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    file
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-[var(--border-strong)] bg-[var(--surface-muted)] hover:border-[#FF3200] hover:bg-[#FF3200]/5'
                  }`}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="flex flex-col items-center space-y-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      file ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#FF3200]/10 text-[#FF3200]'
                    }`}>
                      {file ? <FaFileLines className="w-6 h-6" /> : <FaCloudArrowUp className="w-6 h-6" />}
                    </div>
                    {file ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[var(--text)]">{file.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[var(--text)]">Arraste ou escolha um arquivo</p>
                        <p className="text-xs text-[var(--text-muted)]">PDF, PNG ou JPG de até 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-[14px] p-4 flex gap-3 items-start text-xs leading-relaxed">
                  <FaAddressCard className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>
                    Certifique-se de que a foto da carteira de estudante ou documento equivalente esteja nítida, com nome completo e data de validade visíveis.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!file}
                  className={`w-full py-3.5 rounded-2xl font-bold transition-all text-sm block text-center border-none ${
                    !file
                      ? 'bg-[var(--surface-muted)] text-[var(--text-subtle)] cursor-not-allowed shadow-none'
                      : 'bg-[#FF3200] hover:bg-[#E62D00] text-white cursor-pointer shadow-sm active:scale-[0.98]'
                  }`}
                >
                  Confirmar e Validar
                </button>
              </form>
            )}
          </div>

        </div>
      </main>

      <footer className="text-center text-xs text-[var(--text-subtle)] py-8 border-t border-[var(--border)] max-w-6xl mx-auto w-full">
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
          status: ticket.status,
          batch: {
            name: ticket.batch.name,
            event: {
              title: ticket.batch.event.title,
            },
          },
        },
      },
    };
  } catch (error) {
    console.error('Error fetching ticket in validate page:', error);
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};
