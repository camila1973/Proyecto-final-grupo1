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
import MiHotelPage from './pages/partner';
import DisbursementsPage from './pages/partner/disbursements';
import PartnerPropertiesPage from './pages/partner/properties';
import PartnerTeamPage from './pages/partner/team';
import PropertyDashboardPage from './pages/partner/property';
import PropertyPaymentsPage from './pages/partner/property/payments';
import PropertyFinancesPage from './pages/partner/property/finances';
import PropertyReservationsPage from './pages/partner/property/reservations';
import PropertyRoomsPage from './pages/partner/property/rooms';
import PropertyEditPage from './pages/partner/property/edit';
import { TAB_IDS, type TabId } from './pages/partner/property/edit/shared';
import RoomDetailPage from './pages/partner/property/room-detail';
import ReservationEditPage from './pages/partner/property/reservation-edit';
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

const disbursementsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/desembolsos',
  component: DisbursementsPage,
});

const partnerPropertiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/propiedades',
  component: PartnerPropertiesPage,
});

const partnerTeamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/equipo',
  component: PartnerTeamPage,
});

const propertyDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId',
  component: PropertyDashboardPage,
});

const propertyPaymentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/pagos',
  component: PropertyPaymentsPage,
});

const propertyFinancesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/finanzas',
  component: PropertyFinancesPage,
});

const propertyReservationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/reservas',
  component: PropertyReservationsPage,
});

const propertyRoomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/habitaciones',
  component: PropertyRoomsPage,
});

const propertyEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/editar',
  validateSearch: (search: Record<string, unknown>) => ({
    tab: TAB_IDS.includes(search.tab as TabId) ? (search.tab as TabId) : 'info',
  }),
  component: PropertyEditPage,
});

const roomDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/habitaciones/$roomId',
  component: RoomDetailPage,
});

const reservationEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mi-hotel/$propertyId/reservas/$reservationId/editar',
  component: ReservationEditPage,
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
  disbursementsRoute,
  partnerPropertiesRoute,
  partnerTeamRoute,
  propertyDashboardRoute,
  propertyPaymentsRoute,
  propertyFinancesRoute,
  propertyReservationsRoute,
  propertyRoomsRoute,
  propertyEditRoute,
  roomDetailRoute,
  reservationEditRoute,
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
