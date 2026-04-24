import { render, screen, fireEvent } from '@testing-library/react';
import VerticalCard from './VerticalCard';

const DEFAULT_FALLBACK = 'https://placehold.co/400x176?text=Hotel';

function renderCard(overrides: Partial<React.ComponentProps<typeof VerticalCard>> = {}) {
  return render(
    <VerticalCard
      content={<span>Content area</span>}
      {...overrides}
    />,
  );
}

describe('VerticalCard', () => {
  describe('image', () => {
    it('renders the image when imageUrl is provided', () => {
      renderCard({ imageUrl: 'https://example.com/hotel.jpg', imageAlt: 'Hotel exterior' });
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/hotel.jpg');
    });

    it('renders the image with the given alt text', () => {
      renderCard({ imageUrl: 'https://example.com/hotel.jpg', imageAlt: 'Hotel exterior' });
      expect(screen.getByRole('img', { name: 'Hotel exterior' })).toBeInTheDocument();
    });

    it('does not render an image when imageUrl is not provided', () => {
      renderCard();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('falls back to the default fallback URL on image error', () => {
      renderCard({ imageUrl: 'https://example.com/hotel.jpg', imageAlt: 'Hotel' });
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', DEFAULT_FALLBACK);
    });

    it('uses a custom fallback URL when provided', () => {
      renderCard({
        imageUrl: 'https://example.com/hotel.jpg',
        imageAlt: 'Hotel',
        imageFallbackUrl: 'https://example.com/fallback.jpg',
      });
      const img = screen.getByRole('img');
      fireEvent.error(img);
      expect(img).toHaveAttribute('src', 'https://example.com/fallback.jpg');
    });
  });

  describe('content', () => {
    it('renders the content slot', () => {
      renderCard({ content: <p>Hotel description</p> });
      expect(screen.getByText('Hotel description')).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders the footer when provided', () => {
      renderCard({ footer: <button>Book now</button> });
      expect(screen.getByRole('button', { name: 'Book now' })).toBeInTheDocument();
    });

    it('does not render the footer slot when not provided', () => {
      renderCard();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('onClick', () => {
    it('calls onClick when the card is clicked', () => {
      const onClick = jest.fn();
      renderCard({ onClick });
      fireEvent.click(screen.getByText('Content area'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
