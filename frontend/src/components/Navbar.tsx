import logo from '../assets/logo.png';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@mui/material/styles';
import LocaleSelector from './LocaleSelector';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const theme = useTheme();

  return (
    <header className="bg-white" style={{ borderBottom: `2px solid ${theme.palette.primary.main}` }}>
      <div className="max-w-[1152px] mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center hover:opacity-80">
            <img src={logo} alt="TravelHub" className="h-8 w-auto" />
          </Link>
          <div className="w-px h-6 bg-gray-200 ml-3" />
          <LocaleSelector />
        </div>

        <nav className="flex items-center gap-6 text-sm text-gray-700">
          {user ? (
            <>
              <Link to="/profile" className="hover:text-gray-900">{t('nav.profile')}</Link>
              {user.role === 'partner' ? (
                <Link to="/mi-hotel" className="hover:text-gray-900">{t('nav.myHotels')}</Link>
              ) : (
                <Link to="/trips" className="hover:text-gray-900">{t('nav.myBookings')}</Link>
              )}
              <button onClick={logout} className="bg-transparent border-0 p-0 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="hover:text-gray-900">{t('nav.register')}</Link>
              <Link to="/login" className="hover:text-gray-900">{t('nav.login')}</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
