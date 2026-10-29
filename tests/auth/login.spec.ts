import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';
import { ROUTES } from '@utils/routes';
import { BrowserHelper } from '@utils/helpers/index';
import loginData from '@test-data/login.json';

// These tests exercise the login screen itself, so start without the saved session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('admin can log in with valid credentials', { tag: '@smoke' }, async ({ page, loginPage, dashboardPage }) => {
    await loginPage.login(env.adminUsername, env.adminPassword);

    await expect(page).toHaveURL(/\/dashboard\/index/);
    await expect(dashboardPage.layout.moduleTitle).toHaveText('Dashboard');
    await expect(dashboardPage.layout.userName).not.toBeEmpty();
  });

  for (const { title, username, password } of loginData.invalidCredentials) {
    test(`shows an error for ${title}`, { tag: '@regression' }, async ({ page, loginPage }) => {
      await loginPage.login(username, password);

      await expect(loginPage.elements.errorAlert).toHaveText('Invalid credentials');
      await expect(page).toHaveURL(new RegExp(ROUTES.login));
    });
  }

  for (const { title, username, password, requiredFields } of loginData.missingFields) {
    test(`flags required fields when ${title}`, { tag: '@regression' }, async ({ page, loginPage }) => {
      await loginPage.login(username, password);

      for (const field of ['Username', 'Password'] as const) {
        const error = loginPage.fieldError(field);
        if (requiredFields.includes(field)) {
          await expect(error).toHaveText('Required');
        } else {
          await expect(error).toBeHidden();
        }
      }
      await expect(page).toHaveURL(new RegExp(ROUTES.login));
    });
  }

  test('user can log out and protected pages then redirect to login', { tag: '@regression' }, async ({
    page,
    loginPage,
    dashboardPage,
  }) => {
    await loginPage.login(env.adminUsername, env.adminPassword);
    await expect(page).toHaveURL(/\/dashboard\/index/);

    await dashboardPage.logout();
    await expect(page).toHaveURL(new RegExp(ROUTES.login));
    await expect(loginPage.elements.loginButton).toBeVisible();

    await BrowserHelper.gotoWithRetry(page, ROUTES.dashboard);
    await expect(page).toHaveURL(new RegExp(ROUTES.login));
  });

  test('unauthenticated access to a protected page redirects to login', { tag: '@regression' }, async ({
    page,
    loginPage,
  }) => {
    await BrowserHelper.gotoWithRetry(page, ROUTES.employeeList);

    await expect(page).toHaveURL(new RegExp(ROUTES.login));
    await expect(loginPage.elements.title).toHaveText('Login');
    await expect(loginPage.elements.forgotPasswordLink).toBeVisible();
  });
});
