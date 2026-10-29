import type { Page } from '@playwright/test';
import { CommonLocators, getLocators, SideMenuLocators, type MenuItem } from '@locators/index';
import { BrowserHelper } from '@utils/helpers/index';

export type { MenuItem, ToastType, UserMenuItem } from '@locators/index';

/**
 * Parent of every page class. Gives each page the shared layout (top bar,
 * side menu, toasts, delete dialog) and the common actions on it.
 *
 * Every page follows the same pattern:
 *   static readonly locators = XyzLocators;              // from src/locators/xyz.locators.ts
 *   readonly elements = getLocators(this.page, XyzLocators); // real Locators for this test's page
 */
export abstract class BasePage {
  /** Named `layoutLocators` (not `locators`) because statics are inherited and each page has its own `locators`. */
  static readonly layoutLocators = CommonLocators;
  static readonly sideMenuLocators = SideMenuLocators;

  readonly layout;
  readonly sideMenu;

  /** Route opened by `goto()`, relative to `baseURL`. */
  protected abstract readonly path: string;

  constructor(readonly page: Page) {
    this.layout = getLocators(page, CommonLocators);
    this.sideMenu = getLocators(this.layout.sidePanel, SideMenuLocators);
  }

  /** Opens the page; waits for `load` and retries once if the network drops the request. */
  async goto(): Promise<void> {
    await BrowserHelper.gotoWithRetry(this.page, this.path);
  }

  /** Side-menu links load a new page (OrangeHRM modules are separate documents); waits for its `load` event. */
  async navigateTo(item: MenuItem): Promise<void> {
    await BrowserHelper.performAndWaitForPageLoad(this.page, () => this.sideMenu.link(item).click());
  }

  async searchMenu(text: string): Promise<void> {
    await this.sideMenu.searchInput.fill(text);
  }

  async openUserMenu(): Promise<void> {
    await this.layout.userDropdown.click();
  }

  /** Logout loads the login page through a server redirect; waits for that page's `load` event. */
  async logout(): Promise<void> {
    await this.openUserMenu();
    await BrowserHelper.performAndWaitForPageLoad(this.page, () => this.layout.userMenuItem('Logout').click());
  }

  async confirmDelete(): Promise<void> {
    await this.layout.confirmDeleteButton.click();
  }
}
