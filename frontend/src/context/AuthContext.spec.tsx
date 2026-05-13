import { render, screen, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext } from './auth-context';
import { AuthProvider } from './AuthContext';

const mockSetOnUnauthorizedHandler = jest.fn();
jest.mock('../utils/authBridge', () => ({
  setOnUnauthorizedHandler: (...args: unknown[]) => mockSetOnUnauthorizedHandler(...args),
}));

function AuthConsumer() {
  const ctx = useContext(AuthContext)!;
  return (
    <div>
      <span data-testid="token">{ctx.token ?? 'null'}</span>
      <span data-testid="email">{ctx.user?.email ?? 'null'}</span>
      <button onClick={() => ctx.login('tok-123', { id: 'u1', email: 'a@b.com', role: 'user' })}>login</button>
      <button onClick={() => ctx.logout()}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { localStorage.clear(); jest.clearAllMocks(); });

  it('provides null token when localStorage is empty', () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('loads stored token and user from localStorage on mount', () => {
    localStorage.setItem('auth_token', 'stored-tok');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1', email: 'stored@b.com', role: 'user' }));
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    expect(screen.getByTestId('token').textContent).toBe('stored-tok');
    expect(screen.getByTestId('email').textContent).toBe('stored@b.com');
  });

  it('handles corrupt JSON in localStorage without throwing', () => {
    localStorage.setItem('auth_token', 'tok');
    localStorage.setItem('auth_user', '{bad json}');
    expect(() => render(<AuthProvider><AuthConsumer /></AuthProvider>)).not.toThrow();
    expect(screen.getByTestId('token').textContent).toBe('null');
  });

  it('login updates context and persists to localStorage', async () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    await act(async () => { screen.getByRole('button', { name: 'login' }).click(); });
    expect(screen.getByTestId('token').textContent).toBe('tok-123');
    expect(localStorage.getItem('auth_token')).toBe('tok-123');
  });

  it('logout clears context and removes from localStorage', async () => {
    localStorage.setItem('auth_token', 'existing');
    localStorage.setItem('auth_user', JSON.stringify({ id: 'u1', email: 'x@b.com', role: 'user' }));
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    await act(async () => { screen.getByRole('button', { name: 'logout' }).click(); });
    expect(screen.getByTestId('token').textContent).toBe('null');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('logout also clears any pending checkoutIntent from sessionStorage', async () => {
    sessionStorage.setItem(
      'checkoutIntent',
      JSON.stringify({ property: { id: 'p1', name: 'Demo' } }),
    );
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    await act(async () => { screen.getByRole('button', { name: 'logout' }).click(); });
    expect(sessionStorage.getItem('checkoutIntent')).toBeNull();
  });

  it('registers an unauthorized handler via authBridge on mount', () => {
    render(<AuthProvider><AuthConsumer /></AuthProvider>);
    expect(mockSetOnUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('clears the unauthorized handler on unmount', () => {
    const { unmount } = render(<AuthProvider><AuthConsumer /></AuthProvider>);
    unmount();
    expect(mockSetOnUnauthorizedHandler).toHaveBeenLastCalledWith(null);
  });
});
