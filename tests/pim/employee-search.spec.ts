import { test, expect } from '@fixtures/test';
import { CommonHelper } from '@utils/helpers/index';

test.describe('PIM - Employee List', () => {
  test.beforeEach(async ({ pimPage }) => {
    await pimPage.goto();
    await expect(pimPage.elements.heading).toBeVisible();
  });

  test('finds an employee by Employee Id', { tag: '@smoke' }, async ({ pimPage, testEmployee }) => {
    await pimPage.searchByEmployeeId(testEmployee.employeeId);

    const { table } = pimPage;
    await expect(table.recordsFound).toHaveText('(1) Record Found');
    const row = await pimPage.rowByEmployeeId(testEmployee.employeeId);
    await expect(row).toHaveCount(1);
    await expect(await table.cell(row, 'First (& Middle) Name')).toHaveText(
      `${testEmployee.firstName} ${testEmployee.middleName}`,
    );
    await expect(await table.cell(row, 'Last Name')).toHaveText(testEmployee.lastName);
  });

  test('finds an employee by name', { tag: '@smoke' }, async ({ pimPage, testEmployee }) => {
    await pimPage.searchByName(testEmployee.firstName);

    await expect(pimPage.table.recordsFound).toHaveText('(1) Record Found');
    await expect(await pimPage.rowByEmployeeId(testEmployee.employeeId)).toHaveCount(1);
  });

  test('shows "No Records Found" for an unknown employee', { tag: '@regression' }, async ({ pimPage }) => {
    await pimPage.searchByName(`Nobody${CommonHelper.uniqueSuffix()}`);

    await expect(pimPage.table.recordsFound).toHaveText('No Records Found');
    await expect(pimPage.table.rows).toHaveCount(0);
    await expect(pimPage.layout.toast('No Records Found')).toBeVisible();
  });

  test('cancelling the delete dialog keeps the employee', { tag: '@regression' }, async ({ pimPage, testEmployee }) => {
    await pimPage.searchByEmployeeId(testEmployee.employeeId);
    await pimPage.requestDelete(await pimPage.rowByEmployeeId(testEmployee.employeeId));

    await expect(pimPage.layout.confirmDialog).toContainText('Are you Sure?');
    await pimPage.layout.cancelDeleteButton.click();

    await expect(pimPage.layout.confirmDialog).toBeHidden();
    await expect(await pimPage.rowByEmployeeId(testEmployee.employeeId)).toHaveCount(1);
  });

  test('table shows the expected columns', { tag: '@regression' }, async ({ pimPage }) => {
    expect(await pimPage.table.columnNames()).toEqual([
      '',
      'Id',
      'First (& Middle) Name',
      'Last Name',
      'Job Title',
      'Employment Status',
      'Sub Unit',
      'Supervisor',
      'Actions',
    ]);
  });
});
