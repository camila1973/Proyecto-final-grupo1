import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { todayISO, offsetDateISO } from './utils';

interface SearchBarFormProps {
  defaultCity: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultGuests: number;
}

// Extracted into its own component so `key` prop can reset local state on URL change
export default function SearchBarForm({
  defaultCity,
  defaultCheckIn,
  defaultCheckOut,
  defaultGuests,
}: SearchBarFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [city, setCity] = useState(defaultCity);
  const [checkIn, setCheckIn] = useState(defaultCheckIn || todayISO());
  const [checkOut, setCheckOut] = useState(defaultCheckOut || offsetDateISO(2));
  const [guests, setGuests] = useState(defaultGuests);

  function handleSearch() {
    navigate({ to: '/search', search: { city, checkIn, checkOut, guests } });
  }

  return (
    <div className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-3">
      <div className="flex-1 flex flex-col">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {t('hero.destination_label')}
        </label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('hero.destination_placeholder')}
          className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
        />
      </div>

      <div className="hidden md:block w-px bg-gray-200 my-1" />

      <div className="flex-1 flex flex-col">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {t('hero.dates_label')}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="text-sm text-gray-700 outline-none border-b border-transparent focus:border-blue-400 pb-1 w-full"
          />
          <span className="text-gray-400 text-xs flex-shrink-0">→</span>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="text-sm text-gray-700 outline-none border-b border-transparent focus:border-blue-400 pb-1 w-full"
          />
        </div>
      </div>

      <div className="hidden md:block w-px bg-gray-200 my-1" />

      <div className="flex-1 flex flex-col">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
          {t('hero.guests_label')}
        </label>
        <input
          type="number"
          min="1"
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="text-sm text-gray-700 outline-none border-b border-transparent focus:border-blue-400 pb-1"
        />
      </div>

      <button
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {t('hero.search')}
      </button>
    </div>
  );
}
