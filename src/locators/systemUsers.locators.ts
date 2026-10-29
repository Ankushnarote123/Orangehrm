import { by, type LocatorMap } from './LocatorHelper';

/** Admin > User Management > Users: /admin/viewSystemUsers */
export const SystemUsersLocators = {
  heading: by.role('heading', { name: 'System Users' }),
  filterPanel: by.css('.oxd-table-filter'),
  searchButton: by.role('button', { name: 'Search' }),
  resetButton: by.role('button', { name: 'Reset' }),
} satisfies LocatorMap;
