import { render, screen, fireEvent } from '@testing-library/react';
import {
  createMemoryHistory,
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { LocaleProvider } from '../context/LocaleContext';
import { setupTestI18n } from '../i18n/test-utils';
import RegisterPage from './RegisterPage';
import RegisterSuccess from './RegisterSuccess';
import es from '../i18n/locales/es.json';

setupTestI18n('es');

function makeRouter() {
  const rootRoute = createRootRoute({
    component: () => (
      <LocaleProvider>
        <Outlet />
      </LocaleProvider>
    ),
  });
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register',
    component: RegisterPage,
  });
  const successRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register-success',
    component: RegisterSuccess,
  });
  const routeTree = rootRoute.addChildren([registerRoute, successRoute]);
  const history = createMemoryHistory({ initialEntries: ['/register'] });
  return createRouter({ routeTree, history });
}

function renderRegisterPage() {
  const router = makeRouter();
  render(<RouterProvider router={router} />);
  return router;
}

async function fillValidForm() {
  fireEvent.change(await screen.findByRole('textbox', { name: es.register.name_label }), {
    target: { value: 'Juan Carlos' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: es.register.last_name_label }), {
    target: { value: 'García López' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: es.register.email_label }), {
    target: { value: 'juan@example.com' },
  });
  const passwordInputs = screen.getAllByLabelText(es.register.password_label);
  fireEvent.change(passwordInputs[0], { target: { value: 'Pass@1234' } });
  const confirmInputs = screen.getAllByLabelText(es.register.confirm_password_label);
  fireEvent.change(confirmInputs[0], { target: { value: 'Pass@1234' } });
  fireEvent.click(screen.getByLabelText('accept terms'));
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('RegisterPage', () => {
  describe('rendering', () => {
    it('renders the page title', async () => {
      renderRegisterPage();
      expect(await screen.findByText(es.register.title)).toBeInTheDocument();
    });

    it('renders nombre and apellido fields', async () => {
      renderRegisterPage();
      expect(await screen.findByRole('textbox', { name: es.register.name_label })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: es.register.last_name_label })).toBeInTheDocument();
    });

    it('renders email field', async () => {
      renderRegisterPage();
      expect(await screen.findByRole('textbox', { name: es.register.email_label })).toBeInTheDocument();
    });

    it('renders password fields', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      expect(screen.getAllByLabelText(es.register.password_label).length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText(es.register.confirm_password_label).length).toBeGreaterThan(0);
    });

    it('renders terms checkbox', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      expect(screen.getByLabelText('accept terms')).toBeInTheDocument();
    });

    it('renders submit button', async () => {
      renderRegisterPage();
      expect(await screen.findByRole('button', { name: es.register.submit })).toBeInTheDocument();
    });

    it('renders link to sign in', async () => {
      renderRegisterPage();
      expect(await screen.findByText(es.register.login_link)).toBeInTheDocument();
    });
  });

  describe('validation — required fields', () => {
    it('shows nombre error when submitting empty form', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.name_required)).toBeInTheDocument();
    });

    it('shows apellido error when submitting empty form', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.last_name_required)).toBeInTheDocument();
    });

    it('shows email required error when email is empty', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.email_required)).toBeInTheDocument();
    });

    it('shows password required error when password is empty', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.password_required)).toBeInTheDocument();
    });

    it('shows terms error when terms are not accepted', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.terms_required)).toBeInTheDocument();
    });
  });

  describe('validation — email format', () => {
    it('shows invalid email error for bad format', async () => {
      renderRegisterPage();
      fireEvent.change(await screen.findByRole('textbox', { name: es.register.email_label }), {
        target: { value: 'not-an-email' },
      });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.email_invalid)).toBeInTheDocument();
    });
  });

  describe('validation — password rules', () => {
    it('shows min length error for short password', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: 'Ab@1' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.password_min)).toBeInTheDocument();
    });

    it('shows max length error for long password', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: 'Ab@1234567890abcd' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.password_max)).toBeInTheDocument();
    });

    it('shows complexity error for password with no special char', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: 'Password1' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.password_complexity)).toBeInTheDocument();
    });

    it('shows complexity error for password with no digit', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: 'Password@' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.password_complexity)).toBeInTheDocument();
    });

    it('shows complexity error for password with no letter', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: '12345@78' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.password_complexity)).toBeInTheDocument();
    });
  });

  describe('validation — confirm password', () => {
    it('shows mismatch error when passwords do not match', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: 'Pass@1234' } });
      const confirmInputs = screen.getAllByLabelText(es.register.confirm_password_label);
      fireEvent.change(confirmInputs[0], { target: { value: 'Different@1' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.confirm_mismatch)).toBeInTheDocument();
    });

    it('shows confirm required error when confirm is empty', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      fireEvent.change(passwordInputs[0], { target: { value: 'Pass@1234' } });
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.confirm_required)).toBeInTheDocument();
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password field visibility', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const passwordInputs = screen.getAllByLabelText(es.register.password_label);
      const input = passwordInputs[0] as HTMLInputElement;
      expect(input.type).toBe('password');
      fireEvent.click(screen.getByLabelText('toggle password visibility'));
      expect(input.type).toBe('text');
      fireEvent.click(screen.getByLabelText('toggle password visibility'));
      expect(input.type).toBe('password');
    });

    it('toggles confirm password field visibility', async () => {
      renderRegisterPage();
      await screen.findByText(es.register.title);
      const confirmInputs = screen.getAllByLabelText(es.register.confirm_password_label);
      const input = confirmInputs[0] as HTMLInputElement;
      expect(input.type).toBe('password');
      fireEvent.click(screen.getByLabelText('toggle confirm password visibility'));
      expect(input.type).toBe('text');
    });
  });

  describe('error clearing', () => {
    it('clears nombre error when user starts typing', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.name_required)).toBeInTheDocument();
      fireEvent.change(screen.getByRole('textbox', { name: es.register.name_label }), {
        target: { value: 'Juan' },
      });
      expect(screen.queryByText(es.register.errors.name_required)).not.toBeInTheDocument();
    });
  });

  describe('API interaction', () => {
    it('navigates to /register-success on successful registration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'usr_1', email: 'juan@example.com' }),
      });
      renderRegisterPage();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.success_title)).toBeInTheDocument();
    });

    it('shows email taken error on 409 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({}),
      });
      renderRegisterPage();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.email_taken)).toBeInTheDocument();
    });

    it('shows generic error on non-409 API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      });
      renderRegisterPage();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.generic)).toBeInTheDocument();
    });

    it('shows generic error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      renderRegisterPage();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.generic)).toBeInTheDocument();
    });

    it('does not call API when form is invalid', async () => {
      renderRegisterPage();
      fireEvent.click(await screen.findByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.errors.name_required)).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('RegisterSuccess', () => {
    it('renders success title, message and CTA button after successful registration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'usr_1' }),
      });
      renderRegisterPage();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: es.register.submit }));
      expect(await screen.findByText(es.register.success_title)).toBeInTheDocument();
      expect(screen.getByText(es.register.success_message)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: es.register.success_cta })).toBeInTheDocument();
    });
  });
});
