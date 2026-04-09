import { render, screen } from '@testing-library/react';
import HotelCard from './HotelCard';
import { LocaleProvider } from '../context/LocaleContext';
import { setupTestI18n } from '../i18n/test-utils';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const i18n = setupTestI18n('es');

const defaultProps = {
  name: 'HOTEL NORTH PARK',
  location: 'Bogotá, Colombia',
  price: 100,
  img: 'https://example.com/hotel.jpg',
};

function renderCard(initialLanguage: 'es' | 'en' = 'es') {
  i18n.changeLanguage(initialLanguage);
  return render(
    <LocaleProvider initialLanguage={initialLanguage}>
      <HotelCard {...defaultProps} />
    </LocaleProvider>,
  );
}

describe('HotelCard', () => {
  describe('content', () => {
    beforeEach(() => renderCard());

    it('renders the hotel name', () => {
      expect(screen.getByText('HOTEL NORTH PARK')).toBeInTheDocument();
    });

    it('renders the location', () => {
      expect(screen.getByText('Bogotá, Colombia')).toBeInTheDocument();
    });

    it('renders the price', () => {
      // 100 USD × 4200 = 420,000 COP — match the formatted number regardless of symbol/space variant
      expect(screen.getByText(/420\.000/)).toBeInTheDocument();
    });

    it('renders the hotel image with the name as alt text', () => {
      expect(screen.getByRole('img', { name: /hotel north park/i })).toBeInTheDocument();
    });
  });

  describe('Spanish', () => {
    beforeEach(() => renderCard('es'));

    it('renders the per-night label in Spanish', () => {
      expect(screen.getByText(es.recommendations.per_night)).toBeInTheDocument();
    });

    it('renders the book button in Spanish', () => {
      expect(screen.getByRole('button', { name: new RegExp(es.recommendations.book, 'i') })).toBeInTheDocument();
    });

    it('renders the taxes not included label in Spanish', () => {
      expect(screen.getByText(es.recommendations.taxes_not_included)).toBeInTheDocument();
    });
  });

  describe('English', () => {
    beforeEach(() => renderCard('en'));

    it('renders the per-night label in English', () => {
      expect(screen.getByText(en.recommendations.per_night)).toBeInTheDocument();
    });

    it('renders the book button in English', () => {
      expect(screen.getByRole('button', { name: new RegExp(en.recommendations.book, 'i') })).toBeInTheDocument();
    });

    it('renders the taxes not included label in English', () => {
      expect(screen.getByText(en.recommendations.taxes_not_included)).toBeInTheDocument();
    });
  });
});
