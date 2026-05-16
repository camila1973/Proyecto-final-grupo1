import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import InfoTab from './InfoTab';
import type { InventoryProperty } from '../../../../utils/queries';

setupTestI18n('es');

const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const PROPERTY: InventoryProperty = {
  id: 'prop-abc-1234',
  name: 'Hotel Test',
  type: 'hotel',
  city: 'Bogotá',
  stars: 4,
  status: 'active',
  countryCode: 'CO',
  partnerId: 'partner-1',
  neighborhood: 'Chapinero',
  lat: null,
  lon: null,
  rating: 4.5,
  reviewCount: 25,
  thumbnailUrl: 'https://example.com/img.jpg',
  amenities: [],
  phone: '+57 1 555 0000',
  email: 'test@hotel.com',
  address: 'Calle 1',
  currency: 'COP',
  timezone: 'America/Bogota',
  description: 'A nice hotel',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

const FORM = {
  name: 'Hotel Test',
  type: 'hotel',
  phone: '+57 1 555 0000',
  email: 'test@hotel.com',
  address: 'Calle 1',
  countryCode: 'CO',
  city: 'Bogotá',
  currency: 'COP',
  timezone: 'America/Bogota',
  description: 'A nice hotel',
};

describe('InfoTab', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders all form fields with their current values', () => {
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={PROPERTY}
        onPause={jest.fn()}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    expect(screen.getByDisplayValue('Hotel Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@hotel.com')).toBeInTheDocument();
  });

  it('fires setForm when the name input changes', () => {
    const setForm = jest.fn();
    render(
      <InfoTab
        form={FORM}
        setForm={setForm}
        property={PROPERTY}
        onPause={jest.fn()}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('Hotel Test'), {
      target: { value: 'New Name' },
    });
    expect(setForm).toHaveBeenCalledWith({ ...FORM, name: 'New Name' });
  });

  it('fires onSave when the save button is clicked', () => {
    const onSave = jest.fn();
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={PROPERTY}
        onPause={jest.fn()}
        pausing={false}
        onSave={onSave}
        saving={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('renders Pause action when status is active', () => {
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={PROPERTY}
        onPause={jest.fn()}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Pausar listado/i })).toBeInTheDocument();
  });

  it('renders Resume action when status is paused', () => {
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={{ ...PROPERTY, status: 'paused' }}
        onPause={jest.fn()}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Reactivar listado/i })).toBeInTheDocument();
  });

  it('fires onPause when the pause button is clicked', () => {
    const onPause = jest.fn();
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={PROPERTY}
        onPause={onPause}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Pausar listado/i }));
    expect(onPause).toHaveBeenCalled();
  });

  it('clicking "Descargar QR" navigates to the QR tab', () => {
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={PROPERTY}
        onPause={jest.fn()}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Descargar QR/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: { tab: 'qr' } }),
    );
  });

  it('clicking "Copiar enlace público" writes to the clipboard', () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <InfoTab
        form={FORM}
        setForm={jest.fn()}
        property={PROPERTY}
        onPause={jest.fn()}
        pausing={false}
        onSave={jest.fn()}
        saving={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Copiar enlace público/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/#/properties/prop-abc-1234'));
  });
});
