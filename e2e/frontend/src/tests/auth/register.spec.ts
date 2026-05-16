import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/register.page';
import { uniqueEmail } from '../../helpers/unique';

// Scenario 1 · Crear cuenta
test('Viajero · register form completes successfully', async ({ page }) => {
  const register = new RegisterPage(page);
  await register.goto();
  await register.fillAndSubmit({
    firstName: 'Test',
    lastName: 'Traveller',
    email: uniqueEmail(),
    password: 'TestUser1234!',
  });

  // RegisterPage auto-fires a login after a successful register. New users
  // have mfa_required=true by default, so we land on the MFA challenge page.
  // If for any reason MFA is off, the page navigates to /register-success.
  await page.waitForURL(/#\/(login\/mfa|register-success)/, { timeout: 15_000 });
  expect(page.url()).toMatch(/#\/(login\/mfa|register-success)/);
});
