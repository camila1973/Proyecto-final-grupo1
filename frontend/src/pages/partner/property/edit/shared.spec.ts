import { fromProperty, toBody, type FormState } from './shared';
import type { InventoryProperty } from '../../../../utils/queries';

const NOW_ISO = '2026-05-09T00:00:00.000Z';

const PROPERTY: InventoryProperty = {
  id: 'b1000000',
  name: 'Gran Caribe Resort & Spa',
  type: 'hotel',
  city: 'Cancún',
  stars: 5,
  status: 'active',
  countryCode: 'MX',
  partnerId: 'a1000000',
  neighborhood: 'Zona Hotelera',
  lat: 21.16,
  lon: -86.85,
  rating: 4.7,
  reviewCount: 842,
  thumbnailUrl: 'https://example.com/thumb.jpg',
  amenities: ['wifi', 'pool'],
  phone: '+52 998 881 0000',
  email: 'reservas@grancaribe.com',
  address: 'Blvd. Kukulcan Km 11.5',
  currency: 'MXN',
  timezone: 'America/Cancun',
  description: 'Resort de lujo frente al mar.',
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
};

describe('edit/shared', () => {
  describe('fromProperty', () => {
    it('maps populated fields directly to the form state', () => {
      expect(fromProperty(PROPERTY)).toEqual({
        name: 'Gran Caribe Resort & Spa',
        type: 'hotel',
        phone: '+52 998 881 0000',
        email: 'reservas@grancaribe.com',
        address: 'Blvd. Kukulcan Km 11.5',
        countryCode: 'MX',
        city: 'Cancún',
        currency: 'MXN',
        timezone: 'America/Cancun',
        description: 'Resort de lujo frente al mar.',
      });
    });

    it('converts null optional fields to empty strings so TextFields stay controlled', () => {
      const sparse: InventoryProperty = {
        ...PROPERTY,
        phone: null,
        email: null,
        address: null,
        currency: null,
        timezone: null,
        description: null,
      };
      const form = fromProperty(sparse);
      expect(form.phone).toBe('');
      expect(form.email).toBe('');
      expect(form.address).toBe('');
      expect(form.currency).toBe('');
      expect(form.timezone).toBe('');
      expect(form.description).toBe('');
    });
  });

  describe('toBody', () => {
    const baseForm: FormState = {
      name: 'Hotel',
      type: 'hotel',
      phone: '+52 998 881 0000',
      email: 'a@b.com',
      address: 'Calle 1',
      countryCode: 'MX',
      city: 'Cancún',
      currency: 'MXN',
      timezone: 'America/Cancun',
      description: 'Texto.',
    };

    it('trims required fields', () => {
      const body = toBody({
        ...baseForm,
        name: '  Hotel Sol  ',
        type: ' hotel ',
        countryCode: ' MX ',
        city: ' Cancún ',
      });
      expect(body.name).toBe('Hotel Sol');
      expect(body.type).toBe('hotel');
      expect(body.countryCode).toBe('MX');
      expect(body.city).toBe('Cancún');
    });

    it('returns null for blank optional fields', () => {
      const body = toBody({
        ...baseForm,
        phone: '   ',
        email: '',
        address: '',
        currency: '   ',
        timezone: '',
        description: '   ',
      });
      expect(body.phone).toBeNull();
      expect(body.email).toBeNull();
      expect(body.address).toBeNull();
      expect(body.currency).toBeNull();
      expect(body.timezone).toBeNull();
      expect(body.description).toBeNull();
    });

    it('preserves non-blank optional fields trimmed', () => {
      const body = toBody({
        ...baseForm,
        phone: '  +52 998 881 0000  ',
        description: '  Hola  ',
      });
      expect(body.phone).toBe('+52 998 881 0000');
      expect(body.description).toBe('Hola');
    });
  });
});
