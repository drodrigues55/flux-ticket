export const EventCard = ({ title, date, location, price, imageUrl, badge, onBuy }: any) => (
  <div 
    onClick={onBuy}
    className="group bg-[#18181B] rounded-[28px] p-5 shadow-md border border-white/5 hover:shadow-[0_0_0_2px_#9146FF] hover:border-transparent hover:-translate-y-1.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
  >
    <div>
      <div className="w-full h-40 bg-neutral-900 rounded-2xl mb-4 overflow-hidden relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/20 to-transparent group-hover:scale-105 transition-transform duration-200" />
        )}
        {badge && (
          <span className="absolute top-3 left-3 bg-[#9146FF] text-white text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full shadow-md z-10">
            {badge}
          </span>
        )}
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis group-hover:text-clip mb-1">
        <div className="animate-marquee-hover inline-block whitespace-nowrap">
          <h3 className="font-bold text-lg text-white group-hover:text-[#B388FF] transition-colors duration-200 inline">
            {title}
          </h3>
          <span className="hidden group-hover:inline font-bold text-lg text-white group-hover:text-[#B388FF] transition-colors duration-200">
            &nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;{title}
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2 min-h-[40px]">{date} • {location}</p>
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
      <span className="text-[#B388FF] font-normal text-sm">
        A partir de <span className="font-bold">{price}</span>
      </span>
      <button className="bg-[#9146FF] group-hover:bg-[#A970FF] text-white px-5 py-2 rounded-full text-sm font-bold border-none transition-all cursor-pointer">
        Ver
      </button>
    </div>
  </div>
);
