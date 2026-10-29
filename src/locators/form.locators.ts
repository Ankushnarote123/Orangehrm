import { by, cssString, type LocatorMap } from './LocatorHelper';

/**
 * Form fields, found by their visible label. OrangeHRM's <label>s are not
 * linked to their inputs (no for/id), so getByLabel cannot find them. These
 * are searched INSIDE a form or filter panel, so the same label elsewhere
 * never matches.
 */
export const FormLocators = {
  input: (label: string) => by.css(`.oxd-input-group:has(label:text-is(${cssString(label)})) input`),
  error: (label: string) =>
    by.css(`.oxd-input-group:has(label:text-is(${cssString(label)})) .oxd-input-field-error-message`),
  selectTrigger: (label: string) =>
    by.css(`.oxd-input-group:has(label:text-is(${cssString(label)})) .oxd-select-text`),
  selectedValue: (label: string) =>
    by.css(`.oxd-input-group:has(label:text-is(${cssString(label)})) .oxd-select-text-input`),
} satisfies LocatorMap;

/** Options of an open custom dropdown; only one is open at a time, so these are page-wide. */
export const DropdownLocators = {
  listbox: by.role('listbox'),
  options: by.role('option'),
  option: (name: string) => by.role('option', { name, exact: true }),
} satisfies LocatorMap;
