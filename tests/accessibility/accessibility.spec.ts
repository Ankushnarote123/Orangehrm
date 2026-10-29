import { test, expect } from '@fixtures/test';
import { AccessibilityHelper } from '@utils/helpers/index';
import baseline from '@test-data/accessibility-baseline.json';

/**
 * WCAG 2.1 AA scans of the main screens. OrangeHRM already has known
 * violations (listed in test-data/accessibility-baseline.json), so each test
 * fails only on a NEW rule violation. The full axe results are attached to
 * every test in the HTML report.
 */
test.describe('Accessibility (WCAG 2.1 AA)', () => {
  test.describe('logged out', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page has no new violations', { tag: '@regression' }, async ({ page, loginPage }, testInfo) => {
      await loginPage.goto();
      await expect(loginPage.elements.loginButton).toBeVisible();

      await AccessibilityHelper.verifyNoNewViolations(page, testInfo, { name: 'login', knownRuleIds: baseline.login });
    });
  });

  test('dashboard has no new violations', { tag: '@regression' }, async ({ page, dashboardPage }, testInfo) => {
    await dashboardPage.goto();
    await expect(dashboardPage.elements.widgetTitles.first()).toBeVisible();

    await AccessibilityHelper.verifyNoNewViolations(page, testInfo, {
      name: 'dashboard',
      knownRuleIds: baseline.dashboard,
    });
  });

  test('employee list has no new violations', { tag: '@regression' }, async ({ page, pimPage }, testInfo) => {
    await pimPage.goto();
    await expect(pimPage.table.rows.first()).toBeVisible();

    await AccessibilityHelper.verifyNoNewViolations(page, testInfo, {
      name: 'employee-list',
      knownRuleIds: baseline.employeeList,
    });
  });

  test('add employee form has no new violations', { tag: '@regression' }, async ({ page, addEmployeePage }, testInfo) => {
    await addEmployeePage.goto();
    await addEmployeePage.waitForGeneratedEmployeeId();

    await AccessibilityHelper.verifyNoNewViolations(page, testInfo, {
      name: 'add-employee',
      knownRuleIds: baseline.addEmployee,
    });
  });
});
