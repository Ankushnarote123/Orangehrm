import type { APIRequestContext, APIResponse } from '@playwright/test';
import { API } from './routes';
import type { EmployeeData } from './dataFactory';

export interface Employee {
  empNumber: number;
  employeeId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  terminationId: number | null;
}

/** Body of PUT /pim/employees/{empNumber}/personal-details (the same fields the UI sends). */
export interface PersonalDetailsUpdate {
  firstName: string;
  middleName: string;
  lastName: string;
  employeeId: string;
  otherId: string;
  drivingLicenseNo: string;
  drivingLicenseExpiredDate: string | null;
  gender: number | null;
  birthday: string | null;
}

export type PersonalDetails = PersonalDetailsUpdate & { empNumber: number };

/** OrangeHRM's error body, e.g. 422 `{ error: { status: "422", message: "Invalid Parameter", data: { invalidParamKeys: ["firstName"] } } }`. */
export interface ApiError {
  error: { status: string | number; message: string; data?: { invalidParamKeys?: string[] } };
}

/**
 * Client for OrangeHRM's employee REST API (the API the web UI itself calls).
 * Authenticated by the session cookie of the request context it is given.
 *
 * - Raw methods (createEmployee, getEmployee, ...) return the APIResponse, so
 *   API tests can assert status codes and error bodies.
 * - Convenience methods (create, findByEmployeeId, delete) throw on failure;
 *   fixtures use them to set up and clean up test data.
 */
export class EmployeeApi {
  constructor(private readonly request: APIRequestContext) {}

  // ---- Raw calls -----------------------------------------------------------

  createEmployee(data: EmployeeData): Promise<APIResponse> {
    return this.request.post(API.employees, {
      data: {
        firstName: data.firstName,
        middleName: data.middleName ?? '',
        lastName: data.lastName,
        employeeId: data.employeeId ?? '',
        empPicture: null,
      },
    });
  }

  getEmployee(empNumber: number): Promise<APIResponse> {
    return this.request.get(`${API.employees}/${empNumber}`);
  }

  listEmployees(params: Record<string, string | number>): Promise<APIResponse> {
    return this.request.get(API.employees, { params });
  }

  getPersonalDetails(empNumber: number): Promise<APIResponse> {
    return this.request.get(`${API.employees}/${empNumber}/personal-details`);
  }

  updatePersonalDetails(empNumber: number, details: PersonalDetailsUpdate): Promise<APIResponse> {
    return this.request.put(`${API.employees}/${empNumber}/personal-details`, { data: details });
  }

  deleteEmployees(empNumbers: number[]): Promise<APIResponse> {
    return this.request.delete(API.employees, { data: { ids: empNumbers } });
  }

  // ---- Convenience (throw on failure) ----------------------------------------

  async create(data: EmployeeData): Promise<Employee> {
    const response = await this.createEmployee(data);
    if (!response.ok()) {
      throw new Error(`Create employee failed: ${response.status()} ${await response.text()}`);
    }
    return ((await response.json()) as { data: Employee }).data;
  }

  /** Exact match on Employee Id (the API's `nameOrId` filter is a partial match). */
  async findByEmployeeId(employeeId: string): Promise<Employee[]> {
    const response = await this.listEmployees({ nameOrId: employeeId, includeEmployees: 'currentAndPast', limit: 50 });
    if (!response.ok()) {
      throw new Error(`Find employee failed: ${response.status()} ${await response.text()}`);
    }
    const body = (await response.json()) as { data: Employee[] };
    return body.data.filter((employee) => employee.employeeId === employeeId);
  }

  /** Deletes employees; ignores records that were already removed (e.g. by the test itself). */
  async delete(empNumbers: number[]): Promise<void> {
    if (empNumbers.length === 0) return;
    const response = await this.deleteEmployees(empNumbers);
    if (!response.ok() && response.status() !== 404) {
      throw new Error(`Delete employees failed: ${response.status()} ${await response.text()}`);
    }
  }
}
