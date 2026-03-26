import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface RegisterSuccessProps {
  onExplore: () => void;
}

export default function RegisterSuccess({ onExplore }: RegisterSuccessProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
      <Navbar onNavigateRegister={() => undefined} />

      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-xl p-12 flex flex-col items-center text-center">
          {/* Green check circle */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 18l7 7 13-13"
                stroke="#22863a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t('register.success_title')}
          </h1>

          <p className="text-gray-500 text-sm mb-8">
            {t('register.success_subtitle')}
          </p>

          <button
            type="button"
            onClick={onExplore}
            className="bg-[#2d3e6b] hover:bg-[#1f2d50] text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
          >
            {t('register.success_cta')}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
