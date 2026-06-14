import React from 'react';

export const Header = () => (
  <header className="px-8 py-4 flex items-center justify-between bg-white border-b border-neutral-100 sticky top-0 z-50">
    {/* LOGO: Flux Tickets with Purple Ticket Icon */}
    <div className="flex items-center gap-2">
      <svg className="w-8 h-8 text-[#6200EE]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V6zm2 1v10h12V7H6zm3 2h6v2H9V9zm0 4h6v2H9v-2z" />
      </svg>
      <span className="font-extrabold text-2xl tracking-tight text-slate-900">Flux Tickets</span>
    </div>

    {/* NAVIGATION MENU */}
    <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-500">
      {['Eventos', 'Shows', 'Teatro', 'Esportes'].map((item) => (
        <a key={item} href="#" className="hover:text-[#6200EE] transition-colors">
          {item}
        </a>
      ))}
    </nav>

    {/* RIGHT ACTIONS */}
    <div className="flex items-center gap-5">
      {/* Search Icon */}
      <button className="text-slate-700 hover:text-[#6200EE] transition-colors bg-transparent border-none cursor-pointer p-1">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Cart Icon */}
      <button className="text-slate-700 hover:text-[#6200EE] transition-colors bg-transparent border-none cursor-pointer p-1 relative">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      {/* Violet Avatar "A" */}
      <div className="w-9 h-9 rounded-full bg-[#6200EE] text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
        A
      </div>
    </div>
  </header>
);