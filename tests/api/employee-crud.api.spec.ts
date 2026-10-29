import { test, expect } from '@fixtures/test';
import { buildEmployee } from '@utils/dataFactory';
import type { Employee, PersonalDetails, PersonalDetailsUpdate } from '@utils/EmployeeApi';
import { VerificationHelper } from '@utils/helpers/index';

/**
 * Employee CRUD through OrangeHRM's REST API (the API the web UI calls).
 * No browser is launched: `adminApi` is an HTTP client using the saved admin session.
 * Every test creates its own uniquely named employee and removes it afterwards.
 */

/** The fields PUT /personal-details accepts, taken from the current record. */
function toUpdate(details: PersonalDetails): PersonalDetailsUpdate {
  const { firstName, middleName, lastName, employeeId, otherId, drivingLicenseNo, drivingLicenseExpiredDate, gender, birthday } =
    details;
  return { firstName, middleName, lastName, employeeId, otherId, drivingLicenseNo, drivingLicenseExpiredDate, gender, birthday };
}

test.describe('Employee API - CRUD', () => {
  test('create, read, update and delete an employee', { tag: '@regression' }, async ({ adminApi }) => {
    const data = buildEmployee();
    let empNumber: number | undefined;
    let deleted = false;

    try {
      await test.step('CREATE: POST /pim/employees', async () => {
        const response = await adminApi.createEmployee(data);

        VerificationHelper.verifyResponseStatus(response, 200, 'create');
        const created = ((await response.json()) as { data: Employee }).data;
        expect(created).toMatchObject({
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          employeeId: data.employeeId,
          terminationId: null,
        });
        expect(created.empNumber).toBeGreaterThan(0);
        empNumber = created.empNumber;
      });

      await test.step('READ: GET /pim/employees/{empNumber}', async () => {
        const response = await adminApi.getEmployee(empNumber!);

        VerificationHelper.verifyResponseStatus(response, 200, 'read');
        expect(((await response.json()) as { data: Employee }).data).toMatchObject({
          empNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          employeeId: data.employeeId,
        });
      });

      await test.step('READ: search by Employee Id returns exactly this employee', async () => {
        const response = await adminApi.listEmployees({ employeeId: data.employeeId!, model: 'detailed', limit: 50 });

        VerificationHelper.verifyResponseStatus(response, 200, 'search');
        const body = (await response.json()) as { data: Employee[]; meta: { total: number } };
        expect(body.meta.total).toBe(1);
        expect(body.data.map((employee) => employee.empNumber)).toEqual([empNumber]);
      });

      const updatedFirstName = `${data.firstName}Upd`;
      await test.step('UPDATE: PUT /pim/employees/{empNumber}/personal-details', async () => {
        const current = ((await (await adminApi.getPersonalDetails(empNumber!)).json()) as { data: PersonalDetails }).data;

        const response = await adminApi.updatePersonalDetails(empNumber!, {
          ...toUpdate(current),
          firstName: updatedFirstName,
          otherId: 'PW-OTHER-1',
        });

        VerificationHelper.verifyResponseStatus(response, 200, 'update');
        expect(((await response.json()) as { data: PersonalDetails }).data).toMatchObject({
          empNumber,
          firstName: updatedFirstName,
          otherId: 'PW-OTHER-1',
          lastName: data.lastName,
          employeeId: data.employeeId,
        });
      });

      await test.step('READ after update: change persisted, Employee Id unchanged', async () => {
        const response = await adminApi.getPersonalDetails(empNumber!);

        VerificationHelper.verifyResponseStatus(response, 200, 'read after update');
        expect(((await response.json()) as { data: PersonalDetails }).data).toMatchObject({
          firstName: updatedFirstName,
          otherId: 'PW-OTHER-1',
          employeeId: data.employeeId,
        });
      });

      await test.step('DELETE: DELETE /pim/employees', async () => {
        const response = await adminApi.deleteEmployees([empNumber!]);

        VerificationHelper.verifyResponseStatus(response, 200, 'delete');
        // The server lists exactly what it deleted: only this employee.
        expect(((await response.json()) as { data: string[] }).data).toEqual([String(empNumber)]);
        deleted = true;
      });

      await test.step('READ after delete: the record is gone', async () => {
        await VerificationHelper.verifyInvalidParams(await adminApi.getEmployee(empNumber!), ['empNumber'], 'read after delete');

        const search = await adminApi.listEmployees({ employeeId: data.employeeId!, model: 'detailed', limit: 50 });
        VerificationHelper.verifyResponseStatus(search, 200, 'search after delete');
        expect(await search.json()).toMatchObject({ data: [], meta: { total: 0 } });

        const deleteAgain = await adminApi.deleteEmployees([empNumber!]);
        VerificationHelper.verifyResponseStatus(deleteAgain, 404, 'second delete');
        expect(await deleteAgain.json()).toMatchObject({ error: { message: 'Records Not Found' } });
      });
    } finally {
      if (empNumber !== undefined && !deleted) {
        // Never let cleanup errors replace the original test failure.
        await adminApi.delete([empNumber]).catch((error: unknown) => console.warn('API test cleanup failed:', error));
      }
    }
  });

  test.describe('CREATE validation', () => {
    const invalidCreates = [
      { title: 'empty first name', data: { firstName: '' }, invalid: ['firstName'] },
      { title: 'empty last name', data: { lastName: '' }, invalid: ['lastName'] },
      { title: 'first name over 30 characters', data: { firstName: 'A'.repeat(31) }, invalid: ['firstName'] },
      { title: 'Employee Id over 10 characters', data: { employeeId: '12345678901' }, invalid: ['employeeId'] },
    ];

    for (const { title, data, invalid } of invalidCreates) {
      test(`rejects ${title}`, { tag: '@regression' }, async ({ adminApi }) => {
        const response = await adminApi.createEmployee(buildEmployee(data));

        // If the API wrongly accepted it, remove the record before failing.
        if (response.ok()) await adminApi.delete([((await response.json()) as { data: Employee }).data.empNumber]);
        await VerificationHelper.verifyInvalidParams(response, invalid, 'create');
      });
    }

    test('rejects a duplicate Employee Id', { tag: '@regression' }, async ({ adminApi }) => {
      const existing = await adminApi.create(buildEmployee());
      try {
        const response = await adminApi.createEmployee(buildEmployee({ employeeId: existing.employeeId }));

        if (response.ok()) await adminApi.delete([((await response.json()) as { data: Employee }).data.empNumber]);
        await VerificationHelper.verifyInvalidParams(response, ['employeeId'], 'duplicate create');
      } finally {
        await adminApi.delete([existing.empNumber]);
      }
    });
  });

  test.describe('UPDATE validation', () => {
    test('rejects an empty first name and keeps the stored value', { tag: '@regression' }, async ({ adminApi }) => {
      const employee = await adminApi.create(buildEmployee());
      try {
        const current = ((await (await adminApi.getPersonalDetails(employee.empNumber)).json()) as { data: PersonalDetails }).data;

        const response = await adminApi.updatePersonalDetails(employee.empNumber, { ...toUpdate(current), firstName: '' });

        await VerificationHelper.verifyInvalidParams(response, ['firstName'], 'update');
        const after = ((await (await adminApi.getPersonalDetails(employee.empNumber)).json()) as { data: PersonalDetails }).data;
        expect(after.firstName).toBe(employee.firstName);
      } finally {
        await adminApi.delete([employee.empNumber]);
      }
    });
  });

  test.describe('READ and DELETE of missing records', () => {
    test('reading a non-existent employee is rejected', { tag: '@regression' }, async ({ adminApi }) => {
      await VerificationHelper.verifyInvalidParams(await adminApi.getEmployee(999_999_999), ['empNumber'], 'read missing');
    });

    test('deleting a non-existent employee returns 404', { tag: '@regression' }, async ({ adminApi }) => {
      const response = await adminApi.deleteEmployees([999_999_999]);

      VerificationHelper.verifyResponseStatus(response, 404, 'delete missing');
      expect(await response.json()).toMatchObject({ error: { message: 'Records Not Found' } });
    });
  });
});
