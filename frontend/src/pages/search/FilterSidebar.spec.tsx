import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../i18n/test-utils';
import FilterSidebar from './FilterSidebar';
import type { SearchResponse } from './types';
import es from '../../i18n/locales/es.json';

setupTestI18n('es');

const amenityLabels = { wifi: 'WiFi', pool: 'Piscina' };
const roomTypeLabels = { suite: 'Suite', standard: 'Estándar' };

const mockFacets: SearchResponse['facets'] = {
  roomTypes: [
    { id: 'suite', count: 3 },
    { id: 'standard', count: 5 },
  ],
  amenities: [
    { id: 'wifi', count: 8 },
    { id: 'pool', count: 4 },
  ],
  priceRange: { min: 100, max: 500, currency: 'USD' },
};

function renderSidebar(overrides: Partial<Parameters<typeof FilterSidebar>[0]> = {}) {
  const defaults = {
    facets: mockFacets,
    amenityLabels,
    roomTypeLabels,
    amenityCategoryLabel: 'Amenidades',
    roomTypeCategoryLabel: 'Tipo de Habitación',
    priceMinCOP: '',
    priceMaxCOP: '',
    selectedAmenities: [] as string[],
    selectedRoomTypes: [] as string[],
    hasActiveFilters: false,
    onPriceMinChange: jest.fn(),
    onPriceMaxChange: jest.fn(),
    onToggleAmenity: jest.fn(),
    onToggleRoomType: jest.fn(),
    onClearFilters: jest.fn(),
    ...overrides,
  };
  return render(<FilterSidebar {...defaults} />);
}

describe('FilterSidebar', () => {
  it('renders the filter title', () => {
    renderSidebar();
    expect(screen.getByText(es.search.filters.title)).toBeInTheDocument();
  });

  it('does not show the clear button when no filters are active', () => {
    renderSidebar({ hasActiveFilters: false });
    expect(screen.queryByText(es.search.filters.clear)).not.toBeInTheDocument();
  });

  it('shows the clear button when filters are active', () => {
    renderSidebar({ hasActiveFilters: true });
    expect(screen.getByText(es.search.filters.clear)).toBeInTheDocument();
  });

  it('calls onClearFilters when clear button is clicked', () => {
    const onClearFilters = jest.fn();
    renderSidebar({ hasActiveFilters: true, onClearFilters });
    fireEvent.click(screen.getByText(es.search.filters.clear));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('renders amenity checkboxes with labels', () => {
    renderSidebar();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Piscina')).toBeInTheDocument();
  });

  it('renders amenity counts', () => {
    renderSidebar();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders room type checkboxes', () => {
    renderSidebar();
    expect(screen.getByText('Suite')).toBeInTheDocument();
    expect(screen.getByText('Estándar')).toBeInTheDocument();
  });

  it('marks amenity checkbox as checked when in selectedAmenities', () => {
    renderSidebar({ selectedAmenities: ['wifi'] });
    const checkboxes = screen.getAllByRole('checkbox');
    // wifi is the first amenity checkbox
    const wifiCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('WiFi');
    });
    expect(wifiCheckbox).toBeChecked();
  });

  it('marks amenity checkbox as unchecked when not in selectedAmenities', () => {
    renderSidebar({ selectedAmenities: [] });
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });

  it('marks room type checkbox as checked when in selectedRoomTypes', () => {
    renderSidebar({ selectedRoomTypes: ['suite'] });
    const checkboxes = screen.getAllByRole('checkbox');
    const suiteCheckbox = checkboxes.find((cb) => {
      const label = cb.closest('label');
      return label?.textContent?.includes('Suite');
    });
    expect(suiteCheckbox).toBeChecked();
  });

  it('calls onToggleAmenity with the amenity id when clicked', () => {
    const onToggleAmenity = jest.fn();
    renderSidebar({ onToggleAmenity });
    const wifiCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('WiFi'))!;
    fireEvent.click(wifiCheckbox);
    expect(onToggleAmenity).toHaveBeenCalledWith('wifi');
  });

  it('calls onToggleRoomType with the room type id when clicked', () => {
    const onToggleRoomType = jest.fn();
    renderSidebar({ onToggleRoomType });
    const suiteCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('Suite'))!;
    fireEvent.click(suiteCheckbox);
    expect(onToggleRoomType).toHaveBeenCalledWith('suite');
  });

  it('does not render amenities section when facets.amenities is empty', () => {
    renderSidebar({
      facets: { ...mockFacets, amenities: [] },
    });
    expect(screen.queryByText('WiFi')).not.toBeInTheDocument();
  });

  it('does not render room types section when facets.roomTypes is empty', () => {
    renderSidebar({
      facets: { ...mockFacets, roomTypes: [] },
    });
    expect(screen.queryByText('Suite')).not.toBeInTheDocument();
  });

  it('does not render amenities or room types when facets is null', () => {
    renderSidebar({ facets: null });
    expect(screen.queryByText('WiFi')).not.toBeInTheDocument();
    expect(screen.queryByText('Suite')).not.toBeInTheDocument();
  });

  it('calls onPriceMinChange when price min input changes', () => {
    const onPriceMinChange = jest.fn();
    renderSidebar({ onPriceMinChange });
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '500000' } });
    expect(onPriceMinChange).toHaveBeenCalledWith('500000');
  });

  it('calls onPriceMaxChange when price max input changes', () => {
    const onPriceMaxChange = jest.fn();
    renderSidebar({ onPriceMaxChange });
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '2000000' } });
    expect(onPriceMaxChange).toHaveBeenCalledWith('2000000');
  });
});
