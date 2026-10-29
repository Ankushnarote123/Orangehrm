import { expect, type Locator } from '@playwright/test';

/** Element-level helpers built on Playwright's auto-waiting (no fixed sleeps). */
export class ElementHelper {
  /** Visible text of every element the locator matches, trimmed. Uses innerText, so hidden text is excluded. */
  static async getTexts(locator: Locator): Promise<string[]> {
    return (await locator.allInnerTexts()).map((text) => text.trim());
  }

  /**
   * Waits until an input has a non-empty value and returns it. For fields the
   * app fills asynchronously, e.g. the generated Employee Id or a form loaded from the API.
   */
  static async waitForValue(locator: Locator): Promise<string> {
    await expect(locator).not.toHaveValue('');
    return locator.inputValue();
  }

  /**
   * Fills an input and confirms the value stuck. Guards against apps that
   * re-render a field and overwrite what was typed.
   */
  static async fillAndVerify(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }

  /** True if at least one element matches right now. Does not wait; use assertions to wait. */
  static async isPresent(locator: Locator): Promise<boolean> {
    return (await locator.count()) > 0;
  }

  /** Reads an attribute, failing clearly if it is missing. */
  static async getRequiredAttribute(locator: Locator, name: string): Promise<string> {
    const value = await locator.getAttribute(name);
    if (value === null) throw new Error(`Attribute "${name}" is missing on ${locator}`);
    return value;
  }
}
