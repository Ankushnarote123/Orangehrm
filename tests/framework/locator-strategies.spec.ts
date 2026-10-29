import { test, expect } from '@playwright/test';
import { by, getLocator, getLocators, xpathString, type LocatorMap } from '@locators/LocatorHelper';

/**
 * Verifies the locator utility itself against static HTML, so every strategy
 * is covered even where the live app offers no matching hook (OrangeHRM has
 * no data-testid attributes, for example). Needs no server or session.
 */
const FIXTURE = `
  <main>
    <h1 class="title">Employees</h1>
    <nav aria-label="Primary"><a href="#">Home</a></nav>
    <label for="name">Full name</label><input id="name" placeholder="Type a name">
    <button data-testid="save-btn">Save</button>
    <p>Quote "inside" and it's fine</p>
    <ul><li class="row">One</li><li class="row">Two</li></ul>
  </main>`;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Locator utility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(FIXTURE);
  });

  test('resolves every supported strategy', { tag: '@regression' }, async ({ page }) => {
    await expect(getLocator(page, by.css('h1.title'))).toHaveText('Employees');
    await expect(getLocator(page, by.xpath('//ul/li[2]'))).toHaveText('Two');
    await expect(getLocator(page, by.role('button', { name: 'Save' }))).toBeVisible();
    await expect(getLocator(page, by.label('Full name'))).toHaveAttribute('id', 'name');
    await expect(getLocator(page, by.label('Primary'))).toHaveJSProperty('tagName', 'NAV');
    await expect(getLocator(page, by.placeholder('Type a name'))).toBeEditable();
    await expect(getLocator(page, by.text('Employees', { exact: true }))).toHaveCount(1);
    await expect(getLocator(page, by.testId('save-btn'))).toHaveText('Save');
  });

  test('resolves relative to a parent locator', { tag: '@regression' }, async ({ page }) => {
    const list = page.locator('ul');
    await expect(getLocator(list, by.css('.row'))).toHaveCount(2);
    await expect(getLocator(list, by.role('button'))).toHaveCount(0);
  });

  test('getLocators turns definitions into locators and templates into factories', { tag: '@regression' }, async ({
    page,
  }) => {
    const map = {
      heading: by.css('h1'),
      rowByText: (text: string) => by.css(`li.row:text-is("${text}")`),
    } satisfies LocatorMap;

    const elements = getLocators(page, map);

    await expect(elements.heading).toHaveText('Employees');
    await expect(elements.rowByText('One')).toHaveCount(1);
    await expect(elements.rowByText('Missing')).toHaveCount(0);
  });

  test('xpathString quotes values containing either quote type', { tag: '@regression' }, async ({ page }) => {
    const text = `Quote "inside" and it's fine`;
    await expect(getLocator(page, by.xpath(`//p[normalize-space()=${xpathString(text)}]`))).toHaveCount(1);
  });
});
