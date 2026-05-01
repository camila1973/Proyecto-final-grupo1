import { createRouter, createRoute, createRootRoute, Outlet, createHashHistory } from '@tanstack/react-router';
import { LocaleProvider } from './context/LocaleContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/search';
import PropertyDetailPage from './pages/property';
import RegisterPage from './pages/RegisterPage';
import RegisterSuccess from './pages/RegisterSuccess';
import LoginPage from './pages/LoginPage';
import MfaPage from './pages/MfaPage';
import CheckoutPage from './pages/booking/checkout';
import BookingConfirmationPage from './pages/booking/confirmation';
import ProfilePage from './pages/ProfilePage';
import TripsPage from './pages/trips';
import MiHotelPage from './pages/partner/dashboard';
import PagosPage from './pages/partner/payments';
import PartnerRegisterPage from './pages/partner/register';


const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <LocaleProvider>
        <div className="flex flex-col min-h-screen bg-[#f8f9ff]">
          <Navbar />
          <div className="flex flex-col flex-1">
            <Outlet />
          </div>
          <Footer />
        </div>
      </LocaleProvider>
    </AuthProvider>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (search: Record<string, unknown>) => ({
    city: (search.city as string) ?? '',
    countryCode: (search.countryCode as string) ?? '',
    checkIn: (search.checkIn as string) ?? '',
    checkOut: (search.checkOut as string) ?? '',
    guests: Number(search.guests ?? 2),
    priceMin: (search.priceMin as string) || undefined,
    priceMax: (search.priceMax as string) || undefined,
    amenities: (search.amenities as string) || undefined,
    roomTypes: (search.roomTypes as string) || undefined,
    bedTypes: (search.bedTypes as string) || undefined,
    viewTypes: (search.viewTypes as string) || undefined,
    stars: (search.stars as string) || undefined,
  }),
  component: SearchPage,
});

const propertyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/properties/$propertyId',
  validateSearch: (search: Record<string, unknown>) => ({
    checkIn: (search.checkIn as string) ?? '',
    checkOut: (search.checkOut as string) ?? '',
    guests: Number(search.guests ?? 1),
  }),
  component: PropertyDetailPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const registerSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register-success',
  component: RegisterSuccess,
});

const partnerRegisterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register/partner',
  component: PartnerRegisterPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const mfaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login/mfa',
  validateSearch: (search: Record<string, unknown>) => ({
    challengeId: search.challengeId as string | undefined,
  }),
  component: MfaPage,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/booking/checkout',
  component: CheckoutPage,
});

const bookingConfirmationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/booking/confirmation',
  validateSearch: (search: Record<string, unknown>) => ({
    reservationId: (search.reservationId as string) ?? '',
  }),
  component: BookingConfirmationPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const myBookingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trips',
  component: TripsPage,
});

const miHotelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel',
  component: MiHotelPage,
});

const pagosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/pagos',
  component: PagosPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  searchRoute,
  propertyRoute,
  registerRoute,
  registerSuccessRoute,
  partnerRegisterRoute,
  loginRoute,
  mfaRoute,
  checkoutRoute,
  bookingConfirmationRoute,
  profileRoute,
  myBookingsRoute,
  miHotelRoute,
  pagosRoute,
]);

export function createAppRouter() {
  return createRouter({
    routeTree,
    history: createHashHistory(),
  });
}

type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
