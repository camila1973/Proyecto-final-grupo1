export interface FilterState {
  priceMin: string;
  priceMax: string;
  amenities: string[];
  roomTypes: string[];
  bedTypes: string[];
  viewTypes: string[];
  stars: number[];
}

export const INITIAL_FILTERS: FilterState = {
  priceMin: '',
  priceMax: '',
  amenities: [],
  roomTypes: [],
  bedTypes: [],
  viewTypes: [],
  stars: [],
};

type ArrayField = 'amenities' | 'roomTypes' | 'bedTypes' | 'viewTypes';

export type FilterAction =
  | { type: 'TOGGLE_ITEM'; field: ArrayField; id: string }
  | { type: 'TOGGLE_STAR'; star: number }
  | { type: 'SET_PRICE'; field: 'priceMin' | 'priceMax'; value: string }
  | { type: 'SET_PRICE_RANGE'; priceMin: string; priceMax: string }
  | { type: 'CLEAR' }
  | { type: 'REPLACE'; state: FilterState };

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'TOGGLE_ITEM': {
      const prev = state[action.field];
      return {
        ...state,
        [action.field]: prev.includes(action.id)
          ? prev.filter((x) => x !== action.id)
          : [...prev, action.id],
      };
    }
    case 'TOGGLE_STAR':
      return {
        ...state,
        stars: state.stars.includes(action.star)
          ? state.stars.filter((s) => s !== action.star)
          : [...state.stars, action.star],
      };
    case 'SET_PRICE':
      return { ...state, [action.field]: action.value };
    case 'SET_PRICE_RANGE':
      return { ...state, priceMin: action.priceMin, priceMax: action.priceMax };
    case 'CLEAR':
      return INITIAL_FILTERS;
    case 'REPLACE':
      return action.state;
  }
}
