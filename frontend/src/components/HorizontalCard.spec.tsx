import { render, screen, fireEvent } from '@testing-library/react';
import HorizontalCard from './HorizontalCard';

const DEFAULT_FALLBACK = 'https://placehold.co/224x170?text=Hotel';

function renderCard(overrides: Partial<React.ComponentProps<typeof HorizontalCard>> = {}) {
  return render(
    <HorizontalCard
      imageUrl="https://example.com/hotel.jpg"
      imageAlt="Hotel exterior"
      middleContent={<span>Middle content</span>}
      rightPanel={<span>Right panel</span>}
      {...overrides}
    />,
  );
}

describe('HorizontalCard', () => {
  describe('image', () => {
    it('renders the image with the given src', () => {
      renderCard();
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/hotel.jpg');
    });

    it('renders the image with the given alt text', () => {
      renderCard();
      expect(screen.getByRole('img', { name: 'Hotel exterior' })).toBeInTheDocument();
    });

    it('falls back to the default fallback URL on image error', () => {
      renderCard();
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', DEFAULT_FALLBACK);
    });

    it('uses a custom fallback URL when provided', () => {
      renderCard({ imageFallbackUrl: 'https://example.com/fallback.jpg' });
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://example.com/fallback.jpg');
    });
  });

  describe('slots', () => {
    it('renders middleContent', () => {
      renderCard({ middleContent: <p>Hotel name</p> });
      expect(screen.getByText('Hotel name')).toBeInTheDocument();
    });

    it('renders rightPanel', () => {
      renderCard({ rightPanel: <button>Book now</button> });
      expect(screen.getByRole('button', { name: 'Book now' })).toBeInTheDocument();
    });

    it('renders both slots independently', () => {
      renderCard({
        middleContent: <span data-testid="middle">middle</span>,
        rightPanel: <span data-testid="right">right</span>,
      });
      expect(screen.getByTestId('middle')).toBeInTheDocument();
      expect(screen.getByTestId('right')).toBeInTheDocument();
    });
  });
});
