import { createRouter, createRoute, createRootRoute, Outlet, createHashHistory } from '@tanstack/react-router';
import { LocaleProvider } from './context/LocaleContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/search';
import PropertyDetailPage from './pages/PropertyDetailPage';
import RegisterPage from './pages/RegisterPage';
import RegisterSuccess from './pages/RegisterSuccess';
import LoginPage from './pages/LoginPage';
import MfaPage from './pages/MfaPage';

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <LocaleProvider>
        <div className="flex flex-col min-h-screen bg-[#f8f9ff]">
          <Navbar />
          <Outlet />
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

const routeTree = rootRoute.addChildren([homeRoute, searchRoute, propertyRoute, registerRoute, registerSuccessRoute, loginRoute, mfaRoute]);

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
