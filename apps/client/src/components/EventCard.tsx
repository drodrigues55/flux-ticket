export const EventCard = ({ title, date, location, price, onBuy }: any) => (
  <div className="bg-white rounded-[28px] p-5 shadow-sm border border-neutral-100 hover:shadow-lg transition-all duration-300">
    <div className="w-full h-40 bg-slate-100 rounded-2xl mb-4" />
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    <p className="text-sm text-slate-500 mb-4">{date} • {location}</p>
    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
      <span className="text-[#6200EE] font-bold">A partir de {price}</span>
      <button onClick={onBuy} className="bg-[#6200EE] text-white px-5 py-2 rounded-full text-sm font-bold border-none cursor-pointer hover:bg-[#5000c7] transition-all">Ver</button>
    </div>
  </div>
);
