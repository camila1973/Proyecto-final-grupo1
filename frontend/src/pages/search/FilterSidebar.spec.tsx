import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../i18n/test-utils';
import FilterSidebar from './FilterSidebar';
import { INITIAL_FILTERS } from './filterReducer';
import type { FilterState } from './filterReducer';
import type { SearchResponse } from './types';
import es from '../../i18n/locales/es.json';
import { LocaleProvider } from '../../context/LocaleContext';

setupTestI18n('es');

const amenityLabels = { wifi: 'WiFi', pool: 'Piscina' };
const roomTypeLabels = { suite: 'Suite', standard: 'Estándar' };
const bedTypeLabels = { king: 'King', queen: 'Queen' };
const viewTypeLabels = { ocean: 'Vista al mar', city: 'Vista a la ciudad' };

const mockFacets: SearchResponse['facets'] = {
  roomTypes: [
    { id: 'suite', count: 3 },
    { id: 'standard', count: 5 },
  ],
  bedTypes: [
    { id: 'king', count: 2 },
    { id: 'queen', count: 1 },
  ],
  viewTypes: [
    { id: 'ocean', count: 2 },
    { id: 'city', count: 1 },
  ],
  amenities: [
    { id: 'wifi', count: 8 },
    { id: 'pool', count: 4 },
  ],
  stars: [
    { id: 5, count: 1 },
    { id: 4, count: 1 },
  ],
  priceRange: { min: 100, max: 500, currency: 'USD' },
};

const labelProps = {
  amenityLabels,
  roomTypeLabels,
  bedTypeLabels,
  viewTypeLabels,
  amenityCategoryLabel: 'Amenidades',
  roomTypeCategoryLabel: 'Tipo de Habitación',
  bedTypeCategoryLabel: 'Tipo de Cama',
  viewTypeCategoryLabel: 'Vista',
};

function renderSidebar(
  committedFilters: FilterState = INITIAL_FILTERS,
  overrides: Partial<Parameters<typeof FilterSidebar>[0]> = {},
) {
  const onFiltersChange = jest.fn();
  const props = {
    facets: mockFacets,
    committedFilters,
    onFiltersChange,
    ...labelProps,
    ...overrides,
  };
  render(
    <LocaleProvider>
      <FilterSidebar {...props} />
    </LocaleProvider>,
  );
  return { onFiltersChange };
}

