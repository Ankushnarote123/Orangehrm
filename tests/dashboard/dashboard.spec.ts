import { test, expect } from '@fixtures/test';
import type { UserMenuItem } from '@pages/index';
import navigation from '@test-data/navigation.json';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  test('shows the dashboard title and all widgets', { tag: '@regression' }, async ({ dashboardPage }) => {
    await expect(dashboardPage.layout.moduleTitle).toHaveText('Dashboard');
    for (const title of navigation.dashboardWidgets) {
      await expect(dashboardPage.elements.widget(title), `widget "${title}"`).toBeVisible();
    }
  });

  test('user dropdown offers the expected account actions', { tag: '@regression' }, async ({ dashboardPage }) => {
    await dashboardPage.openUserMenu();

    for (const item of navigation.userMenuItems) {
      await expect(dashboardPage.layout.userMenuItem(item as UserMenuItem)).toBeVisible();
    }
  });
});
