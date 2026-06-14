export const Header = () => (
    <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#6200EE] rounded-lg" />
            <span className="font-bold text-xl text-slate-900">Flux Tickets</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            {['Eventos', 'Shows', 'Teatro', 'Esportes'].map(i => <a key={i} href="#" className="hover:text-[#6200EE]">{i}</a>)}
        </nav>
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
        </div>
    </header>
);