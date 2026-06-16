export const EventCard = ({ title, date, location, price, imageUrl, badge, onBuy }: any) => (
  <div 
    onClick={onBuy}
    className="group bg-white rounded-[14px] p-5 border border-[#EAEAEA] hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer flex flex-col justify-between"
  >
    <div>
      <div className="w-full h-40 bg-neutral-100 rounded-lg mb-4 overflow-hidden relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-neutral-200 to-transparent group-hover:scale-105 transition-transform duration-200" />
        )}
        {badge && (
          <span className="absolute top-3 left-3 bg-[#FF3200] text-white text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full shadow-md z-10">
            {badge}
          </span>
        )}
      </div>
      <div className="w-full overflow-hidden whitespace-nowrap text-ellipsis group-hover:text-clip mb-1">
        <div className="animate-marquee-hover inline-block whitespace-nowrap">
          <h3 className="font-bold text-lg text-neutral-900 group-hover:text-[#FF3200] transition-colors duration-200 inline">
            {title}
          </h3>
          <span className="hidden group-hover:inline font-bold text-lg text-neutral-900 group-hover:text-[#FF3200] transition-colors duration-200">
            &nbsp;&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;&nbsp;{title}
          </span>
        </div>
      </div>
      <p className="text-sm text-neutral-500 mb-4 line-clamp-2 min-h-[40px]">{date} • {location}</p>
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-auto">
      <span className="text-neutral-600 font-normal text-sm">
        A partir de <span className="font-bold text-neutral-900">{price}</span>
      </span>
      <button className="bg-[#FF3200] hover:bg-[#E62D00] text-white px-5 py-2 rounded-full text-sm font-bold border-none transition-all cursor-pointer shadow-sm">
        Ver
      </button>
    </div>
  </div>
);
