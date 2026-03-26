import { render, screen } from '@testing-library/react';
import App from './App';
import { setupTestI18n } from './i18n/test-utils';
import es from './i18n/locales/es.json';
import en from './i18n/locales/en.json';

const i18n = setupTestI18n('es');

const mockProperty = (id: string, name: string) => ({
  propertyId: id,
  propertyName: name,
  city: 'Cancún',
  country: 'Mexico',
  neighborhood: 'Zona Hotelera',
  lat: 21.16,
  lon: -86.85,
  stars: 5,
  rating: 4.7,
  reviewCount: 100,
  thumbnailUrl: 'https://placehold.co/400x300',
  amenities: ['wifi'],
  rooms: [{ roomId: 'r1', roomType: 'deluxe', bedType: 'king', viewType: 'ocean', capacity: 2, basePriceUsd: 300, priceUsd: null, availabilityFrom: null, availabilityTo: null }],
});

beforeEach(() => {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('000000000001')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProperty('b1000000-0000-0000-0000-000000000001', 'Gran Caribe Resort & Spa')) });
    if (url.includes('000000000004')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProperty('b1000000-0000-0000-0000-000000000004', 'Hotel Histórico Centro')) });
    if (url.includes('000000000002')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProperty('b1000000-0000-0000-0000-000000000002', 'Playa Azul Hotel')) });
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  }) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('App (integration)', () => {
  it('renders all four main sections in Spanish', async () => {
    i18n.changeLanguage('es');
    render(<App />);

    expect(await screen.findByText('TravelHub')).toBeInTheDocument();
    expect(screen.getByText(es.hero.title)).toBeInTheDocument();
    expect(screen.getByText(es.recommendations.title)).toBeInTheDocument();
    expect(screen.getByText(es.footer.copyright)).toBeInTheDocument();
  });

  it('renders all four main sections in English', async () => {
    i18n.changeLanguage('en');
    render(<App />);

    expect(await screen.findByText('TravelHub')).toBeInTheDocument();
    expect(screen.getByText(en.hero.title)).toBeInTheDocument();
    expect(screen.getByText(en.recommendations.title)).toBeInTheDocument();
    expect(screen.getByText(en.footer.copyright)).toBeInTheDocument();
  });

  it('renders 3 hotel cards from the API', async () => {
    i18n.changeLanguage('es');
    render(<App />);

    expect(await screen.findByText('Gran Caribe Resort & Spa')).toBeInTheDocument();
    expect(await screen.findByText('Hotel Histórico Centro')).toBeInTheDocument();
    expect(await screen.findByText('Playa Azul Hotel')).toBeInTheDocument();
  });
});
