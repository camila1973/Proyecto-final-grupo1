import { type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/#/login');
  }

  async fillAndSubmit(email: string, password: string): Promise<void> {
    await this.page.getByLabel('CORREO ELECTRÓNICO', { exact: true }).fill(email);
    await this.page.getByLabel('CONTRASEÑA', { exact: true }).fill(password);
    await this.page.getByRole('button', { name: 'Iniciar sesión' }).click();
  }

  // Used by the "register from booking gate" flow — the login page shows a
  // "Regístrate aquí" link in the subtitle when the user has no account yet.
  async goToRegister(): Promise<void> {
    await this.page.getByRole('button', { name: 'Regístrate aquí' }).click();
  }
}
