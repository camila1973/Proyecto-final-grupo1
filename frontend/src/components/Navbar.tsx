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
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
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
              <span className="text-gray-600">{user.email}</span>
              <button onClick={logout} className="hover:text-gray-900">
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
