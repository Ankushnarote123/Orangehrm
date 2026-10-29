import { by, type LocatorMap } from './LocatorHelper';

/** PIM > Employee List: /pim/viewEmployeeList (filter fields are in form.locators.ts, the grid in table.locators.ts). */
export const PIMLocators = {
  heading: by.role('heading', { name: 'Employee Information' }),
  filterPanel: by.css('.oxd-table-filter'),
  searchButton: by.role('button', { name: 'Search' }),
  resetButton: by.role('button', { name: 'Reset' }),
  addButton: by.role('button', { name: 'Add' }),
} satisfies LocatorMap;
