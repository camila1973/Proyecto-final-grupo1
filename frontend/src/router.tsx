import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router';
import { LocaleProvider } from './context/LocaleContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/search';
import PropertyDetailPage from './pages/PropertyDetailPage';
import RegisterPage from './pages/RegisterPage';
import RegisterSuccess from './pages/RegisterSuccess';

const rootRoute = createRootRoute({
  component: () => (
    <LocaleProvider>
      <div className="flex flex-col min-h-screen bg-[#f8f9ff]">
        <Navbar />
        <Outlet />
        <Footer />
      </div>
    </LocaleProvider>
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

const routeTree = rootRoute.addChildren([homeRoute, searchRoute, propertyRoute, registerRoute, registerSuccessRoute]);

export function createAppRouter() {
  return createRouter({
    routeTree,
    basepath: import.meta.env.BASE_URL ?? '/',
  });
}

type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
