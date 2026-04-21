import { render, screen, fireEvent } from '@testing-library/react';
import PropertyImageCarousel from './PropertyImageCarousel';
import { setupTestI18n } from '../i18n/test-utils';

setupTestI18n('es');

describe('PropertyImageCarousel', () => {
  it('renders a single image with no navigation controls when only one source', () => {
    render(
      <PropertyImageCarousel images={['https://cdn.example/a.jpg']} alt="Hotel A" />,
    );
    expect(screen.queryByLabelText('Imagen anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Imagen siguiente')).not.toBeInTheDocument();
  });

  it('renders navigation controls and indicators when multiple images', () => {
    render(
      <PropertyImageCarousel
        images={['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']}
        alt="Hotel A"
      />,
    );
    expect(screen.getByLabelText('Imagen anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Imagen siguiente')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir a la imagen 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir a la imagen 2')).toBeInTheDocument();
  });

  it('advances the active slide when Next is clicked', () => {
    render(
      <PropertyImageCarousel
        images={['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']}
        alt="Hotel A"
      />,
    );
    const next = screen.getByLabelText('Imagen siguiente');
    fireEvent.click(next);
    expect(screen.getByLabelText('Ir a la imagen 2')).toHaveAttribute('aria-selected', 'true');
  });

  it('wraps from last to first image', () => {
    render(
      <PropertyImageCarousel
        images={['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']}
        alt="Hotel A"
      />,
    );
    const next = screen.getByLabelText('Imagen siguiente');
    fireEvent.click(next); // 1 → 2
    fireEvent.click(next); // 2 → 1 (wrap)
    expect(screen.getByLabelText('Ir a la imagen 1')).toHaveAttribute('aria-selected', 'true');
  });

  it('uses lazy loading for non-adjacent slides', () => {
    render(
      <PropertyImageCarousel
        images={[
          'https://cdn.example/a.jpg',
          'https://cdn.example/b.jpg',
          'https://cdn.example/c.jpg',
          'https://cdn.example/d.jpg',
          'https://cdn.example/e.jpg',
        ]}
        alt="Hotel A"
      />,
    );
    const imgs = document.querySelectorAll('img');
    const loadingAttrs = Array.from(imgs).map((i) => i.getAttribute('loading'));
    expect(loadingAttrs).toContain('lazy');
    expect(loadingAttrs).toContain('eager');
  });

  it('falls back to the single fallback image when images is empty', () => {
    render(
      <PropertyImageCarousel
        images={[]}
        fallbackImage="https://cdn.example/thumb.jpg"
        alt="Hotel A"
      />,
    );
    const imgs = document.querySelectorAll('img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('src')).toBe('https://cdn.example/thumb.jpg');
  });

  it('renders empty-state placeholder when no images and no fallback', () => {
    render(<PropertyImageCarousel images={[]} alt="Hotel A" />);
    expect(screen.getByText(/sin imágenes/i)).toBeInTheDocument();
  });
});