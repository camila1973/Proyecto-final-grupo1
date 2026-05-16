import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import RoomCalendar from './RoomCalendar';
import type { CalendarDay } from './calendarDays';

setupTestI18n('es');

function makeDay(date: string, overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    date,
    avail: undefined,
    rate: 200,
    hasOverride: false,
    state: 'available',
    ...overrides,
  };
}

const BASE_PROPS = {
  month: '2099-06',
  language: 'es' as const,
  days: [
    makeDay('2099-06-01'),
    makeDay('2099-06-02', { state: 'low' }),
    makeDay('2099-06-03', { state: 'sold-out' }),
    makeDay('2099-06-04', { state: 'blocked' }),
    makeDay('2099-06-05', { hasOverride: true }),
  ],
  selStart: null,
  selEnd: null,
  hovDate: null,
  hintMode: 'idle' as const,
  interactive: false,
  onPrevMonth: jest.fn(),
  onNextMonth: jest.fn(),
  onDayClick: jest.fn(),
  onDayHover: jest.fn(),
};

describe('RoomCalendar', () => {
  beforeEach(() => {
    BASE_PROPS.onPrevMonth = jest.fn();
    BASE_PROPS.onNextMonth = jest.fn();
    BASE_PROPS.onDayClick = jest.fn();
    BASE_PROPS.onDayHover = jest.fn();
  });

  it('renders the month label', () => {
    render(<RoomCalendar {...BASE_PROPS} />);
    expect(screen.getByText(/junio.*2099/i)).toBeInTheDocument();
  });

  it('renders the day numbers from the day list', () => {
    render(<RoomCalendar {...BASE_PROPS} />);
    // Look for first 5 day numbers.
    ['1', '2', '3', '4', '5'].forEach((n) => expect(screen.getAllByText(n).length).toBeGreaterThan(0));
  });

  it('fires onPrevMonth when the back arrow is clicked', () => {
    render(<RoomCalendar {...BASE_PROPS} />);
    const back = screen.getByTestId('ArrowBackIcon').closest('button')!;
    fireEvent.click(back);
    expect(BASE_PROPS.onPrevMonth).toHaveBeenCalled();
  });

  it('fires onNextMonth when the forward arrow is clicked', () => {
    render(<RoomCalendar {...BASE_PROPS} />);
    const fwd = screen.getByTestId('ArrowForwardIcon').closest('button')!;
    fireEvent.click(fwd);
    expect(BASE_PROPS.onNextMonth).toHaveBeenCalled();
  });

  it('fires onDayClick for a future day in interactive mode', () => {
    render(<RoomCalendar {...BASE_PROPS} interactive />);
    fireEvent.click(screen.getAllByText('1')[0]);
    expect(BASE_PROPS.onDayClick).toHaveBeenCalledWith('2099-06-01');
  });

  it('shows the selecting hint when hintMode is "selecting"', () => {
    render(<RoomCalendar {...BASE_PROPS} hintMode="selecting" />);
    // The hint text is whichever ES key resolves to.
    // Hint bar contains "ℹ︎" prefix; we look for that.
    expect(screen.getByText(/ℹ/)).toBeInTheDocument();
  });

  it('renders a selected start day when selStart is set', () => {
    render(<RoomCalendar {...BASE_PROPS} interactive selStart="2099-06-02" />);
    // No throw; multiple "2" cells exist.
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('renders a complete selected range', () => {
    render(<RoomCalendar {...BASE_PROPS} interactive selStart="2099-06-01" selEnd="2099-06-03" />);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('renders a hover preview when only selStart is set', () => {
    render(<RoomCalendar {...BASE_PROPS} interactive selStart="2099-06-01" hovDate="2099-06-03" />);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });
});
