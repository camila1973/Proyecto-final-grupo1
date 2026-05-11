import { formatAddress } from './address';

describe('formatAddress', () => {
  it('joins neighborhood, city and countryCode with ", "', () => {
    expect(formatAddress('Chapinero', 'Bogotá', 'CO')).toBe('Chapinero, Bogotá, CO');
  });

  it('omits a null neighborhood', () => {
    expect(formatAddress(null, 'Bogotá', 'CO')).toBe('Bogotá, CO');
  });

  it('omits an undefined neighborhood', () => {
    expect(formatAddress(undefined, 'Cancún', 'MX')).toBe('Cancún, MX');
  });

  it('always includes city and countryCode', () => {
    expect(formatAddress(null, 'Lima', 'PE')).toBe('Lima, PE');
  });

  it('includes neighborhood when it is a non-empty string', () => {
    const result = formatAddress('Miraflores', 'Lima', 'PE');
    expect(result.startsWith('Miraflores')).toBe(true);
  });
});
