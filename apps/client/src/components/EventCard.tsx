export const EventCard = ({ title, date, location, price, onBuy }: any) => (
  <div 
    onClick={onBuy}
    className="group bg-white rounded-[28px] p-5 shadow-sm border border-neutral-100/80 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
  >
    <div>
      <div className="w-full h-40 bg-slate-100 rounded-2xl mb-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-200/50 to-transparent group-hover:scale-105 transition-transform duration-300" />
      </div>
      <h3 className="font-bold text-lg mb-1 text-slate-900 group-hover:text-[#6200EE] transition-colors duration-200">{title}</h3>
      <p className="text-sm text-slate-500 mb-4">{date} • {location}</p>
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
      <span className="text-[#6200EE] font-bold">A partir de {price}</span>
      <button className="bg-[#6200EE] group-hover:bg-[#5000c7] text-white px-5 py-2 rounded-full text-sm font-bold border-none transition-all cursor-pointer">
        Ver
      </button>
    </div>
  </div>
);
