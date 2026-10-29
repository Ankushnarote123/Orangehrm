import type { Response } from '@playwright/test';
import { BasePage } from '../BasePage';
import { Form } from '../components/Form';
import { DataTable } from '../components/DataTable';
import { getLocators, SystemUsersLocators } from '@locators/index';
import { BrowserHelper, type ApiMatcher } from '@utils/helpers/index';
import { API, LIST_LOAD_TIMEOUT, ROUTES } from '@utils/routes';

const USERS_REQUEST = { path: API.systemUsers, timeout: LIST_LOAD_TIMEOUT } satisfies ApiMatcher;

export type UserRole = 'Admin' | 'ESS';
export type UserStatus = 'Enabled' | 'Disabled';

export interface UserFilter {
  username?: string;
  role?: UserRole;
  status?: UserStatus;
}

/** Admin > User Management > Users. */
export class SystemUsersPage extends BasePage {
  static readonly locators = SystemUsersLocators;

  protected readonly path = ROUTES.systemUsers;
  readonly elements = getLocators(this.page, SystemUsersLocators);
  readonly filters = new Form(this.elements.filterPanel);
  readonly table = new DataTable(this.page);

  override async goto(): Promise<void> {
    await BrowserHelper.performAndWaitForResponse(this.page, () => super.goto(), USERS_REQUEST);
  }

  async filterBy({ username, role, status }: UserFilter): Promise<Response> {
    if (username !== undefined) await this.filters.fill('Username', username);
    if (role) await this.filters.select('User Role', role);
    if (status) await this.filters.select('Status', status);
    return this.search();
  }

  async search(): Promise<Response> {
    return BrowserHelper.performAndWaitForResponse(this.page, () => this.elements.searchButton.click(), USERS_REQUEST);
  }

  async reset(): Promise<Response> {
    return BrowserHelper.performAndWaitForResponse(this.page, () => this.elements.resetButton.click(), USERS_REQUEST);
  }
}
