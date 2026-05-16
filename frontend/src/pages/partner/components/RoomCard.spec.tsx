import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../i18n/test-utils';
import RoomCard from './RoomCard';

setupTestI18n('es');

const BASE_PROPS = {
  roomId: 'r1',
  roomType: 'suite',
  bedType: 'King',
  capacity: 2,
  totalRooms: 10,
  basePriceUsd: 200,
  occupancyRate: 0.6,
  revenueUsd: 4200,
  active: true,
  currency: 'USD' as const,
};

describe('RoomCard', () => {
  it('renders the room type capitalized and bed type info line', () => {
    render(<RoomCard {...BASE_PROPS} />);
    expect(screen.getByText('Suite')).toBeInTheDocument();
    expect(screen.getByText(/suite · King/)).toBeInTheDocument();
  });

  it('renders occupancy percent', () => {
    render(<RoomCard {...BASE_PROPS} occupancyRate={0.4} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders 0% occupancy when totalRooms is 0 (no division by zero)', () => {
    render(<RoomCard {...BASE_PROPS} totalRooms={0} occupancyRate={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders em-dash for revenue when loading=true', () => {
    render(<RoomCard {...BASE_PROPS} loading />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('fires onClick when card is clicked', () => {
    const onClick = jest.fn();
    render(<RoomCard {...BASE_PROPS} onClick={onClick} />);
    fireEvent.click(screen.getByText('Suite'));
    expect(onClick).toHaveBeenCalled();
  });

  it('handles empty roomType (capitalize edge case)', () => {
    render(<RoomCard {...BASE_PROPS} roomType="" />);
    // No throw; bedType label still shown.
    expect(screen.getByText(/King/)).toBeInTheDocument();
  });
});
