import { useState, useEffect, useRef } from 'react';
import { Button } from '@flux/ui';
import { Html5Qrcode } from 'html5-qrcode';

interface ScanButtonProps {
  onScan: (scannedData: string) => void;
}

export function ScanButton({ onScan }: ScanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Aguarda o elemento renderizar no DOM antes de iniciar o scanner
    const timer = setTimeout(() => {
      const scannerId = "flux-qr-reader";
      const scannerElement = document.getElementById(scannerId);
      if (!scannerElement) return;

      const html5QrCode = new Html5Qrcode(scannerId);
      qrScannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          // Quando escaneia com sucesso
          onScan(decodedText);
          handleClose();
        },
        () => {
          // Ignora mensagens de erro do frame-by-frame scanner para evitar spam nos logs
        }
      ).catch((err) => {
        console.error("Falha ao inicializar a câmera do QR Code:", err);
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
            <div className="w-full aspect-square max-w-sm bg-black rounded-2xl overflow-hidden border border-[#2C2C2C] shadow-2xl relative">
              <div id="flux-qr-reader" className="w-full h-full" />
              {/* Moldura Guia de Foco */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-[#FF3200]/80 rounded-lg animate-pulse" />
              </div>
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
