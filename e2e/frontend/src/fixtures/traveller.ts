import { test as base, type Page } from '@playwright/test';
import { loginE2EUser, type AuthUser } from '../helpers/api';

export interface TravellerFixtures {
  // A page where `e2e@travelhub.com` is already logged in: token + user are
  // injected into localStorage before any navigation runs, so the React
  // AuthProvider boots straight into the authenticated state.
  authenticatedPage: Page;
  // The same login result, exposed for tests that need the userId or token.
  authToken: string;
  authUser: AuthUser;
}

export const test = base.extend<TravellerFixtures>({
  authToken: async ({}, use) => {
    const { accessToken } = await loginE2EUser();
    await use(accessToken);
  },

  authUser: async ({}, use) => {
    const { user } = await loginE2EUser();
    await use(user);
  },

  authenticatedPage: async ({ page }, use) => {
    const { accessToken, user } = await loginE2EUser();
    await page.addInitScript(
      ({ token, u }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(u));
      },
      { token: accessToken, u: user },
    );
    await use(page);
  },
});

export const expect = test.expect;
