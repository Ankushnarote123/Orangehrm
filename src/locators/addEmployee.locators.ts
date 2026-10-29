import { by, xpathString, type LocatorMap } from './LocatorHelper';

/** XPath for the input of an `.oxd-input-group` found by its label (OrangeHRM labels are not linked to inputs). */
const inputByLabelXPath = (label: string) =>
  `//label[normalize-space()=${xpathString(label)}]` +
  `/ancestor::div[contains(concat(" ", normalize-space(@class), " "), " oxd-input-group ")][1]//input`;

/** Employee creation form: PIM > Add Employee, /pim/addEmployee */
export const AddEmployeeLocators = {
  heading: by.role('heading', { name: 'Add Employee' }),
  form: by.css('form.oxd-form'),
  firstNameInput: by.placeholder('First Name'),
  middleNameInput: by.placeholder('Middle Name'),
  lastNameInput: by.placeholder('Last Name'),
  employeeIdInput: by.xpath(inputByLabelXPath('Employee Id')),
  saveButton: by.role('button', { name: 'Save' }),
  cancelButton: by.role('button', { name: 'Cancel' }),
  /** Rendered on the profile page the app redirects to after a successful save. */
  savedProfileName: by.css('.orangehrm-edit-employee-name'),
} satisfies LocatorMap;
