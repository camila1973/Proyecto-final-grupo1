import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../i18n/test-utils';
import { LocaleProvider } from '../../context/LocaleContext';
import ResultCard from './ResultCard';
import type { SearchResult } from './types';
import es from '../../i18n/locales/es.json';

setupTestI18n('es');

function renderCard(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

const amenityLabels = { wifi: 'WiFi', pool: 'Piscina', spa: 'Spa', gym: 'Gimnasio' };
const roomTypeLabels = { suite: 'Suite', standard: 'Estándar', deluxe: 'Deluxe' };

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'p1',
    name: 'Gran Caribe Resort',
    city: 'Cancún',
    countryCode: 'MX',
    neighborhood: 'Zona Hotelera',
    thumbnailUrl: 'https://placehold.co/400x300',
    amenities: ['wifi', 'pool', 'spa', 'gym'],
    stars: 5,
    rating: 4.7,
    reviewCount: 842,
    bestRoom: {
      roomId: 'r1',
      roomType: 'suite',
      bedType: 'king',
      capacity: 2,
      basePriceUsd: 320,
      priceUsd: 280,
      taxRatePct: 16,
      estimatedTotalUsd: 1300,
      hasFlatFees: false,
    },
    ...overrides,
  };
}

describe('ResultCard', () => {
  it('renders the property name', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText('Gran Caribe Resort')).toBeInTheDocument();
  });

  it('renders city and country', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/Cancún/)).toBeInTheDocument();
    expect(screen.getByText(/MX/)).toBeInTheDocument();
  });

  it('renders neighborhood when present', () => {
    renderCard(
      <ResultCard
        result={makeResult({ neighborhood: 'Zona Hotelera' })}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/Zona Hotelera/)).toBeInTheDocument();
  });

  it('shows per-night price using priceUsd when available (280 USD → COP)', () => {
    // 280 USD * 4200 COP/USD = 1,176,000 COP — look for "176"
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/176/)).toBeInTheDocument();
  });

  it('shows per-night price using basePriceUsd when priceUsd is null (320 USD → COP)', () => {
    // 320 USD * 4200 = 1,344,000 COP — look for "344"
    renderCard(
      <ResultCard
        result={makeResult({
          bestRoom: {
            roomId: 'r1', roomType: 'suite', bedType: 'king', capacity: 2,
            basePriceUsd: 320, priceUsd: null,
            taxRatePct: 16, estimatedTotalUsd: 1300, hasFlatFees: false,
          },
        })}
        nights={3}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/344/)).toBeInTheDocument();
  });

  it('shows estimated total label with "total" when dates are provided (nights > 0)', () => {
    // estimatedTotalUsd=1300, 1300*4200=5,460,000 — look for "460"
    renderCard(
      <ResultCard
        result={makeResult({ bestRoom: { roomId: 'r1', roomType: 'suite', bedType: 'king', capacity: 2, basePriceUsd: 320, priceUsd: 280, taxRatePct: 16, estimatedTotalUsd: 1300, hasFlatFees: false } })}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/total/)).toBeInTheDocument();
    expect(screen.getByText(/460/)).toBeInTheDocument();
  });

  it('shows incl. impuestos label when no dates (nights=0)', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={0}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/impuestos/)).toBeInTheDocument();
  });

  it('shows flat fees disclaimer when hasFlatFees=true and nights > 0', () => {
    renderCard(
      <ResultCard
        result={makeResult({
          bestRoom: {
            roomId: 'r1', roomType: 'suite', bedType: 'king', capacity: 2,
            basePriceUsd: 320, priceUsd: 280,
            taxRatePct: 16, estimatedTotalUsd: 1350, hasFlatFees: true,
          },
        })}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/cargos/)).toBeInTheDocument();
  });

  it('does not show flat fees disclaimer when hasFlatFees=false', () => {
    renderCard(
      <ResultCard
        result={makeResult({ bestRoom: { roomId: 'r1', roomType: 'suite', bedType: 'king', capacity: 2, basePriceUsd: 320, priceUsd: 280, taxRatePct: 16, estimatedTotalUsd: 1300, hasFlatFees: false } })}
        nights={4}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.queryByText(/cargos/)).not.toBeInTheDocument();
  });

  it('shows "flat fees may apply" note when no dates (nights=0)', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={0}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    // dateless mode always shows the flat fees may apply note
    expect(screen.getByText(/Cargos adicionales/)).toBeInTheDocument();
  });

  it('shows at most 3 amenities', () => {
    renderCard(
      <ResultCard
        result={makeResult({ amenities: ['wifi', 'pool', 'spa', 'gym'] })}
        nights={2}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Piscina')).toBeInTheDocument();
    expect(screen.getByText('Spa')).toBeInTheDocument();
    expect(screen.queryByText('Gimnasio')).not.toBeInTheDocument();
  });

  it('resolves amenity labels via the label map', () => {
    renderCard(
      <ResultCard
        result={makeResult({ amenities: ['pool'] })}
        nights={2}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText('Piscina')).toBeInTheDocument();
  });

  it('falls back to code when amenity label is not in map', () => {
    renderCard(
      <ResultCard
        result={makeResult({ amenities: ['beach_access'] })}
        nights={2}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText('beach_access')).toBeInTheDocument();
  });

  it('resolves room type from label map', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={2}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/Suite/)).toBeInTheDocument();
  });

  it('calls onBook when the book button is clicked', () => {
    const onBook = jest.fn();
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={3}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={onBook}
      />,
    );
    fireEvent.click(screen.getByText(es.search.card.book));
    expect(onBook).toHaveBeenCalledTimes(1);
  });

  it('renders the book button', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={2}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(es.search.card.book)).toBeInTheDocument();
  });

  it('shows capacity in guest label', () => {
    renderCard(
      <ResultCard
        result={makeResult()}
        nights={2}
        amenityLabels={amenityLabels}
        roomTypeLabels={roomTypeLabels}
        onBook={jest.fn()}
      />,
    );
    expect(screen.getByText(/huéspedes/)).toBeInTheDocument();
  });
});
