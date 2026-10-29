import type { Locator, Page } from '@playwright/test';
import { getLocator, getLocators, TableLocators, TableRowLocators } from '@locators/index';
import { ElementHelper } from '@utils/helpers/index';

/** Actions on the results grid used by list screens (selectors in table.locators.ts). Cells are addressed by column name. */
export class DataTable {
  readonly elements;

  constructor(private readonly page: Page) {
    this.elements = getLocators(page, TableLocators);
  }

  get rows(): Locator {
    return this.elements.rows;
  }

  get recordsFound(): Locator {
    return this.elements.recordsFound;
  }

  get loadingSpinner(): Locator {
    return this.elements.loadingSpinner;
  }

  /**
   * Visible header names. Uses innerText on purpose: sortable headers contain a
   * hidden "Ascending/Descending" menu that textContent (and toHaveText) would include.
   */
  async columnNames(): Promise<string[]> {
    await this.elements.headerCells.first().waitFor();
    return ElementHelper.getTexts(this.elements.headerCells);
  }

  async columnIndex(column: string): Promise<number> {
    const headers = await this.columnNames();
    const index = headers.indexOf(column);
    if (index === -1) {
      throw new Error(`Column "${column}" not found. Available: ${headers.join(', ')}`);
    }
    return index;
  }

  /** Rows whose `column` cell text is exactly `value`. */
  async rowsWhere(column: string, value: string): Promise<Locator> {
    const cell = TableRowLocators.cellWithText((await this.columnIndex(column)) + 1, value);
    return this.rows.filter({ has: getLocator(this.page, cell) });
  }

  async cell(row: Locator, column: string): Promise<Locator> {
    return getLocator(row, TableRowLocators.cells).nth(await this.columnIndex(column));
  }

  async columnValues(column: string): Promise<string[]> {
    const index = await this.columnIndex(column);
    return ElementHelper.getTexts(getLocator(this.rows, TableRowLocators.cellInColumn(index + 1)));
  }

  deleteButton(row: Locator): Locator {
    return getLocator(row, TableRowLocators.deleteButton);
  }
}