describe('FilterSidebar', () => {
  it('renders the filter title', () => {
    renderSidebar();
    expect(screen.getByText(es.search.filters.title)).toBeInTheDocument();
  });

  it('does not show the clear button when no filters are active', () => {
    renderSidebar();
    expect(screen.queryByText(es.search.filters.clear)).not.toBeInTheDocument();
  });

  it('shows the clear button when committed filters are active', () => {
    renderSidebar({ ...INITIAL_FILTERS, amenities: ['wifi'] });
    expect(screen.getByText(es.search.filters.clear)).toBeInTheDocument();
  });

  it('calls onFiltersChange with INITIAL_FILTERS when clear is clicked', () => {
    const { onFiltersChange } = renderSidebar({ ...INITIAL_FILTERS, amenities: ['wifi'] });
    fireEvent.click(screen.getByText(es.search.filters.clear));
    expect(onFiltersChange).toHaveBeenCalledWith(INITIAL_FILTERS);
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

  it('marks amenity checkbox as checked when in committedFilters', () => {
    renderSidebar({ ...INITIAL_FILTERS, amenities: ['wifi'] });
    const wifiCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('WiFi'));
    expect(wifiCheckbox).toBeChecked();
  });

  it('marks amenity checkbox as unchecked when not in committedFilters', () => {
    renderSidebar();
    screen.getAllByRole('checkbox').forEach((cb) => expect(cb).not.toBeChecked());
  });

  it('marks room type checkbox as checked when in committedFilters', () => {
    renderSidebar({ ...INITIAL_FILTERS, roomTypes: ['suite'] });
    const suiteCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('Suite'));
    expect(suiteCheckbox).toBeChecked();
  });

  it('calls onFiltersChange with toggled amenity when clicked', () => {
    const { onFiltersChange } = renderSidebar();
    const wifiCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('WiFi'))!;
    fireEvent.click(wifiCheckbox);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ amenities: ['wifi'] }),
    );
  });

  it('calls onFiltersChange with toggled room type when clicked', () => {
    const { onFiltersChange } = renderSidebar();
    const suiteCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('Suite'))!;
    fireEvent.click(suiteCheckbox);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ roomTypes: ['suite'] }),
    );
  });

  it('does not render amenities section when facets.amenities is empty', () => {
    renderSidebar(INITIAL_FILTERS, { facets: { ...mockFacets, amenities: [] } });
    expect(screen.queryByText('WiFi')).not.toBeInTheDocument();
  });

  it('does not render room types section when facets.roomTypes is empty', () => {
    renderSidebar(INITIAL_FILTERS, { facets: { ...mockFacets, roomTypes: [] } });
    expect(screen.queryByText('Suite')).not.toBeInTheDocument();
  });

  it('does not render amenities or room types when facets is null', () => {
    renderSidebar(INITIAL_FILTERS, { facets: null });
    expect(screen.queryByText('WiFi')).not.toBeInTheDocument();
    expect(screen.queryByText('Suite')).not.toBeInTheDocument();
  });

  it('renders bed type checkboxes', () => {
    renderSidebar();
    expect(screen.getByText('King')).toBeInTheDocument();
    expect(screen.getByText('Queen')).toBeInTheDocument();
  });

  it('calls onFiltersChange with toggled bed type when clicked', () => {
    const { onFiltersChange } = renderSidebar();
    const kingCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('King'))!;
    fireEvent.click(kingCheckbox);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ bedTypes: ['king'] }),
    );
  });

  it('renders view type checkboxes', () => {
    renderSidebar();
    expect(screen.getByText('Vista al mar')).toBeInTheDocument();
    expect(screen.getByText('Vista a la ciudad')).toBeInTheDocument();
  });

  it('calls onFiltersChange with toggled view type when clicked', () => {
    const { onFiltersChange } = renderSidebar();
    const oceanCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('Vista al mar'))!;
    fireEvent.click(oceanCheckbox);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ viewTypes: ['ocean'] }),
    );
  });

  it('renders star checkboxes', () => {
    renderSidebar();
    expect(screen.getByText('★★★★★')).toBeInTheDocument();
    expect(screen.getByText('★★★★')).toBeInTheDocument();
  });

  it('calls onFiltersChange with toggled star when clicked', () => {
    const { onFiltersChange } = renderSidebar();
    const fiveStarCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('★★★★★'))!;
    fireEvent.click(fiveStarCheckbox);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ stars: [5] }),
    );
  });

  it('marks bed type checkbox as checked when in committedFilters', () => {
    renderSidebar({ ...INITIAL_FILTERS, bedTypes: ['king'] });
    const kingCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('King'));
    expect(kingCheckbox).toBeChecked();
  });

  it('marks view type checkbox as checked when in committedFilters', () => {
    renderSidebar({ ...INITIAL_FILTERS, viewTypes: ['ocean'] });
    const oceanCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('Vista al mar'));
    expect(oceanCheckbox).toBeChecked();
  });

  it('marks star checkbox as checked when in committedFilters', () => {
    renderSidebar({ ...INITIAL_FILTERS, stars: [5] });
    const fiveStarCheckbox = screen
      .getAllByRole('checkbox')
      .find((cb) => cb.closest('label')?.textContent?.includes('★★★★★'));
    expect(fiveStarCheckbox).toBeChecked();
  });

  it('renders price range slider with facet bounds', () => {
    renderSidebar();
    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('aria-valuemin', String(mockFacets.priceRange.min));
    expect(sliders[0]).toHaveAttribute('aria-valuemax', String(mockFacets.priceRange.max));
  });

  it('calls onFiltersChange when price range slider min increases', () => {
    const { onFiltersChange } = renderSidebar();
    const sliders = screen.getAllByRole('slider');
    fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });
    fireEvent.keyUp(sliders[0]);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: String(mockFacets.priceRange.min + 1), priceMax: '' }),
    );
  });

  it('calls onFiltersChange when price range slider max decreases', () => {
    const { onFiltersChange } = renderSidebar();
    const sliders = screen.getAllByRole('slider');
    fireEvent.keyDown(sliders[1], { key: 'ArrowLeft' });
    fireEvent.keyUp(sliders[1]);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ priceMin: '', priceMax: String(mockFacets.priceRange.max - 1) }),
    );
  });
});
