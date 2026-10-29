import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import { Form } from '../components/Form';
import { AddEmployeeLocators, getLocators } from '@locators/index';
import { ElementHelper } from '@utils/helpers/index';
import { ROUTES } from '@utils/routes';
import type { EmployeeData } from '@utils/dataFactory';

const PROFILE_URL = /\/pim\/viewPersonalDetails\/empNumber\/(\d+)/;

export interface SavedEmployee {
  /** Internal database key used in profile URLs and the REST API. */
  empNumber: number;
}

/** Employee creation form (PIM > Add Employee). */
export class AddEmployeePage extends BasePage {
  static readonly locators = AddEmployeeLocators;

  protected readonly path = ROUTES.addEmployee;
  readonly elements = getLocators(this.page, AddEmployeeLocators);
  readonly form = new Form(this.elements.form);

  /**
   * The app fills "Employee Id" with the next free id asynchronously; typing
   * before that lets the app overwrite our input. Returns the generated id.
   */
  async waitForGeneratedEmployeeId(): Promise<string> {
    return ElementHelper.waitForValue(this.elements.employeeIdInput);
  }

  /** Fills the names, and the Employee Id only when given (otherwise the generated one is kept). */
  async fillEmployee(data: EmployeeData): Promise<void> {
    await this.waitForGeneratedEmployeeId();
    await ElementHelper.fillAndVerify(this.elements.firstNameInput, data.firstName);
    await ElementHelper.fillAndVerify(this.elements.middleNameInput, data.middleName ?? '');
    await ElementHelper.fillAndVerify(this.elements.lastNameInput, data.lastName);
    if (data.employeeId) {
      await ElementHelper.fillAndVerify(this.elements.employeeIdInput, data.employeeId);
    }
  }

  /**
   * Saves and waits for the redirect to the new profile. The redirect URL
   * carries the new record's `empNumber`, so the caller can clean up exactly
   * the record it created. (The create response body can't be used: the
   * browser discards it when the app navigates away.)
   */
  async save(): Promise<SavedEmployee> {
    await this.elements.saveButton.click();

    // Either the profile opens, or validation (e.g. a duplicate generated id) blocks the save.
    const idError = this.form.fields.error('Employee Id');
    await expect(this.elements.savedProfileName.or(idError)).toBeVisible();
    await expect(idError, 'Save was rejected by Employee Id validation').toBeHidden();
    await this.page.waitForURL(PROFILE_URL);

    return { empNumber: Number(PROFILE_URL.exec(this.page.url())![1]) };
  }
}
