import { expect, type APIResponse, type Page, type Response } from '@playwright/test';
import type { ApiError } from '@utils/EmployeeApi';
import { CommonLocators, getLocators, type ToastType } from '@locators/index';
import type { PIMPage } from '@pages/index';
import type { DataTable } from '@pages/components/DataTable';
import { CommonHelper } from './CommonHelper';

interface EmployeeListBody {
  data: Array<{ employeeId: string; firstName: string; lastName: string }>;
  meta: { total: number };
}

/**
 * Reusable assertions. Each method is a group of Playwright `expect`s with
 * clear failure messages, so tests read as intent ("verify toast") rather
 * than a list of low-level checks.
 */
export class VerificationHelper {
  static async verifyUrlContains(page: Page, path: string): Promise<void> {
    await expect(page).toHaveURL(new RegExp(CommonHelper.escapeRegExp(path)));
  }

  /** A toast of the given kind with the given message is shown. */
  static async verifyToast(page: Page, type: ToastType, message: string): Promise<void> {
    await expect(getLocators(page, CommonLocators).toastOfType(type, message), `${type} toast "${message}"`).toBeVisible();
  }

  /** No error toast is shown, i.e. the app reported no failed request. */
  static async verifyNoErrorToast(page: Page): Promise<void> {
    await expect(getLocators(page, CommonLocators).errorToast, 'error toast').toHaveCount(0);
  }

  /** The call returned the expected status. Accepts browser responses and APIResponses alike. */
  static verifyResponseStatus(response: { status(): number }, expectedStatus: number, label: string): void {
    expect(response.status(), `${label} status`).toBe(expectedStatus);
  }

  /**
   * OrangeHRM's validation error: 422, "Invalid Parameter", and exactly the
   * rejected field names, e.g. `["firstName"]`.
   */
  static async verifyInvalidParams(response: APIResponse, invalidKeys: string[], label: string): Promise<void> {
    VerificationHelper.verifyResponseStatus(response, 422, label);
    const body = (await response.json()) as ApiError;
    expect(body.error.message, `${label} error message`).toBe('Invalid Parameter');
    expect(body.error.data?.invalidParamKeys, `${label} rejected fields`).toEqual(invalidKeys);
  }

  /** The table's "Records Found" text matches `count`. */
  static async verifyRecordCount(table: DataTable, count: number): Promise<void> {
    await expect(table.recordsFound).toHaveText(CommonHelper.recordCountText(count));
  }

  /**
   * Asserts that an Employee Id search really ran for `employeeId` and that the
   * server answered successfully with `expectedTotal` matches. Returns the parsed body.
   */
  static async verifyEmployeeSearchResponse(
    response: Response,
    employeeId: string,
    expectedTotal: number,
  ): Promise<EmployeeListBody> {
    expect(new URL(response.url()).searchParams.get('employeeId'), 'search must filter by the captured Employee Id')
      .toBe(employeeId);
    VerificationHelper.verifyResponseStatus(response, 200, 'employee list API');

    const body = (await response.json()) as EmployeeListBody;
    expect(body.meta.total, 'employee list API total').toBe(expectedTotal);
    expect(body.data.map((employee) => employee.employeeId)).toEqual(Array(expectedTotal).fill(employeeId));
    return body;
  }

  /**
   * Asserts a GENUINE empty result for an Employee Id search.
   *
   * The UI alone can't prove it: when a list request fails, OrangeHRM keeps the
   * table's previous state and only adds an error toast. After a deletion the
   * table already shows "No Records Found" for that id, so a failed follow-up
   * search would look identical to a real empty result (reproduced in
   * tests/pim/search-failure.spec.ts). So this checks, in order:
   *  1. the request filtered by this exact id and returned 200 with total 0;
   *  2. loading has finished;
   *  3. the empty-state text, no rows, and the *info* toast "No Records Found";
   *  4. no *error* toast, which is how the app reports failed requests.
   */
  static async verifyNoEmployeeFound(pimPage: PIMPage, response: Response, employeeId: string): Promise<void> {
    await VerificationHelper.verifyEmployeeSearchResponse(response, employeeId, 0);

    await expect(pimPage.table.loadingSpinner).toHaveCount(0);
    await VerificationHelper.verifyRecordCount(pimPage.table, 0);
    await expect(pimPage.table.rows).toHaveCount(0);
    await VerificationHelper.verifyToast(pimPage.page, 'info', 'No Records Found');
    // Checked after the info toast is visible: a failure toast would have rendered by then.
    await VerificationHelper.verifyNoErrorToast(pimPage.page);
  }
}
