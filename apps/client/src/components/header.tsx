import React, { useState, useEffect } from 'react';
import { FaCircleCheck, FaArrowRightFromBracket, FaMoon, FaSun } from 'react-icons/fa6';
import { useTheme } from '../hooks/useTheme';

export const Header = () => {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const session = localStorage.getItem('flux_user_session');
    if (session) {
      try {
        setUser(JSON.parse(session));
      } catch (e) {}
    }

    const loadCart = () => {
      const existingCart = localStorage.getItem('flux_cart');
      if (existingCart) {
        try {
          setCart(JSON.parse(existingCart));
        } catch (e) {}
      } else {
        setCart([]);
      }
    };

    loadCart();
    window.addEventListener('flux_cart_updated', loadCart);
    return () => {
      window.removeEventListener('flux_cart_updated', loadCart);
    };
  }, []);

  const removeFromCart = (batchId: string) => {
    const updatedCart = cart.filter((item) => item.batchId !== batchId);
    setCart(updatedCart);
    localStorage.setItem('flux_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('flux_cart_updated'));
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="h-[72px] px-8 flex items-center justify-between flux-surface border-b sticky top-0 z-50 shadow-sm transition-all duration-200">
      {/* LOGO: Flux Tickets with Orange Ticket Icon */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
        <svg className="w-8 h-8 text-[#FF3200]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V6zm2 1v10h12V7H6zm3 2h6v2H9V9zm0 4h6v2H9v-2z" />
        </svg>
        <span className="font-extrabold text-2xl tracking-tight text-[var(--text)]">Flux Tickets</span>
      </div>

      {/* NAVIGATION MENU */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[var(--text-muted)]">
        {['Eventos', 'Shows', 'Teatro', 'Esportes'].map((item) => (
          <a key={item} href="/" className="hover:text-[#FF3200] transition-colors">
            {item}
          </a>
        ))}
      </nav>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-5">
        {/* Search Icon */}
        <button className="text-[var(--text-subtle)] hover:text-[#FF3200] transition-colors bg-transparent border-none cursor-pointer p-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Cart Icon and Dropdown wrapper */}
        <div className="relative">
          <button 
            onClick={() => setShowCartDropdown(!showCartDropdown)}
            className="text-[var(--text-subtle)] hover:text-[#FF3200] transition-colors bg-transparent border-none cursor-pointer p-1 relative flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-[#FF3200] text-white rounded-full text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center border border-[var(--surface)] select-none shadow-sm">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Cart Dropdown Menu */}
          {showCartDropdown && (
            <div className="absolute right-0 mt-3 w-80 flux-card p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-sm font-extrabold pb-2 border-b border-[var(--border)] mb-2 text-[var(--text)]">Meu Carrinho</h3>
              {cart.length === 0 ? (
                <div className="text-center py-6 text-[var(--text-subtle)] text-xs font-semibold">
                  Seu carrinho está vazio
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.batchId} className="flex gap-3 items-start border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
                      {item.eventImage && (
                        <img src={item.eventImage} className="w-12 h-12 rounded-lg object-cover border border-[var(--border)] shrink-0" alt={item.eventTitle} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[var(--text)] truncate leading-snug">{item.eventTitle}</h4>
                        <p className="text-[10px] text-[var(--text-subtle)] font-bold">{item.batchName}</p>
                        <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                          {item.quantity}x R$ {item.batchPrice.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-between h-12 shrink-0">
                        <button 
                          onClick={() => removeFromCart(item.batchId)}
                          className="text-[var(--text-subtle)] hover:text-red-500 p-0.5 cursor-pointer bg-transparent border-none"
                          title="Remover"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <a 
                          href={`/checkout/${item.eventId}?batchId=${item.batchId}&quantity=${item.quantity}`}
                          className="bg-[#FF3200] hover:bg-[#E62D00] text-white text-[9px] font-bold px-2 py-1 rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                          Pagar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="flux-theme-toggle"
          title={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
          aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
        </button>

        {/* User profile section */}
        {user ? (
          <div className="flex items-center gap-3">
            <div 
              onClick={() => window.location.href = '/profile'}
              className="flex items-center gap-2 flux-muted-surface hover:bg-[var(--surface-elevated)] border px-3 py-1.5 rounded-[14px] shadow-sm transition-all select-none cursor-pointer"
            >
              {/* Avatar circle */}
              <div className="w-6 h-6 rounded-full bg-[#FF3200] text-white flex items-center justify-center font-bold text-[10px] select-none shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-[var(--text)] leading-none">{user.name.split('@')[0]}</span>
                <FaCircleCheck className="w-3.5 h-3.5 text-blue-500" />
              </div>
            </div>
            <button 
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                } catch (err) {
                  console.error('[LOGOUT ERROR]', err);
                }
                localStorage.removeItem('flux_user_session');
                window.location.reload();
              }}
              title="Desconectar"
              className="w-8 h-8 rounded-[10px] border border-[var(--border)] hover:border-red-500/20 text-[var(--text-subtle)] hover:text-red-500 bg-transparent hover:bg-red-500/5 flex items-center justify-center transition-all cursor-pointer"
            >
              <FaArrowRightFromBracket className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Orange Avatar "A" */
          <div 
            onClick={() => window.location.href = '/profile'}
            className="w-9 h-9 rounded-full bg-[#FF3200] text-white flex items-center justify-center font-bold text-sm shadow-sm select-none cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            A
          </div>
        )}
      </div>
    </header>
  );
};
