import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { Form } from './components/Form';
import { getLocators, LoginLocators } from '@locators/index';
import { ROUTES } from '@utils/routes';

export class LoginPage extends BasePage {
  static readonly locators = LoginLocators;

  protected readonly path = ROUTES.login;
  readonly elements = getLocators(this.page, LoginLocators);
  private readonly form = new Form(this.elements.form);

  async login(username: string, password: string): Promise<void> {
    await this.elements.usernameInput.fill(username);
    await this.elements.passwordInput.fill(password);
    await this.elements.loginButton.click();
  }

  /** Inline "Required" message under the Username or Password field. */
  fieldError(field: 'Username' | 'Password'): Locator {
    return this.form.fields.error(field);
  }
}
