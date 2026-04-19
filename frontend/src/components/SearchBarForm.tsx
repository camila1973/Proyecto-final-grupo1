import { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import dayjs, { type Dayjs } from 'dayjs';
import { todayISO, offsetDateISO } from '../pages/search/utils';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SearchIcon from '@mui/icons-material/Search';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { API_BASE } from '../env';

interface SearchBarFormProps {
  defaultCity?: string;
  defaultCountryCode?: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: number;
}

export interface CitySuggestion {
  id: string;
  city: string;
  country: string;
}

async function fetchCitySuggestions(query: string): Promise<CitySuggestion[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${API_BASE}/api/search/cities?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions ?? [];
}

// ─── CityAutocomplete ─────────────────────────────────────────────────────────

interface CityAutocompleteProps {
  onChange: (city: string, countryCode?: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  value?: CitySuggestion;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
}

function CityAutocomplete({
  onChange,
  onKeyDown,
  value,
  error,
  helperText,
  placeholder,
}: CityAutocompleteProps) {
  const [options, setOptions] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fieldSx = { '& .MuiInputBase-root': { fontSize: '0.875rem', color: '#374151' } };

  return (
    <Autocomplete
      options={options}
      open={open && (loading || options.length > 0)}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      loading={loading}
      getOptionKey={(opt) => opt.id}
      getOptionLabel={(opt) => opt.country ? `${opt.city}, ${opt.country}` : opt.city}
      isOptionEqualToValue={(opt, val) => opt.city === val.city}
      onInputChange={(_, val, reason) => {
        if (reason === 'reset') return;
        onChange(val.trim(), undefined);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!val.trim()) { setOptions([]); setLoading(false); return; }
        setLoading(true);
        debounceRef.current = setTimeout(async () => {
          setOptions(await fetchCitySuggestions(val));
          setLoading(false);
        }, 300);
      }}
      value={value}
      onChange={(_, val) => {
        onChange(val?.city ?? '', val?.country);
      }}
      slotProps={{
        paper: { elevation: 3 },
        popper: { placement: 'bottom-start' },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          onKeyDown={onKeyDown}
          sx={{
            ...fieldSx,
            '& .MuiInput-underline:before': { display: 'none' },
            '& .MuiInput-underline:after': { display: 'none' },
          }}
        />
      )}
    />
  );
}

// ─── SearchBarForm ─────────────────────────────────────────────────────────────

// Shared hero search form — used on HomePage and SearchPage.
// `key` prop on the consumer resets local state when URL params change.
export default function SearchBarForm({
  defaultCountryCode = '',
  defaultCity = '',
  defaultCheckIn = '',
  defaultCheckOut = '',
  defaultGuests = 2,
}: SearchBarFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [city, setCity] = useState<string>(defaultCity);
  const [countryCode, setCountryCode] = useState<string>(defaultCountryCode);
  const [checkIn, setCheckIn] = useState<Dayjs | null>(
    dayjs(defaultCheckIn || todayISO()),
  );
  const [checkOut, setCheckOut] = useState<Dayjs | null>(
    dayjs(defaultCheckOut || offsetDateISO(2)),
  );
  const [guests, setGuests] = useState(defaultGuests);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [cityError, setCityError] = useState('');

  function handleSearch() {
    let valid = true;
    
    if (!city.trim()) {
      setCityError(t('search.error_city_required'));
      valid = false;
    } else {
      setCityError('');
    }

    if (!valid) return;

    navigate({
      to: '/search',
      search: {
        city: city.trim(),
        countryCode: countryCode.trim(),
        checkIn: checkIn?.format('YYYY-MM-DD') ?? todayISO(),
        checkOut: checkOut?.format('YYYY-MM-DD') ?? offsetDateISO(2),
        guests: Math.max(1, guests),
        priceMin: undefined,
        priceMax: undefined,
        amenities: undefined,
        roomTypes: undefined,
        bedTypes: undefined,
        viewTypes: undefined,
        stars: undefined,
      },
    });
  }

  const dateSx = {
    '& .MuiInputBase-root': { fontSize: '0.875rem', color: '#374151' },
    '& .MuiInputAdornment-root': { ml: 0 },
  };

  return (
    <div className="bg-white rounded-xl px-5 py-3.5 flex flex-col md:flex-row items-stretch gap-0">
      {/* Destination */}
      <div className="flex-1 flex flex-col justify-center py-1 pr-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">
          {t('hero.destination_label')}
        </label>
        <CityAutocomplete
          onChange={(val, code) => { setCity(val); setCountryCode(code ?? ''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          value={{ id: '', city, country: countryCode }} // for correct option highlighting
          error={!!cityError}
          helperText={cityError}
          placeholder={t('hero.destination_placeholder')}
        />
      </div>

      <div className="hidden md:block w-px bg-gray-200 my-2" />

      {/* Check-in */}
      <div className="flex-1 flex flex-col justify-center py-1 px-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">
          {t('hero.check_in_label')}
        </label>
        <DatePicker
          value={checkIn}
          onChange={(val) => {
            setCheckIn(val);
            if (val && checkOut && !checkOut.isAfter(val)) {
              setCheckOut(val.add(1, 'day'));
            }
          }}
          disablePast
          open={checkInOpen}
          onOpen={() => setCheckInOpen(true)}
          onClose={() => setCheckInOpen(false)}
          slotProps={{
            textField: {
              variant: 'standard',
              onClick: () => setCheckInOpen(true),
              slotProps: { input: { disableUnderline: true } },
            },
          }}
          sx={dateSx}
        />
      </div>

      <div className="hidden md:block w-px bg-gray-200 my-2" />

      {/* Check-out */}
      <div className="flex-1 flex flex-col justify-center py-1 px-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">
          {t('hero.check_out_label')}
        </label>
        <DatePicker
          value={checkOut}
          onChange={(val) => setCheckOut(val)}
          minDate={checkIn?.add(1, 'day') ?? undefined}
          open={checkOutOpen}
          onOpen={() => setCheckOutOpen(true)}
          onClose={() => setCheckOutOpen(false)}
          slotProps={{
            textField: {
              variant: 'standard',
              onClick: () => setCheckOutOpen(true),
              slotProps: { input: { disableUnderline: true } },
            },
          }}
          sx={dateSx}
        />
      </div>

      <div className="hidden md:block w-px bg-gray-200 my-2" />

      {/* Guests */}
      <div className="flex-1 flex flex-col justify-center py-1 pl-4 pr-4">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">
          {t('hero.guests_label')}
        </label>
        <TextField
          variant="standard"
          type="number"
          value={guests}
          onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
          slotProps={{ htmlInput: { min: 1 }, input: { disableUnderline: true } }}
          sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', color: '#374151' } }}
        />
      </div>

      {/* Search button */}
      <div className="flex items-center pl-2">
        <Button
          variant="contained"
          color="warning"
          onClick={handleSearch}
          startIcon={<SearchIcon fontSize="small" />}
          sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', px: 3, py: 1.5, borderRadius: 2 }}
        >
          {t('hero.search')}
        </Button>
      </div>
    </div>
  );
}
