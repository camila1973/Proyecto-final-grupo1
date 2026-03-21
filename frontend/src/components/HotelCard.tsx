import { useTranslation } from 'react-i18next';

export interface HotelCardProps {
  name: string;
  location: string;
  price: string;
  img: string;
}

export default function HotelCard({ name, location, price, img }: HotelCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <img src={img} alt={name} className="w-full h-44 object-cover" />
      <div className="p-4">
        <p className="font-bold text-sm text-gray-900">{name}</p>
        <p className="text-sm text-gray-500 mb-3">{location}</p>
        <p className="text-lg font-bold text-gray-900">COP {price}</p>
        <p className="text-xs text-gray-400 mb-4">{t('recommendations.per_night')}</p>
        <button className="w-full flex items-center justify-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm py-2.5 rounded-lg transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 3V2M10 3V2M1 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {t('recommendations.book')}
        </button>
      </div>
    </div>
  );
}
