import { render, screen } from '@testing-library/react';
import { setupTestI18n } from '../i18n/test-utils';
import ProfilePage from './ProfilePage';

setupTestI18n('es');

jest.mock('../components/PageContainer', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="container">{children}</div>,
}));

describe('ProfilePage', () => {
  it('renders inside PageContainer', () => {
    render(<ProfilePage />);
    expect(screen.getByTestId('container')).toBeInTheDocument();
  });

  it('renders a level-1 heading', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
