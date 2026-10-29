import { BasePage } from './BasePage';
import { DashboardLocators, getLocators } from '@locators/index';
import { ROUTES } from '@utils/routes';

export class DashboardPage extends BasePage {
  static readonly locators = DashboardLocators;

  protected readonly path = ROUTES.dashboard;
  readonly elements = getLocators(this.page, DashboardLocators);
}
