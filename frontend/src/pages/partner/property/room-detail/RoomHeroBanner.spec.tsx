import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import RoomHeroBanner from './RoomHeroBanner';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('RoomHeroBanner', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const BASE = {
    propertyId: 'prop-1',
    propertyName: 'Hotel Test',
    roomType: 'Suite',
    subtitle: '5 habitaciones · King · 2 huéspedes',
  };

  it('renders the room type as the hero title', () => {
    render(<RoomHeroBanner {...BASE} status="active" />);
    expect(screen.getByText('5 habitaciones · King · 2 huéspedes')).toBeInTheDocument();
  });

  it('renders active chip when status is active', () => {
    render(<RoomHeroBanner {...BASE} status="active" />);
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('renders paused chip when status is not active', () => {
    render(<RoomHeroBanner {...BASE} status="paused" />);
    expect(screen.getByText('Pausada')).toBeInTheDocument();
  });

  it('back button navigates to the property habitaciones tab', () => {
    render(<RoomHeroBanner {...BASE} status="active" />);
    fireEvent.click(screen.getByRole('button', { name: /regresar/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/mi-hotel/$propertyId',
        params: { propertyId: 'prop-1' },
      }),
    );
  });

  it('clicking the property breadcrumb navigates back too', () => {
    render(<RoomHeroBanner {...BASE} status="active" />);
    fireEvent.click(screen.getByText('Hotel Test'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/mi-hotel/$propertyId',
        params: { propertyId: 'prop-1' },
      }),
    );
  });
});
