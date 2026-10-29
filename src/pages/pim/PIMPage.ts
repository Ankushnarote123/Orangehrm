import type { Locator, Response } from '@playwright/test';
import { BasePage } from '../BasePage';
import { Form } from '../components/Form';
import { DataTable } from '../components/DataTable';
import { getLocators, PIMLocators } from '@locators/index';
import { BrowserHelper, type ApiMatcher } from '@utils/helpers/index';
import { API, LIST_LOAD_TIMEOUT, ROUTES } from '@utils/routes';

/**
 * The employee table request. The employee-name autocomplete calls the same
 * endpoint while typing; only the table request has `model=detailed`.
 */
const LIST_REQUEST = {
  path: API.employees,
  params: { model: 'detailed' },
  timeout: LIST_LOAD_TIMEOUT,
} satisfies ApiMatcher;

/** PIM > Employee List: filters, results table and row actions. */
export class PIMPage extends BasePage {
  static readonly locators = PIMLocators;

  protected readonly path = ROUTES.employeeList;
  readonly elements = getLocators(this.page, PIMLocators);
  readonly filters = new Form(this.elements.filterPanel);
  readonly table = new DataTable(this.page);

  /** Opens the list and waits for its first page of employees. */
  override async goto(): Promise<void> {
    await BrowserHelper.performAndWaitForResponse(this.page, () => super.goto(), LIST_REQUEST);
  }

  async openAddEmployee(): Promise<void> {
    await this.elements.addButton.click();
  }

  async searchByName(name: string): Promise<Response> {
    await this.filters.fill('Employee Name', name);
    return this.search({ nameOrId: name });
  }

  /** The Employee Id filter is an exact match on the server side. */
  async searchByEmployeeId(employeeId: string): Promise<Response> {
    await this.filters.fill('Employee Id', employeeId);
    return this.search({ employeeId });
  }

  /**
   * Clicks Search and waits for the list response carrying `expectedParams`,
   * so an earlier in-flight list load (e.g. the page's initial one) can't be
   * mistaken for this search. Returns the response: on a failed request the
   * table keeps its previous rows, so the UI alone can't prove the result.
   */
  async search(expectedParams: Record<string, string> = {}): Promise<Response> {
    return BrowserHelper.performAndWaitForResponse(this.page, () => this.elements.searchButton.click(), {
      ...LIST_REQUEST,
      params: { ...LIST_REQUEST.params, ...expectedParams },
    });
  }

  /** Rows whose "Id" column is exactly `employeeId`. */
  rowByEmployeeId(employeeId: string): Promise<Locator> {
    return this.table.rowsWhere('Id', employeeId);
  }

  /** Rows are clickable and open the employee's Personal Details. */
  async openEmployee(row: Locator): Promise<void> {
    await row.click();
  }

  /** Clicks the row's trash icon; the confirmation dialog stays open for the caller. */
  async requestDelete(row: Locator): Promise<void> {
    await this.table.deleteButton(row).click();
  }

  /** Confirms the open delete dialog and returns the delete API response. */
  async confirmDeleteEmployee(): Promise<Response> {
    return BrowserHelper.performAndWaitForResponse(this.page, () => this.confirmDelete(), {
      path: API.employees,
      method: 'DELETE',
    });
  }
}
