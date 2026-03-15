import { render, screen } from '@testing-library/react';
import App from './App';

describe('App - Home page', () => {
  beforeEach(() => {
    render(<App />);
  });

  describe('Navbar', () => {
    it('renders the TravelHub brand name', () => {
      expect(screen.getByText('TravelHub')).toBeInTheDocument();
    });

    it('renders the language/currency selector', () => {
      expect(screen.getByText('Español · COP')).toBeInTheDocument();
    });

    it('renders the Registro link', () => {
      expect(screen.getByText('Registro')).toBeInTheDocument();
    });

    it('renders the Iniciar sesion link', () => {
      expect(screen.getByText('Iniciar sesion')).toBeInTheDocument();
    });
  });

  describe('Hero section', () => {
    it('renders the main headline', () => {
      expect(
        screen.getByText('Encuentra el hotel perfecto para tus vacaciones.')
      ).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      expect(
        screen.getByText('Explora entre más de 1200 opciones...')
      ).toBeInTheDocument();
    });

    it('renders the destination search label', () => {
      expect(screen.getByText('¿A dónde viajas?')).toBeInTheDocument();
    });

    it('renders the dates search label', () => {
      expect(screen.getByText('¿En qué fechas?')).toBeInTheDocument();
    });

    it('renders the guests search label', () => {
      expect(screen.getByText('¿Quienes viajan?')).toBeInTheDocument();
    });

    it('renders the Buscar button', () => {
      expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument();
    });

    it('renders destination and dates inputs with placeholder', () => {
      // Both destination and dates fields share the same placeholder text
      expect(
        screen.getAllByPlaceholderText('Selecciona un destino')
      ).toHaveLength(2);
    });

    it('renders guests input with placeholder', () => {
      expect(
        screen.getByPlaceholderText('2 adultos · 1 Habitación')
      ).toBeInTheDocument();
    });
  });

  describe('Recommendations section', () => {
    it('renders the section heading', () => {
      expect(screen.getByText('Recomendaciones para ti')).toBeInTheDocument();
    });

    it('renders 3 hotel cards', () => {
      expect(screen.getAllByText('HOTEL NORTH PARK')).toHaveLength(3);
    });

    it('renders hotel location for each card', () => {
      expect(screen.getAllByText('Bogotá, Colombia')).toHaveLength(3);
    });

    it('renders price for each card', () => {
      expect(screen.getAllByText('COP 180,000')).toHaveLength(3);
    });

    it('renders "por noche" label for each card', () => {
      expect(screen.getAllByText('por noche')).toHaveLength(3);
    });

    it('renders 3 Reservar buttons', () => {
      expect(screen.getAllByRole('button', { name: /reservar/i })).toHaveLength(3);
    });

    it('renders hotel images with alt text', () => {
      expect(screen.getAllByRole('img', { name: /hotel north park/i })).toHaveLength(3);
    });
  });

  describe('Footer', () => {
    it('renders the copyright notice', () => {
      expect(screen.getByText('© 2026 TravelHub')).toBeInTheDocument();
    });

    it('renders the privacy policy link', () => {
      expect(screen.getByText('Política de privacidad')).toBeInTheDocument();
    });

    it('renders the terms link', () => {
      expect(screen.getByText('Terminos y condiciones')).toBeInTheDocument();
    });

    it('renders the language info', () => {
      expect(screen.getByText('Idioma: Español')).toBeInTheDocument();
    });

    it('renders the currency info', () => {
      expect(screen.getByText('Moneda: COP')).toBeInTheDocument();
    });
  });
});
