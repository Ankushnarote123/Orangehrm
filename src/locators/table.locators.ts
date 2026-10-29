import { by, cssString, type LocatorMap } from './LocatorHelper';

/** The results grid shared by list screens (PIM, Admin). */
export const TableLocators = {
  headerCells: by.css('.oxd-table .oxd-table-header .oxd-table-th'),
  rows: by.css('.oxd-table .oxd-table-body [role="row"]'),
  /** "(12) Records Found", "(1) Record Found" or "No Records Found". */
  recordsFound: by.css('.orangehrm-horizontal-padding > span'),
  loadingSpinner: by.css('.oxd-loading-spinner'),
} satisfies LocatorMap;

/** Searched INSIDE one table row. */
export const TableRowLocators = {
  cells: by.role('cell'),
  cellInColumn: (column: number) => by.css(`[role="cell"]:nth-child(${column})`),
  // `:text-is()` matches the innermost element holding the text (a <div> inside the cell), hence `:has()`.
  cellWithText: (column: number, text: string) =>
    by.css(`[role="cell"]:nth-child(${column}):has(:text-is(${cssString(text)}))`),
  deleteButton: by.css('button:has(.bi-trash)'),
} satisfies LocatorMap;
