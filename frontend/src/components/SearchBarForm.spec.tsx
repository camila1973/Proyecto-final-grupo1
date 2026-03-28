import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';
import SearchBarForm from './SearchBarForm';

// ─── Mock router ──────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

const i18n = setupTestI18n('es');

function renderForm(props: Partial<React.ComponentProps<typeof SearchBarForm>> = {}, lang: 'es' | 'en' = 'es') {
  i18n.changeLanguage(lang);
  return render(
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <SearchBarForm {...props} />
    </LocalizationProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchBarForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ suggestions: [] }),
    });
  });

  describe('rendering', () => {
    it('renders the destination label in Spanish', () => {
      renderForm();
      expect(screen.getByText(es.hero.destination_label)).toBeInTheDocument();
    });

    it('renders the check-in label in Spanish', () => {
      renderForm();
      expect(screen.getByText(es.hero.check_in_label)).toBeInTheDocument();
    });

    it('renders the check-out label in Spanish', () => {
      renderForm();
      expect(screen.getByText(es.hero.check_out_label)).toBeInTheDocument();
    });

    it('renders the guests label in Spanish', () => {
      renderForm();
      expect(screen.getByText(es.hero.guests_label)).toBeInTheDocument();
    });

    it('renders the search button in Spanish', () => {
      renderForm();
      expect(screen.getByRole('button', { name: new RegExp(es.hero.search, 'i') })).toBeInTheDocument();
    });

    it('renders labels in English when locale is en', () => {
      renderForm({}, 'en');
      expect(screen.getByText(en.hero.destination_label)).toBeInTheDocument();
      expect(screen.getByText(en.hero.search)).toBeInTheDocument();
    });
  });

  describe('default values', () => {
    it('pre-fills the city input with defaultCity', () => {
      renderForm({ defaultCity: 'Cancún' });
      expect(screen.getByDisplayValue('Cancún')).toBeInTheDocument();
    });

    it('pre-fills the guests input with defaultGuests', () => {
      renderForm({ defaultGuests: 4 });
      expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    });

    it('defaults guests to 2 when not provided', () => {
      renderForm();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    });
  });

  describe('search navigation', () => {
    it('calls navigate with city, dates and guests when search button is clicked', () => {
      renderForm({ defaultCity: 'Bogotá', defaultGuests: 3 });
      fireEvent.click(screen.getByRole('button', { name: new RegExp(es.hero.search, 'i') }));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/search',
          search: expect.objectContaining({ city: 'Bogotá', guests: 3 }),
        }),
      );
    });

    it('includes checkIn and checkOut in the navigation params', () => {
      renderForm({ defaultCity: 'Medellín' });
      fireEvent.click(screen.getByRole('button', { name: new RegExp(es.hero.search, 'i') }));
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          search: expect.objectContaining({
            checkIn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            checkOut: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        }),
      );
    });

    it('calls navigate when Enter is pressed in the city input', () => {
      renderForm({ defaultCity: 'Cartagena' });
      const input = screen.getByDisplayValue('Cartagena');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('city autocomplete', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('fetches city suggestions after 300ms debounce', async () => {
      renderForm();
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'Can' } });

      expect(global.fetch).not.toHaveBeenCalled();

      act(() => { jest.advanceTimersByTime(300); });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/search/cities?q=Can'),
        );
      });
    });

    it('does not fetch when input is empty', async () => {
      renderForm({ defaultCity: 'Cancún' });
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '' } });

      act(() => { jest.advanceTimersByTime(300); });

      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('renders city suggestions returned by the API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: [
            { city: 'Cancún', country: 'MX' },
            { city: 'Cancun', country: 'MX' },
          ],
        }),
      });

      renderForm();
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'Cancun' } });

      act(() => { jest.advanceTimersByTime(300); });

      await waitFor(() => {
        expect(screen.getByText('Cancún, MX')).toBeInTheDocument();
      });
    });

    it('shows no suggestions when the API returns an empty array', async () => {
      renderForm();
      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: 'zzzzz' } });

      act(() => { jest.advanceTimersByTime(300); });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
