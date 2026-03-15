import './App.css';

const HOTEL_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=220&fit=crop';

const recommendations = [
  { id: 1, name: 'HOTEL NORTH PARK', location: 'Bogotá, Colombia', price: '180,000', img: HOTEL_IMAGE },
  { id: 2, name: 'HOTEL NORTH PARK', location: 'Bogotá, Colombia', price: '180,000', img: HOTEL_IMAGE },
  { id: 3, name: 'HOTEL NORTH PARK', location: 'Bogotá, Colombia', price: '180,000', img: HOTEL_IMAGE },
];

export default function App() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f5]">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="14" fill="#4a6fa5" />
                <path d="M8 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <circle cx="14" cy="17" r="2.5" fill="white" />
              </svg>
              <span className="font-bold text-lg text-gray-900">TravelHub</span>
            </div>
            <button className="ml-2 flex items-center gap-1 border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mr-0.5">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Español · COP
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-6 text-sm text-gray-700">
            <a href="#" className="hover:text-gray-900">Registro</a>
            <a href="#" className="hover:text-gray-900">Iniciar sesion</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#4a6fa5] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-white text-3xl font-bold mb-1">
            Encuentra el hotel perfecto para tus vacaciones.
          </h1>
          <p className="text-blue-200 text-base mb-8">
            Explora entre más de 1200 opciones...
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-xl p-4 flex flex-col md:flex-row gap-3">
            {/* Destination */}
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                ¿A dónde viajas?
              </label>
              <input
                type="text"
                placeholder="Selecciona un destino"
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-1" />

            {/* Dates */}
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                ¿En qué fechas?
              </label>
              <input
                type="text"
                placeholder="Selecciona un destino"
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            <div className="hidden md:block w-px bg-gray-200 my-1" />

            {/* Guests */}
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                ¿Quienes viajan?
              </label>
              <input
                type="text"
                placeholder="2 adultos · 1 Habitación"
                className="text-sm text-gray-700 placeholder-gray-400 outline-none border-b border-transparent focus:border-blue-400 pb-1"
              />
            </div>

            {/* Search button */}
            <button className="flex items-center justify-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Recomendaciones para ti</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {recommendations.map((hotel) => (
            <div key={hotel.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <img
                src={hotel.img}
                alt={hotel.name}
                className="w-full h-44 object-cover"
              />
              <div className="p-4">
                <p className="font-bold text-sm text-gray-900">{hotel.name}</p>
                <p className="text-sm text-gray-500 mb-3">{hotel.location}</p>
                <p className="text-lg font-bold text-gray-900">COP {hotel.price}</p>
                <p className="text-xs text-gray-400 mb-4">por noche</p>
                <button className="w-full flex items-center justify-center gap-2 bg-[#e8c84a] hover:bg-[#d4b53a] text-gray-900 font-semibold text-sm py-2.5 rounded-lg transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 3V2M10 3V2M1 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Reservar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© 2026 TravelHub</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-700">Política de privacidad</a>
            <a href="#" className="hover:text-gray-700">Terminos y condiciones</a>
          </div>
          <div className="flex gap-4">
            <span>Idioma: Español</span>
            <span>Moneda: COP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
