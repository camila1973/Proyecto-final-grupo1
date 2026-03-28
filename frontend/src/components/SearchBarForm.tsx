import { useState, useEffect, useRef } from 'react';
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
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: number;
}

interface CitySuggestion {
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

// Shared hero search form — used on HomePage and SearchPage.
// `key` prop on the consumer resets local state when URL params change.
export default function SearchBarForm({
  defaultCity = '',
  defaultCheckIn = '',
  defaultCheckOut = '',
  defaultGuests = 2,
}: SearchBarFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [city, setCity] = useState(defaultCity);
  const [cityOptions, setCityOptions] = useState<CitySuggestion[]>([]);
  const [checkIn, setCheckIn] = useState<Dayjs | null>(
    dayjs(defaultCheckIn || todayISO()),
  );
  const [checkOut, setCheckOut] = useState<Dayjs | null>(
    dayjs(defaultCheckOut || offsetDateISO(2)),
  );
  const [guests, setGuests] = useState(defaultGuests);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchCitySuggestions(city);
      setCityOptions(results);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [city]);

  function handleSearch() {
    navigate({
      to: '/search',
      search: {
        city,
        checkIn: checkIn?.format('YYYY-MM-DD') ?? todayISO(),
        checkOut: checkOut?.format('YYYY-MM-DD') ?? offsetDateISO(2),
        guests,
      },
    });
  }

  const fieldSx = { '& .MuiInputBase-root': { fontSize: '0.875rem', color: '#374151' } };

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
        <Autocomplete
          freeSolo
          options={cityOptions}
          getOptionLabel={(opt) =>
            typeof opt === 'string' ? opt : `${opt.city}, ${opt.country}`
          }
          inputValue={city}
          onInputChange={(_, value) => setCity(value)}
          onChange={(_, value) => {
            if (value && typeof value !== 'string') setCity(value.city);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          slotProps={{
            paper: { elevation: 3 },
            popper: { placement: 'bottom-start' },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              placeholder={t('hero.destination_placeholder')}
              sx={{
                ...fieldSx,
                '& .MuiInput-underline:before': { display: 'none' },
                '& .MuiInput-underline:after': { display: 'none' },
              }}
            />
          )}
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
          onChange={(val) => setCheckIn(val)}
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
          minDate={checkIn ?? undefined}
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
          onChange={(e) => setGuests(Number(e.target.value))}
          slotProps={{ htmlInput: { min: 1 }, input: { disableUnderline: true } }}
          sx={{ ...fieldSx }}
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
