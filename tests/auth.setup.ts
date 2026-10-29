import { test as setup, expect } from '@fixtures/test';
import { ADMIN_STORAGE_STATE, env } from '@utils/env';

/**
 * Logs in once through the UI and saves the session, so the other tests start
 * already authenticated instead of repeating the login flow.
 */
setup('authenticate as admin', async ({ page, loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login(env.adminUsername, env.adminPassword);

  await expect(page).toHaveURL(/\/dashboard\/index/);
  await expect(dashboardPage.layout.moduleTitle).toHaveText('Dashboard');

  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
