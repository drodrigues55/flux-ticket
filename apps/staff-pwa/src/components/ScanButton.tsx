import { useState, useEffect, useRef } from 'react';
import { Button } from '@flux/ui';
import { Html5Qrcode } from 'html5-qrcode';

interface ScanButtonProps {
  onScan: (scannedData: string) => void;
}

export function ScanButton({ onScan }: ScanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'no-camera' | 'error'>('requesting');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setCameraState('requesting');
    setErrorText('');

    const timer = setTimeout(() => {
      const scannerId = "flux-qr-reader";
      
      Html5Qrcode.getCameras().then(devices => {
        if (!devices || devices.length === 0) {
          setCameraState('no-camera');
          return;
        }

        const html5QrCode = new Html5Qrcode(scannerId);
        qrScannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            onScan(decodedText);
            handleClose();
          },
          () => {}
        ).then(() => {
          setCameraState('active');
        }).catch((err) => {
          console.error("Falha ao inicializar a câmera do QR Code:", err);
          const errStr = String(err).toLowerCase();
          if (errStr.includes('permission') || errStr.includes('allowed') || errStr.includes('denied')) {
            setCameraState('denied');
          } else {
            setCameraState('error');
            setErrorText(String(err));
          }
        });
      }).catch(err => {
        console.error("Falha ao obter câmeras:", err);
        const errStr = String(err).toLowerCase();
        if (errStr.includes('permission') || errStr.includes('allowed') || errStr.includes('denied')) {
          setCameraState('denied');
        } else {
          setCameraState('no-camera');
        }
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (qrScannerRef.current) {
        const scanner = qrScannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().then(() => {
            scanner.clear();
          }).catch(err => console.error("Erro ao parar a câmera no cleanup:", err));
        }
      }
    };
  }, [isOpen]);

  const handleClose = () => {
    if (qrScannerRef.current) {
      const scanner = qrScannerRef.current;
      if (scanner.isScanning) {
        scanner.stop().then(() => {
          scanner.clear();
          setIsOpen(false);
        }).catch(err => {
          console.error("Erro ao parar a câmera no fechamento:", err);
          setIsOpen(false);
        });
        return;
      }
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-[#FF3200] text-white hover:bg-[#E62D00] p-5 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center w-16 h-16 border-none cursor-pointer"
        title="Escanear QR Code"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </button>

      {/* Viewfinder Overlay Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-6">
          <div className="max-w-md w-full flex flex-col items-center space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white tracking-wide">Scanner de Portaria</h3>
              <p className="text-xs text-neutral-200">Posicione o QR Code impresso ou no celular do cliente frente à câmera traseira</p>
            </div>

            {/* Viewfinder Container */}
            <div className="w-full aspect-square max-w-sm bg-black rounded-2xl overflow-hidden border border-[#2C2C2C] shadow-2xl relative flex items-center justify-center">
              {cameraState === 'active' && <div id="flux-qr-reader" className="w-full h-full" />}
              
              {cameraState === 'requesting' && (
                <div className="text-center p-6 space-y-2 text-neutral-400">
                  <div className="animate-spin text-2xl">⏳</div>
                  <p className="text-xs">Solicitando permissão da câmera...</p>
                </div>
              )}

              {cameraState === 'denied' && (
                <div className="text-center p-6 space-y-2 text-red-400">
                  <div className="text-3xl">🚫</div>
                  <p className="font-bold text-sm">Permissão Negada</p>
                  <p className="text-[10px] text-neutral-400">Por favor, permita o acesso à câmera nas configurações do navegador.</p>
                </div>
              )}

              {cameraState === 'no-camera' && (
                <div className="text-center p-6 space-y-2 text-neutral-400">
                  <div className="text-3xl">📷</div>
                  <p className="font-bold text-sm">Nenhuma Câmera Localizada</p>
                  <p className="text-[10px] text-neutral-500">Utilize o simulador de QR Code do painel para fins de demonstração.</p>
                </div>
              )}

              {cameraState === 'error' && (
                <div className="text-center p-6 space-y-2 text-amber-500">
                  <div className="text-3xl">⚠️</div>
                  <p className="font-bold text-sm">Erro ao Iniciar Câmera</p>
                  <p className="text-[10px] text-neutral-455">{errorText || 'Erro desconhecido'}</p>
                </div>
              )}

              {cameraState === 'active' && (
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-[#FF3200]/80 rounded-lg animate-pulse" />
                </div>
              )}
            </div>

            <Button
              onClick={handleClose}
              variant="outline"
              className="px-8 border-red-500/30 text-red-400 hover:border-red-500 hover:bg-red-500/10 font-bold tracking-wide rounded-xl transition-all"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
