import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';
import { buildEmployeeName } from '@utils/dataFactory';
import { VerificationHelper } from '@utils/helpers/index';
import { ROUTES } from '@utils/routes';

// Step 1 of the scenario is a real UI login, so start without the saved session.
test.use({ storageState: { cookies: [], origins: [] } });

test('admin can create, find, update and delete an employee', { tag: '@regression' }, async ({
  page,
  loginPage,
  dashboardPage,
  pimPage,
  addEmployeePage,
  employeeDetailsPage,
  employeeApi,
}) => {
  const employee = buildEmployeeName();
  const updatedFirstName = `${employee.firstName}Upd`;
  // Set as soon as the record exists, so `finally` deletes only what this test created.
  let createdEmpNumber: number | undefined;
  let deletedThroughUi = false;

  try {
    await test.step('1. Log in as the demo administrator', async () => {
      await loginPage.goto();
      await loginPage.login(env.adminUsername, env.adminPassword);

      await VerificationHelper.verifyUrlContains(page, ROUTES.dashboard);
      await expect(dashboardPage.layout.moduleTitle).toHaveText('Dashboard');
      await expect(loginPage.elements.errorAlert).toHaveCount(0);
    });

    await test.step('2. Navigate to PIM > Add Employee', async () => {
      await dashboardPage.navigateTo('PIM');
      await expect(pimPage.elements.heading).toBeVisible();
      await pimPage.openAddEmployee();
      await expect(addEmployeePage.elements.heading).toBeVisible();
    });

    // 3-5. Unique names are generated above; the Employee Id is the one the app assigns.
    const employeeId = await test.step('3-5. Create the employee and capture the generated Employee Id', async () => {
      const generatedId = await addEmployeePage.waitForGeneratedEmployeeId();
      expect(generatedId.trim(), 'Generated Employee Id should be non-empty').not.toBe('');

      await addEmployeePage.fillEmployee(employee);
      const { empNumber } = await addEmployeePage.save();
      createdEmpNumber = empNumber;

      // The new profile shows the persisted record: the captured id and the names entered.
      expect(empNumber).toBeGreaterThan(0);
      await expect(employeeDetailsPage.employeeIdInput).toHaveValue(generatedId);
      await expect(employeeDetailsPage.elements.firstNameInput).toHaveValue(employee.firstName);
      await expect(employeeDetailsPage.elements.middleNameInput).toHaveValue(employee.middleName!);
      await expect(employeeDetailsPage.elements.lastNameInput).toHaveValue(employee.lastName);
      return generatedId;
    });

    await test.step('6-7. Search by the captured Employee Id: exactly this employee is returned', async () => {
      await dashboardPage.navigateTo('PIM');
      const response = await pimPage.searchByEmployeeId(employeeId);

      await VerificationHelper.verifyEmployeeSearchResponse(response, employeeId, 1);
      await VerificationHelper.verifyRecordCount(pimPage.table, 1);
      const row = await pimPage.rowByEmployeeId(employeeId);
      await expect(row).toHaveCount(1);
      await expect(await pimPage.table.cell(row, 'Id')).toHaveText(employeeId);
      await expect(await pimPage.table.cell(row, 'First (& Middle) Name')).toHaveText(
        `${employee.firstName} ${employee.middleName}`,
      );
      await expect(await pimPage.table.cell(row, 'Last Name')).toHaveText(employee.lastName);
    });

    await test.step('8. Update the first name', async () => {
      await pimPage.openEmployee(await pimPage.rowByEmployeeId(employeeId));
      await expect(page).toHaveURL(new RegExp(`/pim/viewPersonalDetails/empNumber/${createdEmpNumber}$`));

      const response = await employeeDetailsPage.updateName({ firstName: updatedFirstName });

      VerificationHelper.verifyResponseStatus(response, 200, 'update API');
      await VerificationHelper.verifyToast(page, 'success', 'Successfully Updated');
      await expect(employeeDetailsPage.elements.firstNameInput).toHaveValue(updatedFirstName);
      // The update must not change the Employee Id.
      await expect(employeeDetailsPage.employeeIdInput).toHaveValue(employeeId);
    });

    await test.step('9. Search again: updated name, unchanged Employee Id', async () => {
      await dashboardPage.navigateTo('PIM');
      const response = await pimPage.searchByEmployeeId(employeeId);

      const body = await VerificationHelper.verifyEmployeeSearchResponse(response, employeeId, 1);
      expect(body.data[0]).toMatchObject({ employeeId, firstName: updatedFirstName, lastName: employee.lastName });
      await VerificationHelper.verifyRecordCount(pimPage.table, 1);
      const row = await pimPage.rowByEmployeeId(employeeId);
      await expect(row).toHaveCount(1);
      await expect(await pimPage.table.cell(row, 'Id')).toHaveText(employeeId);
      await expect(await pimPage.table.cell(row, 'First (& Middle) Name')).toHaveText(
        `${updatedFirstName} ${employee.middleName}`,
      );
      await expect(await pimPage.table.cell(row, 'Last Name')).toHaveText(employee.lastName);
    });

    await test.step('10. Delete only the employee created by this test', async () => {
      // The search is an exact Employee Id match and returned exactly one row above.
      await pimPage.requestDelete(await pimPage.rowByEmployeeId(employeeId));
      await expect(pimPage.layout.confirmDialog).toContainText('The selected record will be permanently deleted');
      const response = await pimPage.confirmDeleteEmployee();

      VerificationHelper.verifyResponseStatus(response, 200, 'delete API');
      // The server reports exactly which records it deleted: only ours.
      expect(((await response.json()) as { data: string[] }).data).toEqual([String(createdEmpNumber)]);
      await VerificationHelper.verifyToast(page, 'success', 'Successfully Deleted');
      await expect(pimPage.layout.confirmDialog).toBeHidden();
      deletedThroughUi = true;
    });

    await test.step('11-12. Search again by the same Employee Id: a genuine empty result', async () => {
      const response = await pimPage.searchByEmployeeId(employeeId);

      await VerificationHelper.verifyNoEmployeeFound(pimPage, response, employeeId);
      // Independent server-side check, including past (terminated) employees.
      expect(await employeeApi.findByEmployeeId(employeeId)).toEqual([]);
    });
  } finally {
    if (createdEmpNumber !== undefined && !deletedThroughUi) {
      // Never let cleanup errors replace the original test failure.
      await employeeApi
        .delete([createdEmpNumber])
        .catch((error: unknown) => console.warn(`Cleanup of empNumber ${createdEmpNumber} failed:`, error));
    }
  }
});
