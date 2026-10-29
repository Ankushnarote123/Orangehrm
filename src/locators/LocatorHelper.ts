import type { Locator, Page } from '@playwright/test';

/**
 * Reusable locator helper.
 *
 * Locator files (e.g. login.locators.ts) describe elements as plain data:
 * a strategy plus a selector. Page classes turn those descriptions into real
 * Playwright Locators with `getLocator()` / `getLocators()`.
 *
 *   login.locators.ts   usernameInput: by.placeholder('Username')
 *   LoginPage.ts        getLocators(page, LoginLocators).usernameInput.fill('Admin')
 *   login.spec.ts       await loginPage.login('Admin', 'admin123')
 */

/**
 * Supported strategies. Accessible ones (role, label, placeholder, text,
 * testId) are preferred; css and xpath are for elements with no accessible handle.
 */
export type LocatorStrategy = 'css' | 'xpath' | 'role' | 'label' | 'placeholder' | 'text' | 'testId';

type AriaRole = Parameters<Page['getByRole']>[0];
type RoleOptions = Parameters<Page['getByRole']>[1];
type TextOptions = { exact?: boolean };

/** How to find one element. Plain data with no browser state, so it is safe to share. */
export type LocatorDefinition =
  | { strategy: 'css' | 'xpath' | 'testId'; selector: string }
  | { strategy: 'role'; selector: AriaRole; options?: RoleOptions }
  | { strategy: 'label' | 'placeholder' | 'text'; selector: string | RegExp; options?: TextOptions };

/** A fixed definition, or a function building one from a runtime value (a label, a message, a row id...). */
export type LocatorEntry = LocatorDefinition | ((...args: never[]) => LocatorDefinition);
export type LocatorMap = Record<string, LocatorEntry>;

/** A locator map turned into live Locators: definitions become Locators, functions become Locator factories. */
export type ResolvedLocators<M extends LocatorMap> = {
  readonly [K in keyof M]: M[K] extends (...args: infer A) => LocatorDefinition ? (...args: A) => Locator : Locator;
};

export type LocatorScope = Page | Locator;

/** Short builders used in the locator files, e.g. `by.role('button', { name: 'Save' })`. */
export const by = {
  css: (selector: string): LocatorDefinition => ({ strategy: 'css', selector }),
  xpath: (selector: string): LocatorDefinition => ({ strategy: 'xpath', selector }),
  role: (role: AriaRole, options?: RoleOptions): LocatorDefinition => ({ strategy: 'role', selector: role, options }),
  label: (text: string | RegExp, options?: TextOptions): LocatorDefinition => ({ strategy: 'label', selector: text, options }),
  placeholder: (text: string | RegExp, options?: TextOptions): LocatorDefinition => ({ strategy: 'placeholder', selector: text, options }),
  text: (text: string | RegExp, options?: TextOptions): LocatorDefinition => ({ strategy: 'text', selector: text, options }),
  testId: (id: string): LocatorDefinition => ({ strategy: 'testId', selector: id }),
};

/**
 * THE reusable dynamic method: turns one definition into a Playwright Locator
 * inside `scope` (the page, or a parent element to search within).
 */
export function getLocator(scope: LocatorScope, definition: LocatorDefinition): Locator {
  switch (definition.strategy) {
    case 'css':
      return scope.locator(definition.selector);
    case 'xpath':
      return scope.locator(`xpath=${definition.selector}`);
    case 'role':
      return scope.getByRole(definition.selector, definition.options);
    case 'label':
      return scope.getByLabel(definition.selector, definition.options);
    case 'placeholder':
      return scope.getByPlaceholder(definition.selector, definition.options);
    case 'text':
      return scope.getByText(definition.selector, definition.options);
    case 'testId':
      return scope.getByTestId(definition.selector);
  }
}

/**
 * Applies `getLocator()` to every entry of a locator file at once. Locators
 * are lazy, so this queries nothing until a test acts on one.
 */
export function getLocators<M extends LocatorMap>(scope: LocatorScope, map: M): ResolvedLocators<M> {
  const resolved = Object.entries(map).map(([key, entry]) => [
    key,
    typeof entry === 'function'
      ? (...args: never[]) => getLocator(scope, entry(...args))
      : getLocator(scope, entry),
  ]);
  return Object.fromEntries(resolved) as ResolvedLocators<M>;
}

/** Quotes a value for Playwright CSS pseudo-classes such as `:text-is()` / `:has-text()`. */
export const cssString = (value: string): string => JSON.stringify(value);

/** Quotes a value as an XPath string literal (handles both quote types). */
export function xpathString(value: string): string {
  if (!value.includes('"')) return `"${value}"`;
  if (!value.includes("'")) return `'${value}'`;
  return `concat("${value.split('"').join(`", '"', "`)}")`;
}
