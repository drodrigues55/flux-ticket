import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import Head from 'next/head';
import { useState, useEffect, createContext } from 'react';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export type ThemeMode = 'light' | 'dark';

export const ThemeContext = createContext<{
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export default function App({ Component, pageProps }: AppProps) {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('flux_theme');
    const initialTheme = stored === 'dark' || stored === 'light' ? stored : 'light';
    setThemeState(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    window.localStorage.setItem('flux_theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const stored = localStorage.getItem('flux_theme');
              const theme = stored === 'dark' ? 'dark' : 'light';
              document.documentElement.dataset.theme = theme;
            } catch (e) {}
          })();
        ` }} />
      </Head>
      <main className={`${inter.variable} font-sans`}>
        <Component {...pageProps} />
      </main>
    </ThemeContext.Provider>
  );
}
