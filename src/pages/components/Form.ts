import type { Locator, Page } from '@playwright/test';
import { DropdownLocators, FormLocators, getLocators } from '@locators/index';
import { ElementHelper } from '@utils/helpers/index';

/** Actions on the label-based fields of one form or filter panel (selectors in form.locators.ts). */
export class Form {
  readonly fields;
  private readonly dropdown;
  private readonly page: Page;

  constructor(root: Locator) {
    this.page = root.page();
    this.fields = getLocators(root, FormLocators);
    this.dropdown = getLocators(this.page, DropdownLocators);
  }

  async fill(label: string, value: string): Promise<void> {
    await this.fields.input(label).fill(value);
  }

  /** Custom (non-native) select: open it, then pick the option from the listbox. */
  async select(label: string, option: string): Promise<void> {
    await this.fields.selectTrigger(label).click();
    await this.dropdown.option(option).click();
  }

  async options(label: string): Promise<string[]> {
    await this.fields.selectTrigger(label).click();
    await this.dropdown.listbox.waitFor();
    const options = await ElementHelper.getTexts(this.dropdown.options);
    await this.page.keyboard.press('Escape');
    return options;
  }
}
