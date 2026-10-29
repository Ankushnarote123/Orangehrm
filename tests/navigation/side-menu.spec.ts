import { test, expect } from '@fixtures/test';
import type { MenuItem } from '@pages/index';
import navigation from '@test-data/navigation.json';

test.describe('Side menu navigation', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
  });

  for (const { item, urlPart, title } of navigation.menuItems) {
    test(`"${item}" opens the ${title} module`, { tag: '@regression' }, async ({ page, dashboardPage }) => {
      await dashboardPage.navigateTo(item as MenuItem);

      await expect(page).toHaveURL(new RegExp(urlPart));
      await expect(dashboardPage.layout.moduleTitle).toHaveText(title);
    });
  }

  test('search filters the menu items', { tag: '@regression' }, async ({ dashboardPage }) => {
    const { items } = dashboardPage.sideMenu;

    await dashboardPage.searchMenu('PIM');
    await expect(items).toHaveText(['PIM']);

    await dashboardPage.searchMenu('zzz-no-match');
    await expect(items).toHaveCount(0);

    await dashboardPage.searchMenu('');
    // + Maintenance, which is not navigated because it asks for the password again.
    await expect(items).toHaveCount(navigation.menuItems.length + 1);
  });
});
