/** Application routes, relative to `baseURL`. */
export const ROUTES = {
  login: '/web/index.php/auth/login',
  dashboard: '/web/index.php/dashboard/index',
  employeeList: '/web/index.php/pim/viewEmployeeList',
  addEmployee: '/web/index.php/pim/addEmployee',
  employeeDetails: (empNumber: number) => `/web/index.php/pim/viewPersonalDetails/empNumber/${empNumber}`,
  systemUsers: '/web/index.php/admin/viewSystemUsers',
} as const;

/** REST endpoints used by the Vue front end; reused for fast test-data setup and teardown. */
export const API = {
  employees: '/web/index.php/api/v2/pim/employees',
  systemUsers: '/web/index.php/api/v2/admin/users',
} as const;

/** List endpoints return 50 detailed rows and are the slowest calls on the shared demo server. */
export const LIST_LOAD_TIMEOUT = 30_000;
