import type { Locator } from '@playwright/test';
import { test, expect } from '@fixtures/test';
import {
  AddEmployeeLocators,
  CommonLocators,
  DashboardLocators,
  EmployeeDetailsLocators,
  LoginLocators,
  PIMLocators,
  SideMenuLocators,
  SystemUsersLocators,
  TableLocators,
  type LocatorDefinition,
  type LocatorMap,
  type ResolvedLocators,
} from '@locators/index';

/** Keys of a static map whose entry is a fixed definition (not a template). */
type FixedKeys<M extends LocatorMap> = { [K in keyof M]: M[K] extends LocatorDefinition ? K : never }[keyof M];

/**
 * Checks static locator-map entries against the live UI. Each listed entry
 * must match exactly one element (present and strict-mode safe); `many`
 * entries must match at least one. If OrangeHRM changes its markup, this
 * spec points at the broken selector by name.
 */
async function expectSelectors<M extends LocatorMap>(
  elements: ResolvedLocators<M>,
  unique: FixedKeys<M>[],
  many: FixedKeys<M>[] = [],
): Promise<void> {
  for (const key of unique) {
    await expect(elements[key] as Locator, `selector "${String(key)}"`).toHaveCount(1);
  }
  for (const key of many) {
    await expect((elements[key] as Locator).first(), `selector "${String(key)}"`).toBeVisible();
  }
}

test.describe('Selector health check', () => {
  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('LoginPage selectors match the live UI', { tag: '@regression' }, async ({ loginPage }) => {
      await loginPage.goto();
      await expectSelectors<typeof LoginLocators>(loginPage.elements, [
        'title',
        'usernameInput',
        'passwordInput',
        'loginButton',
        'forgotPasswordLink',
        'form',
      ]);
    });
  });

  test('BasePage and DashboardPage selectors match the live UI', { tag: '@regression' }, async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await expectSelectors<typeof CommonLocators>(dashboardPage.layout, [
      'sidePanel',
      'moduleTitle',
      'userDropdown',
      'userName',
    ]);
    await expectSelectors<typeof SideMenuLocators>(dashboardPage.sideMenu, ['searchInput'], ['items']);
    await expectSelectors<typeof DashboardLocators>(dashboardPage.elements, [], ['widgetTitles']);
  });

  test('PIMPage selectors match the live UI', { tag: '@regression' }, async ({ pimPage }) => {
    await pimPage.goto();
    await expectSelectors<typeof PIMLocators>(pimPage.elements, [
      'heading',
      'filterPanel',
      'searchButton',
      'resetButton',
      'addButton',
    ]);
    await expectSelectors<typeof TableLocators>(pimPage.table.elements, ['recordsFound'], ['headerCells', 'rows']);
  });

  test('AddEmployeePage selectors match the live UI', { tag: '@regression' }, async ({ addEmployeePage }) => {
    await addEmployeePage.goto();
    await expectSelectors<typeof AddEmployeeLocators>(addEmployeePage.elements, [
      'heading',
      'form',
      'firstNameInput',
      'middleNameInput',
      'lastNameInput',
      'employeeIdInput',
      'saveButton',
      'cancelButton',
    ]);
  });

  test('EmployeeDetailsPage selectors match the live UI', { tag: '@regression' }, async ({
    employeeDetailsPage,
    testEmployee,
  }) => {
    await employeeDetailsPage.gotoEmployee(testEmployee.empNumber);
    await employeeDetailsPage.waitForLoaded();
    await expectSelectors<typeof EmployeeDetailsLocators>(employeeDetailsPage.elements, [
      'profileName',
      'personalDetailsHeading',
      'personalDetailsForm',
      'personalDetailsSaveButton',
      'firstNameInput',
      'middleNameInput',
      'lastNameInput',
    ]);
    await expect(employeeDetailsPage.employeeIdInput).toHaveValue(testEmployee.employeeId);
  });

  test('SystemUsersPage selectors match the live UI', { tag: '@regression' }, async ({ systemUsersPage }) => {
    await systemUsersPage.goto();
    await expectSelectors<typeof SystemUsersLocators>(systemUsersPage.elements, [
      'heading',
      'filterPanel',
      'searchButton',
      'resetButton',
    ]);
  });
});
