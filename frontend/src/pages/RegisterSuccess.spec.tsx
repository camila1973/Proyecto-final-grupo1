import { render, screen, fireEvent } from '@testing-library/react';
import { setupTestI18n } from '../i18n/test-utils';
import RegisterSuccess from './RegisterSuccess';
import es from '../i18n/locales/es.json';

setupTestI18n('es');

const mockNavigate = jest.fn();

jest.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('RegisterSuccess', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders success content and navigates home on CTA click', () => {
    render(<RegisterSuccess />);

    expect(screen.getByText(es.register.success_title)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: es.register.success_cta });
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
  });
});
