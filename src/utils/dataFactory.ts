import { CommonHelper } from './helpers/CommonHelper';

export interface EmployeeName {
  firstName: string;
  middleName?: string;
  lastName: string;
}

export interface EmployeeData extends EmployeeName {
  /** OrangeHRM limits Employee Id to 10 characters. Omit it to keep the id the app generates. */
  employeeId?: string;
}

/** Unique names only; the app generates the Employee Id. */
export function buildEmployeeName(overrides: Partial<EmployeeName> = {}): EmployeeName {
  return {
    firstName: `Pw${CommonHelper.uniqueSuffix()}`,
    middleName: 'Auto',
    lastName: 'Tester',
    ...overrides,
  };
}

/** Unique names plus a unique, test-chosen Employee Id. */
export function buildEmployee(overrides: Partial<EmployeeData> = {}): EmployeeData {
  return {
    ...buildEmployeeName(),
    employeeId: CommonHelper.uniqueSuffix().slice(-10),
    ...overrides,
  };
}
