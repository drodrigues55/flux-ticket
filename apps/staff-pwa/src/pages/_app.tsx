import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registra o Service Worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[SW] Service worker registrado com sucesso:', reg.scope))
        .catch((err) => console.error('[SW] Erro ao registrar o Service Worker:', err));
    }
  }, []);

  return <Component {...pageProps} />;
}
