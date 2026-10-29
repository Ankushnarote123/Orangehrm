import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';
import { API, ROUTES } from '@utils/routes';
import { BrowserHelper, VerificationHelper } from '@utils/helpers/index';

/**
 * Authentication and session security around the employee CRUD scenario.
 * Non-destructive: one request per check, no brute force.
 */
test.describe('Security - authentication and session', () => {
  test('employee API refuses every CRUD call without a session', { tag: '@regression' }, async ({ anonymousRequest }) => {
    const calls = {
      'list employees': () => anonymousRequest.get(API.employees),
      'read employee': () => anonymousRequest.get(`${API.employees}/1`),
      'create employee': () =>
        anonymousRequest.post(API.employees, { data: { firstName: 'Anon', middleName: '', lastName: 'Attempt', employeeId: '', empPicture: null } }),
      'update employee': () => anonymousRequest.put(`${API.employees}/1/personal-details`, { data: { firstName: 'Anon' } }),
      'delete employee': () => anonymousRequest.delete(API.employees, { data: { ids: [1] } }),
    };

    for (const [name, call] of Object.entries(calls)) {
      const response = await call();
      VerificationHelper.verifyResponseStatus(response, 401, `${name} without session`);
      expect(await response.json(), name).toMatchObject({ error: { status: 401 } });
    }
  });

  test.describe('without a session', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const [name, route] of Object.entries({
      'Dashboard': ROUTES.dashboard,
      'Employee List': ROUTES.employeeList,
      'Add Employee': ROUTES.addEmployee,
      'Employee profile': ROUTES.employeeDetails(1),
      'System Users': ROUTES.systemUsers,
    })) {
      test(`${name} page redirects to login`, { tag: '@regression' }, async ({ page, loginPage }) => {
        await BrowserHelper.gotoWithRetry(page, route);

        await VerificationHelper.verifyUrlContains(page, ROUTES.login);
        await expect(loginPage.elements.loginButton).toBeVisible();
      });
    }

    test('logout invalidates the session on the server', { tag: '@regression' }, async ({
      page,
      context,
      loginPage,
      dashboardPage,
      anonymousRequest,
      playwright,
      baseURL,
    }) => {
      await loginPage.goto();
      await loginPage.login(env.adminUsername, env.adminPassword);
      await VerificationHelper.verifyUrlContains(page, ROUTES.dashboard);
      const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === 'orangehrm');
      expect(sessionCookie, 'session cookie after login').toBeDefined();

      await dashboardPage.logout();
      await VerificationHelper.verifyUrlContains(page, ROUTES.login);

      // Replay the pre-logout cookie from a separate client: the server must reject it.
      const replay = await playwright.request.newContext({ baseURL, storageState: { cookies: [sessionCookie!], origins: [] } });
      try {
        VerificationHelper.verifyResponseStatus(await replay.get(API.employees), 401, 'old session after logout');
      } finally {
        await replay.dispose();
      }
      // The browser got a new, different session id (no session fixation).
      const newCookie = (await context.cookies()).find((cookie) => cookie.name === 'orangehrm');
      expect(newCookie?.value).not.toBe(sessionCookie!.value);
      // And the anonymous client is still refused, as a control.
      VerificationHelper.verifyResponseStatus(await anonymousRequest.get(API.employees), 401, 'anonymous control');
    });

    test('login errors do not reveal whether a username exists', { tag: '@regression' }, async ({ loginPage }) => {
      const messages: string[] = [];
      for (const username of [env.adminUsername, `no_such_user_${Date.now()}`]) {
        await loginPage.goto();
        await loginPage.login(username, 'wrong-password-123');
        await expect(loginPage.elements.errorAlert).toBeVisible();
        messages.push((await loginPage.elements.errorAlert.innerText()).trim());
      }

      // Same message for "wrong password" and "unknown user": no user enumeration.
      expect(messages[0]).toBe('Invalid credentials');
      expect(messages[1]).toBe(messages[0]);
    });

    test('login form carries a per-session CSRF token', { tag: '@regression' }, async ({ browser, baseURL }) => {
      const tokens: string[] = [];
      for (let i = 0; i < 2; i++) {
        const context = await browser.newContext({ baseURL });
        try {
          const page = await context.newPage();
          await BrowserHelper.gotoWithRetry(page, ROUTES.login);
          tokens.push(await page.locator('form input[name="_token"]').inputValue());
        } finally {
          await context.close();
        }
      }

      expect(tokens[0].length, 'token length').toBeGreaterThan(20);
      expect(tokens[1], 'each session gets its own token').not.toBe(tokens[0]);
    });
  });
});
