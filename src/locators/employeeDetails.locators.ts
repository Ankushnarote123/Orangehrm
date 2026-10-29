import { by, type LocatorMap } from './LocatorHelper';

/** Employee profile, Personal Details tab: /pim/viewPersonalDetails/empNumber/{n} */
export const EmployeeDetailsLocators = {
  profileName: by.css('.orangehrm-edit-employee-name'),
  personalDetailsHeading: by.role('heading', { name: 'Personal Details' }),
  // The page has two forms (Personal Details, Custom Fields), each with its own
  // "Save" button; XPath anchors on the section heading to pick the right one.
  personalDetailsForm: by.xpath('//h6[normalize-space()="Personal Details"]/following::form[1]'),
  personalDetailsSaveButton: by.xpath(
    '//h6[normalize-space()="Personal Details"]/following::form[1]//button[@type="submit"]',
  ),
  firstNameInput: by.placeholder('First Name'),
  middleNameInput: by.placeholder('Middle Name'),
  lastNameInput: by.placeholder('Last Name'),
} satisfies LocatorMap;
