import { test, expect } from '@fixtures/test';
import { CommonHelper, VerificationHelper } from '@utils/helpers/index';

/**
 * Negative controls for the post-deletion check. When a list request fails,
 * OrangeHRM keeps the table's previous state and only adds an error toast.
 * After a deletion that previous state is already "No Records Found", so a
 * failed follow-up search LOOKS like a genuine empty result. These tests prove
 * `VerificationHelper.verifyNoEmployeeFound` still rejects it.
 */
test.describe('PIM - failed search is not an empty result', () => {
  test.beforeEach(async ({ pimPage }) => {
    await pimPage.goto();
  });

  test('a server error after an empty result is rejected', { tag: '@regression' }, async ({ page, pimPage }) => {
    const employeeId = CommonHelper.uniqueSuffix().slice(-10);

    // Same state as right after the CRUD test's deletion: a genuine empty result for this id.
    await VerificationHelper.verifyNoEmployeeFound(pimPage, await pimPage.searchByEmployeeId(employeeId), employeeId);

    // The repeat search now fails on the server.
    await page.route(
      (url) => url.pathname.endsWith('/api/v2/pim/employees') && url.searchParams.get('employeeId') === employeeId,
      (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { status: '500', message: 'Unexpected Error Occurred' } }),
        }),
    );
    const failed = await pimPage.search({ employeeId });

    // The table looks exactly like an empty result...
    await expect(pimPage.table.recordsFound).toHaveText('No Records Found');
    await expect(pimPage.table.rows).toHaveCount(0);
    // ...but the response and the error toast reveal the failure, and the check rejects it.
    expect(failed.status()).toBe(500);
    await expect(pimPage.layout.toastOfType('error', 'Unexpected Error Occurred')).toBeVisible();
    await expect(VerificationHelper.verifyNoEmployeeFound(pimPage, failed, employeeId)).rejects.toThrow(/employee list API status/);
  });

  test('a successful search that returns a record is rejected', { tag: '@regression' }, async ({
    pimPage,
    testEmployee,
  }) => {
    const response = await pimPage.searchByEmployeeId(testEmployee.employeeId);

    expect(response.status()).toBe(200);
    await expect(VerificationHelper.verifyNoEmployeeFound(pimPage, response, testEmployee.employeeId)).rejects.toThrow(
      /employee list API total/,
    );
  });
});
