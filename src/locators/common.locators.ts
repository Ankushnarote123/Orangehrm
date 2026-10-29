import { by, cssString, type LocatorMap } from './LocatorHelper';

export type MenuItem =
  | 'Admin'
  | 'PIM'
  | 'Leave'
  | 'Time'
  | 'Recruitment'
  | 'My Info'
  | 'Performance'
  | 'Dashboard'
  | 'Directory'
  | 'Maintenance'
  | 'Claim'
  | 'Buzz';

export type UserMenuItem = 'About' | 'Support' | 'Change Password' | 'Logout';

export type ToastType = 'success' | 'info' | 'warn' | 'error';

/** Layout present on every screen after login: top bar, toasts, delete dialog. */
export const CommonLocators = {
  // The side panel's <nav> carries aria-label="Sidepanel", so getByLabel works here.
  sidePanel: by.label('Sidepanel'),
  moduleTitle: by.css('.oxd-topbar-header-breadcrumb-module'),
  levelTitle: by.css('.oxd-topbar-header-breadcrumb-level'),
  userDropdown: by.css('.oxd-userdropdown-tab'),
  userName: by.css('.oxd-userdropdown-name'),
  userMenuItem: (name: UserMenuItem) => by.role('menuitem', { name, exact: true }),
  toast: (message: string) => by.css(`.oxd-toast:has-text(${cssString(message)})`),
  /** Toast of one kind; e.g. "No Records Found" is `info`, a failed request is `error`. */
  toastOfType: (type: ToastType, message: string) => by.css(`.oxd-toast--${type}:has-text(${cssString(message)})`),
  errorToast: by.css('.oxd-toast--error'),
  confirmDialog: by.css('.oxd-dialog-sheet'),
  confirmDeleteButton: by.role('button', { name: 'Yes, Delete' }),
  cancelDeleteButton: by.role('button', { name: 'No, Cancel' }),
} satisfies LocatorMap;

/** Searched INSIDE the side panel, so a menu name never matches a link elsewhere on the page. */
export const SideMenuLocators = {
  searchInput: by.placeholder('Search', { exact: true }),
  items: by.css('.oxd-main-menu-item'),
  link: (name: MenuItem) => by.role('link', { name, exact: true }),
} satisfies LocatorMap;
