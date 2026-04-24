import { filterReducer, INITIAL_FILTERS, FilterState } from './filterReducer';

const withAmenities = (amenities: string[]): FilterState => ({
  ...INITIAL_FILTERS,
  amenities,
});

describe('filterReducer', () => {
  describe('TOGGLE_ITEM', () => {
    it('adds an item when it is not present', () => {
      const next = filterReducer(INITIAL_FILTERS, { type: 'TOGGLE_ITEM', field: 'amenities', id: 'wifi' });
      expect(next.amenities).toEqual(['wifi']);
    });

    it('removes an item when it is already present', () => {
      const state = withAmenities(['wifi', 'pool']);
      const next = filterReducer(state, { type: 'TOGGLE_ITEM', field: 'amenities', id: 'wifi' });
      expect(next.amenities).toEqual(['pool']);
    });

    it('does not mutate other fields', () => {
      const state: FilterState = { ...INITIAL_FILTERS, priceMin: '100', roomTypes: ['suite'] };
      const next = filterReducer(state, { type: 'TOGGLE_ITEM', field: 'amenities', id: 'wifi' });
      expect(next.priceMin).toBe('100');
      expect(next.roomTypes).toEqual(['suite']);
    });

    it.each(['amenities', 'roomTypes', 'bedTypes', 'viewTypes'] as const)(
      'works for field "%s"',
      (field) => {
        const next = filterReducer(INITIAL_FILTERS, { type: 'TOGGLE_ITEM', field, id: 'x' });
        expect(next[field]).toEqual(['x']);
        const next2 = filterReducer(next, { type: 'TOGGLE_ITEM', field, id: 'x' });
        expect(next2[field]).toEqual([]);
      },
    );
  });

  describe('TOGGLE_STAR', () => {
    it('adds a star rating when not present', () => {
      const next = filterReducer(INITIAL_FILTERS, { type: 'TOGGLE_STAR', star: 5 });
      expect(next.stars).toEqual([5]);
    });

    it('removes a star rating when already present', () => {
      const state: FilterState = { ...INITIAL_FILTERS, stars: [4, 5] };
      const next = filterReducer(state, { type: 'TOGGLE_STAR', star: 5 });
      expect(next.stars).toEqual([4]);
    });

    it('does not mutate other fields', () => {
      const state: FilterState = { ...INITIAL_FILTERS, priceMin: '50' };
      const next = filterReducer(state, { type: 'TOGGLE_STAR', star: 3 });
      expect(next.priceMin).toBe('50');
    });
  });

  describe('SET_PRICE', () => {
    it('sets priceMin', () => {
      const next = filterReducer(INITIAL_FILTERS, { type: 'SET_PRICE', field: 'priceMin', value: '100' });
      expect(next.priceMin).toBe('100');
      expect(next.priceMax).toBe('');
    });

    it('sets priceMax', () => {
      const next = filterReducer(INITIAL_FILTERS, { type: 'SET_PRICE', field: 'priceMax', value: '500' });
      expect(next.priceMax).toBe('500');
      expect(next.priceMin).toBe('');
    });

    it('overwrites an existing price value', () => {
      const state: FilterState = { ...INITIAL_FILTERS, priceMin: '100' };
      const next = filterReducer(state, { type: 'SET_PRICE', field: 'priceMin', value: '200' });
      expect(next.priceMin).toBe('200');
    });
  });

  describe('REPLACE', () => {
    it('replaces state wholesale', () => {
      const next: FilterState = { ...INITIAL_FILTERS, amenities: ['wifi'], stars: [5] };
      expect(filterReducer(INITIAL_FILTERS, { type: 'REPLACE', state: next })).toEqual(next);
    });

    it('replaces a dirty state back to initial', () => {
      const dirty: FilterState = { ...INITIAL_FILTERS, roomTypes: ['suite'] };
      expect(filterReducer(dirty, { type: 'REPLACE', state: INITIAL_FILTERS })).toEqual(INITIAL_FILTERS);
    });
  });

  describe('CLEAR', () => {
    it('resets all fields to initial values', () => {
      const dirty: FilterState = {
        priceMin: '100',
        priceMax: '500',
        amenities: ['wifi'],
        roomTypes: ['suite'],
        bedTypes: ['king'],
        viewTypes: ['ocean'],
        stars: [5],
      };
      expect(filterReducer(dirty, { type: 'CLEAR' })).toEqual(INITIAL_FILTERS);
    });

    it('is idempotent on an already-clean state', () => {
      expect(filterReducer(INITIAL_FILTERS, { type: 'CLEAR' })).toEqual(INITIAL_FILTERS);
    });
  });
});
