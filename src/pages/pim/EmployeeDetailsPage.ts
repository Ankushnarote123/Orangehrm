import type { Locator, Response } from '@playwright/test';
import { BasePage } from '../BasePage';
import { Form } from '../components/Form';
import { EmployeeDetailsLocators, getLocators } from '@locators/index';
import { BrowserHelper, ElementHelper } from '@utils/helpers/index';
import { ROUTES } from '@utils/routes';
import type { EmployeeData } from '@utils/dataFactory';

/** The "Personal Details" tab of an employee profile. */
export class EmployeeDetailsPage extends BasePage {
  static readonly locators = EmployeeDetailsLocators;

  /** Set per employee by `gotoEmployee()`. */
  protected path: string = ROUTES.employeeList;
  readonly elements = getLocators(this.page, EmployeeDetailsLocators);
  readonly personalDetails = new Form(this.elements.personalDetailsForm);

  get employeeIdInput(): Locator {
    return this.personalDetails.fields.input('Employee Id');
  }

  async gotoEmployee(empNumber: number): Promise<void> {
    this.path = ROUTES.employeeDetails(empNumber);
    await this.goto();
  }

  /**
   * The form is filled in after the page loads. Editing earlier gets
   * overwritten, so wait until the stored Employee Id is shown.
   */
  async waitForLoaded(): Promise<void> {
    await ElementHelper.waitForValue(this.employeeIdInput);
  }

  /** Edits the name fields, saves Personal Details and returns the update API response. */
  async updateName(name: Partial<Pick<EmployeeData, 'firstName' | 'middleName' | 'lastName'>>): Promise<Response> {
    await this.waitForLoaded();
    if (name.firstName !== undefined) await ElementHelper.fillAndVerify(this.elements.firstNameInput, name.firstName);
    if (name.middleName !== undefined) await ElementHelper.fillAndVerify(this.elements.middleNameInput, name.middleName);
    if (name.lastName !== undefined) await ElementHelper.fillAndVerify(this.elements.lastNameInput, name.lastName);
    return BrowserHelper.performAndWaitForResponse(this.page, () => this.elements.personalDetailsSaveButton.click(), {
      path: '/personal-details',
      method: 'PUT',
    });
  }
}
