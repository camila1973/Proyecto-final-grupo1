import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { E2E_USER } from '../../helpers/seed';

// Scenario 2 · Iniciar sesión
test('Viajero · UI login with e2e@travelhub.com succeeds', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.fillAndSubmit(E2E_USER.email, E2E_USER.password);

  // The seeded e2e user has mfa_required=false. Login redirects to /trips if
  // the user has a held reservation, otherwise to home (`/#/`). We assert via
  // the navbar swap from "Iniciar sesión" to "Cerrar sesión".
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible({
    timeout: 15_000,
  });
});
