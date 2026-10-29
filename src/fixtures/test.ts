import { test as base, type APIRequestContext } from '@playwright/test';
import {
  AddEmployeePage,
  DashboardPage,
  EmployeeDetailsPage,
  LoginPage,
  PIMPage,
  SystemUsersPage,
} from '@pages/index';
import { EmployeeApi, type Employee } from '@utils/EmployeeApi';
import { buildEmployee } from '@utils/dataFactory';
import { ADMIN_STORAGE_STATE } from '@utils/env';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  pimPage: PIMPage;
  addEmployeePage: AddEmployeePage;
  employeeDetailsPage: EmployeeDetailsPage;
  systemUsersPage: SystemUsersPage;
  employeeApi: EmployeeApi;
  /** A fresh employee created through the API before the test and deleted after it. */
  testEmployee: Employee;
  /**
   * Register the Employee Id of an employee the test creates through the UI.
   * It is deleted after the test, even if the test failed midway through saving.
   */
  employeeCleanup: { track: (employeeId: string) => void };
  /** HTTP client logged in as admin (saved session). No browser is launched: for API tests. */
  adminRequest: APIRequestContext;
  /** HTTP client with NO session: for checking that protected endpoints refuse access. */
  anonymousRequest: APIRequestContext;
  /** EmployeeApi on top of `adminRequest`: API calls without a browser. */
  adminApi: EmployeeApi;
};

/**
 * Every fixture is test-scoped: each test gets its own browser context, page
 * objects and data, so tests are independent and safe to run in parallel.
 */
export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
  pimPage: async ({ page }, use) => use(new PIMPage(page)),
  addEmployeePage: async ({ page }, use) => use(new AddEmployeePage(page)),
  employeeDetailsPage: async ({ page }, use) => use(new EmployeeDetailsPage(page)),
  systemUsersPage: async ({ page }, use) => use(new SystemUsersPage(page)),

  // page.request shares the context's cookies, so it is authenticated whenever the page is.
  employeeApi: async ({ page }, use) => use(new EmployeeApi(page.request)),

  testEmployee: async ({ employeeApi }, use) => {
    const employee = await employeeApi.create(buildEmployee());
    await use(employee);
    await employeeApi.delete([employee.empNumber]);
  },

  employeeCleanup: async ({ employeeApi }, use) => {
    const employeeIds: string[] = [];
    await use({ track: (employeeId) => employeeIds.push(employeeId) });
    for (const employeeId of employeeIds) {
      const matches = await employeeApi.findByEmployeeId(employeeId);
      await employeeApi.delete(matches.map((employee) => employee.empNumber));
    }
  },

  adminRequest: async ({ playwright, baseURL }, use) => {
    const request = await playwright.request.newContext({ baseURL, storageState: ADMIN_STORAGE_STATE });
    await use(request);
    await request.dispose();
  },

  anonymousRequest: async ({ playwright, baseURL }, use) => {
    // Explicitly empty: inside tests, request contexts otherwise inherit the project's saved admin session.
    const request = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    await use(request);
    await request.dispose();
  },

  adminApi: async ({ adminRequest }, use) => use(new EmployeeApi(adminRequest)),
});

export { expect } from '@playwright/test';
