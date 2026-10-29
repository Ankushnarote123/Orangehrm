import { test, expect } from '@fixtures/test';
import { buildEmployee } from '@utils/dataFactory';

test.describe('PIM - Add Employee', () => {
  test.beforeEach(async ({ addEmployeePage }) => {
    await addEmployeePage.goto();
    await expect(addEmployeePage.elements.heading).toBeVisible();
  });

  test('creates an employee and opens their profile', { tag: '@smoke' }, async ({
    addEmployeePage,
    employeeDetailsPage,
    employeeCleanup,
  }) => {
    const employee = buildEmployee();
    employeeCleanup.track(employee.employeeId!);

    await addEmployeePage.fillEmployee(employee);
    // The toast is short-lived and can vanish during the redirect, so watch for it while saving.
    await Promise.all([
      expect(addEmployeePage.layout.toast('Successfully Saved')).toBeVisible(),
      addEmployeePage.save(),
    ]);

    await expect(employeeDetailsPage.elements.profileName).toHaveText(`${employee.firstName} ${employee.lastName}`);
    await expect(employeeDetailsPage.elements.firstNameInput).toHaveValue(employee.firstName);
    await expect(employeeDetailsPage.elements.middleNameInput).toHaveValue(employee.middleName!);
    await expect(employeeDetailsPage.elements.lastNameInput).toHaveValue(employee.lastName);
    await expect(employeeDetailsPage.employeeIdInput).toHaveValue(employee.employeeId!);
  });

  test('requires first and last name', { tag: '@regression' }, async ({ page, addEmployeePage }) => {
    await addEmployeePage.waitForGeneratedEmployeeId();
    await addEmployeePage.elements.saveButton.click();

    await expect(addEmployeePage.form.fields.error('Employee Full Name')).toHaveText(['Required', 'Required']);
    await expect(page).toHaveURL(/\/pim\/addEmployee/);
  });

  test('rejects a duplicate Employee Id', { tag: '@regression' }, async ({ addEmployeePage, testEmployee }) => {
    await addEmployeePage.fillEmployee(buildEmployee({ employeeId: testEmployee.employeeId }));

    await expect(addEmployeePage.form.fields.error('Employee Id')).toHaveText('Employee Id already exists');
  });

  test('cancel returns to the employee list without saving', { tag: '@regression' }, async ({
    page,
    addEmployeePage,
  }) => {
    await addEmployeePage.fillEmployee(buildEmployee());
    await addEmployeePage.elements.cancelButton.click();

    await expect(page).toHaveURL(/\/pim\/viewEmployeeList/);
  });
});
