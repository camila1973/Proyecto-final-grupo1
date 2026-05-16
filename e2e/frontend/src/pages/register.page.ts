import { type Page } from '@playwright/test';

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/#/register');
  }

  async fillAndSubmit(params: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<void> {
    await this.page.getByLabel('NOMBRE', { exact: true }).fill(params.firstName);
    await this.page.getByLabel('APELLIDO', { exact: true }).fill(params.lastName);
    await this.page.getByLabel('CORREO ELECTRÓNICO', { exact: true }).fill(params.email);
    await this.page.getByLabel('CONTRASEÑA', { exact: true }).fill(params.password);
    await this.page.getByLabel('CONFIRMAR CONTRASEÑA', { exact: true }).fill(params.password);
    await this.page.getByLabel('accept terms').check();
    await this.page.getByRole('button', { name: 'Crear usuario' }).click();
  }
}
