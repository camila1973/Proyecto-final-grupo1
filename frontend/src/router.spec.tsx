import { render, waitFor } from '@testing-library/react';
import { RouterProvider } from '@tanstack/react-router';
import { createAppRouter } from './router';

if (!(globalThis as { Response?: unknown }).Response) {
  (globalThis as { Response: typeof Response | unknown }).Response = class {};
}

jest.mock('./components/Navbar', () => () => <div>navbar</div>);
jest.mock('./components/Footer', () => () => <div>footer</div>);

jest.mock('./pages/HomePage', () => () => <div>home</div>);
jest.mock('./pages/search', () => () => <div>search</div>);
jest.mock('./pages/PropertyDetailPage', () => () => <div>property</div>);
jest.mock('./pages/RegisterPage', () => () => <div>register</div>);
jest.mock('./pages/RegisterSuccess', () => () => <div>register-success</div>);
jest.mock('./pages/LoginPage', () => () => <div>login</div>);
jest.mock('./pages/MfaPage', () => () => <div>mfa</div>);
jest.mock('./pages/checkout/index', () => () => <div>checkout</div>);
jest.mock('./pages/booking/confirmation', () => () => <div>booking-confirmation</div>);

describe('router', () => {
  it('creates a router and can navigate to root', async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);

    await waitFor(async () => {
      await router.navigate({ to: '/' });
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('applies default search values for /search', async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);

    await router.navigate({ to: '/search', search: {} as never });

    expect(router.state.location.search).toEqual({
      city: '',
      countryCode: '',
      checkIn: '',
      checkOut: '',
      guests: 2,
    });
  });

  it('applies default search values for property details', async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);

    await router.navigate({
      to: '/properties/$propertyId',
      params: { propertyId: 'prop_1' },
      search: {} as never,
    });

    expect(router.state.location.search).toEqual({
      checkIn: '',
      checkOut: '',
      guests: 1,
    });
  });

  it('applies default search values for checkout and confirmation routes', async () => {
    const router = createAppRouter();
    render(<RouterProvider router={router} />);

    await router.navigate({ to: '/checkout', search: {} as never });
    expect(router.state.location.search).toEqual({
      roomId: '',
      propertyId: '',
      partnerId: '',
      checkIn: '',
      checkOut: '',
      guests: '1',
      propertyName: '',
      roomType: '',
      totalUsd: '0',
    });

    await router.navigate({ to: '/booking/confirmation', search: {} as never });
    expect(router.state.location.search).toEqual({
      reservationId: '',
      propertyName: '',
      roomType: '',
      checkIn: '',
      checkOut: '',
      totalUsd: '0',
    });
  });
});
