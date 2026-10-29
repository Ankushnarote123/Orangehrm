import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';
import { CommonHelper } from '@utils/helpers/index';
import adminData from '@test-data/admin.json';

test.describe('Admin - System Users', () => {
  test.beforeEach(async ({ systemUsersPage }) => {
    await systemUsersPage.goto();
    await expect(systemUsersPage.elements.heading).toBeVisible();
  });

  test('shows the user management screen', { tag: '@regression' }, async ({ systemUsersPage }) => {
    await expect(systemUsersPage.layout.moduleTitle).toHaveText('Admin');
    await expect(systemUsersPage.layout.levelTitle).toHaveText('User Management');
    expect(await systemUsersPage.table.columnNames()).toEqual(['', ...adminData.userTableColumns]);
    await expect(systemUsersPage.table.rows.first()).toBeVisible();
  });

  test('filters users by username', { tag: '@regression' }, async ({ systemUsersPage }) => {
    await systemUsersPage.filterBy({ username: env.adminUsername });

    const { table } = systemUsersPage;
    await expect(table.rows).toHaveCount(1);
    await expect(await table.cell(table.rows.first(), 'Username')).toHaveText(env.adminUsername);
    await expect(await table.cell(table.rows.first(), 'User Role')).toHaveText('Admin');
    await expect(await table.cell(table.rows.first(), 'Status')).toHaveText('Enabled');
  });

  test('filtering by role only returns users with that role', { tag: '@regression' }, async ({ systemUsersPage }) => {
    await systemUsersPage.filterBy({ role: 'ESS' });

    const roles = await systemUsersPage.table.columnValues('User Role');
    expect(roles.length).toBeGreaterThan(0);
    expect(new Set(roles)).toEqual(new Set(['ESS']));
  });

  test('user role and status filters offer the expected options', { tag: '@regression' }, async ({
    systemUsersPage,
  }) => {
    expect(await systemUsersPage.filters.options('User Role')).toEqual(adminData.userRoleOptions);
    expect(await systemUsersPage.filters.options('Status')).toEqual(adminData.statusOptions);
  });

  test('shows "No Records Found" for an unknown username', { tag: '@regression' }, async ({ systemUsersPage }) => {
    await systemUsersPage.filterBy({ username: `ghost_${CommonHelper.uniqueSuffix()}` });

    await expect(systemUsersPage.table.recordsFound).toHaveText('No Records Found');
    await expect(systemUsersPage.table.rows).toHaveCount(0);
  });

  test('reset clears the filters', { tag: '@regression' }, async ({ systemUsersPage }) => {
    await systemUsersPage.filterBy({ username: env.adminUsername, role: 'Admin' });
    await systemUsersPage.reset();

    await expect(systemUsersPage.filters.fields.input('Username')).toHaveValue('');
    await expect(systemUsersPage.filters.fields.selectedValue('User Role')).toHaveText('-- Select --');
    await expect(systemUsersPage.table.rows.nth(1)).toBeVisible();
  });
});
