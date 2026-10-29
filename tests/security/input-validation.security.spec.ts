import { test, expect } from '@fixtures/test';
import { buildEmployee } from '@utils/dataFactory';
import type { Employee } from '@utils/EmployeeApi';
import { VerificationHelper } from '@utils/helpers/index';
import { API } from '@utils/routes';

/**
 * Input handling for the employee CRUD scenario: script injection, SQL
 * injection-style input, and error responses that must not leak internals.
 * Payloads are harmless markers sent once each; any record that gets created
 * is deleted right away.
 */

/** Text that would reveal server internals in an error response. */
const INTERNAL_DETAILS = /SQLSTATE|Exception|Stack trace|Traceback|Doctrine|Symfony|\/var\/www|\.php on line|mysqli?/i;

test.describe('Security - input validation', () => {
  const scriptPayloads = [
    '<script>window.__pwXss=1</script>',
    '<img src=x onerror=window.__pwXss=1>',
    '"><svg onload=window.__pwXss=1>',
  ];

  for (const payload of scriptPayloads) {
    test(`rejects script markup in an employee name: ${payload}`, { tag: '@regression' }, async ({ adminApi }) => {
      const response = await adminApi.createEmployee(buildEmployee({ firstName: payload }));

      // If it was stored, delete it before failing so no payload is left on the shared server.
      if (response.ok()) await adminApi.delete([((await response.json()) as { data: Employee }).data.empNumber]);
      await VerificationHelper.verifyInvalidParams(response, ['firstName'], 'create with script markup');
    });
  }

  test('script markup in the Add Employee form is not saved', { tag: '@regression' }, async ({
    page,
    addEmployeePage,
    employeeCleanup,
  }) => {
    const employee = buildEmployee({ firstName: '<img src=x onerror=window.__pwXss=1>' });
    employeeCleanup.track(employee.employeeId!);
    await addEmployeePage.goto();
    await addEmployeePage.fillEmployee(employee);

    await addEmployeePage.elements.saveButton.click();

    // The app refuses the name: the user stays on the form, and no script ran.
    await expect(addEmployeePage.form.fields.error('Employee Full Name')).toBeVisible();
    await expect(page).toHaveURL(/\/pim\/addEmployee/);
    expect(await page.evaluate(() => (window as unknown as { __pwXss?: number }).__pwXss)).toBeUndefined();
  });

  for (const payload of [`' OR '1'='1`, `' OR 1=1 --`, `admin'--`]) {
    test(`SQL injection-style search input returns no data: ${payload}`, { tag: '@regression' }, async ({ adminApi }) => {
      // Employee Id filter: validated and refused.
      const byId = await adminApi.listEmployees({ employeeId: payload, model: 'detailed', limit: 50 });
      expect(byId.status(), 'no server error').toBeLessThan(500);
      if (byId.ok()) expect(await byId.json()).toMatchObject({ data: [], meta: { total: 0 } });
      else await VerificationHelper.verifyInvalidParams(byId, ['employeeId'], 'employeeId filter');

      // Free-text name search: accepted as text, matches nothing, no error.
      const byName = await adminApi.listEmployees({ nameOrId: payload, model: 'detailed', limit: 50 });
      VerificationHelper.verifyResponseStatus(byName, 200, 'name search');
      expect(await byName.json()).toMatchObject({ data: [], meta: { total: 0 } });
    });
  }

  test('error responses do not leak server internals', { tag: '@regression' }, async ({ adminRequest }) => {
    const responses = {
      'missing employee': await adminRequest.get(`${API.employees}/999999999`),
      'non-numeric id': await adminRequest.get(`${API.employees}/abc`),
      'malformed create body': await adminRequest.post(API.employees, { data: '{"firstName":' }),
      'delete missing employee': await adminRequest.delete(API.employees, { data: { ids: [999999999] } }),
    };

    for (const [name, response] of Object.entries(responses)) {
      expect(response.status(), `${name}: handled, not a server crash`).toBeLessThan(500);
      expect(await response.text(), `${name}: body`).not.toMatch(INTERNAL_DETAILS);
    }
  });
});
