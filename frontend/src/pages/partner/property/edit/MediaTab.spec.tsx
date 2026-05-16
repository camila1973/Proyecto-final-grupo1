import { render, screen } from '@testing-library/react';
import { setupTestI18n } from '../../../../i18n/test-utils';
import MediaTab from './MediaTab';

setupTestI18n('es');

describe('MediaTab', () => {
  it('shows the "Cover" chip when a thumbnail is set', () => {
    render(<MediaTab thumbnailUrl="https://example.com/img.jpg" />);
    expect(screen.getByText(/Portada|Cover/i)).toBeInTheDocument();
  });

  it('shows the "no cover" chip when no thumbnail is set', () => {
    render(<MediaTab thumbnailUrl="" />);
    expect(screen.getByText(/Sin portada|No cover/i)).toBeInTheDocument();
  });

  it('renders the upload button (disabled, coming soon)', () => {
    render(<MediaTab thumbnailUrl="" />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });
});
