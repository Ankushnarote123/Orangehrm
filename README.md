# OrangeHRM Playwright Automation

End-to-end test automation for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com/) (OrangeHRM OS 5.9), built with **Playwright Test** and **TypeScript** using the **Page Object Model**.

## Assessment objective

Build a maintainable, runnable UI automation framework that:

- models the application with page objects whose locators are defined in **static locator maps**, using a **reusable locator utility** that supports CSS, XPath, `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText` and `getByTestId`;
- automates the complete **employee CRUD workflow**: create, capture the generated Employee Id, search, update, verify, delete, and verify the deletion;
- runs **cross-browser** (Chromium, Firefox, WebKit) in parallel, with **smoke and regression** tags;
- produces **HTML and JUnit reports** and runs in **GitHub Actions**.

## Technology stack

| Concern | Choice |
| --- | --- |
| Test runner | Playwright Test `^1.64` |
| Language | TypeScript (strict mode, path aliases), type-checked with `tsc` |
| Design pattern | Page Object Model with static locator maps, shared components and custom fixtures |
| Browsers | Chromium, Firefox, WebKit |
| Test data | Generated at runtime (`src/utils/dataFactory.ts`) plus JSON files in `test-data/` |
| Data setup and cleanup | OrangeHRM's REST API, authenticated through the browser session |
| Reporting | **Allure 3** report (generated after every run), Playwright HTML report, JUnit XML, list output; screenshots, videos and traces on failure; run summary and Slack/Teams failure alerts |
| Accessibility | axe-core (`@axe-core/playwright`), WCAG 2.1 AA with a known-issues baseline |
| CI | GitHub Actions, one matrix job per browser |

## Prerequisites

- Node.js **20 or newer** (CI uses Node 24 LTS) and npm
- Network access to `https://opensource-demo.orangehrmlive.com`
- On Linux, the browsers' system libraries. `npm run install:browsers` installs them with `--with-deps`.

## Installation

```bash
git clone <your-repo-url> && cd <repo>
npm ci                                          # exact versions from package-lock.json
npx playwright install chromium firefox webkit  # browsers only
# or, on Linux / CI, browsers plus their OS dependencies:
npm run install:browsers
```

## Project structure: three layers

The framework is split into three folders, and each one has one job:

```
src/locators/  WHERE elements are   selectors only, one file per screen, plus the getLocator() helper
     ↓ used by
src/pages/     WHAT you can do      page classes with actions: login(), searchByEmployeeId(), updateName()
     ↓ used by
tests/         WHAT must be true    test cases: call page actions, then assert
```

Selector strings appear **only** in `src/locators/`. Page classes and tests never contain a CSS selector, an XPath or a `getBy…` call.

```
.
├── .github/workflows/playwright.yml   # CI: type check + tests per browser, report artifacts
├── src/
│   ├── locators/                      # 1. LOCATORS: one file per screen
│   │   ├── LocatorHelper.ts           #    by.* builders + getLocator()/getLocators() (the reusable method)
│   │   ├── common.locators.ts         #    top bar, side menu, toasts, delete dialog (every screen)
│   │   ├── login.locators.ts          #    Login screen
│   │   ├── dashboard.locators.ts      #    Dashboard
│   │   ├── pim.locators.ts            #    PIM > Employee List
│   │   ├── addEmployee.locators.ts    #    PIM > Add Employee (employee creation form)
│   │   ├── employeeDetails.locators.ts #   Employee profile > Personal Details
│   │   ├── systemUsers.locators.ts    #    Admin > Users
│   │   ├── form.locators.ts           #    label-based form fields, dropdown options
│   │   ├── table.locators.ts          #    results grid and its rows
│   │   └── index.ts
│   ├── pages/                         # 2. PAGES: actions, no selectors
│   │   ├── BasePage.ts                #    shared actions: navigateTo(), logout(), confirmDelete()
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── pim/
│   │   │   ├── PIMPage.ts             #    search, open, delete employees
│   │   │   ├── AddEmployeePage.ts     #    fill and save the creation form
│   │   │   └── EmployeeDetailsPage.ts #    update Personal Details
│   │   ├── admin/SystemUsersPage.ts
│   │   ├── components/
│   │   │   ├── Form.ts                #    fill/select fields by label
│   │   │   └── DataTable.ts           #    read cells by column name
│   │   └── index.ts
│   ├── fixtures/test.ts               # gives each test its page objects and test data
│   └── utils/                         # REUSABLE HELPERS AND SUPPORT CODE
│       ├── helpers/                   #    reusable methods for pages and tests (see "Reusable helpers")
│       │   ├── BrowserHelper.ts       #      network waits, navigation, session
│       │   ├── ElementHelper.ts       #      element text, values, safe fill
│       │   ├── CommonHelper.ts        #      unique ids, random strings, record counts
│       │   ├── VerificationHelper.ts  #      grouped assertions (toasts, responses, empty search)
│       │   ├── AccessibilityHelper.ts #      axe-core WCAG scans with a baseline
│       │   └── index.ts
│       ├── reporters/
│       │   ├── FailureAlertReporter.ts #     report sender: run summary + Slack/Teams failure alerts
│       │   └── AllureReportGenerator.ts #    builds the Allure report after every run
│       ├── env.ts                     #    environment configuration
│       ├── routes.ts                  #    app routes and API endpoints
│       ├── dataFactory.ts             #    unique employee test data
│       └── EmployeeApi.ts             #    REST client for test-data setup and cleanup
├── tests/                             # 3. TESTS: actions + assertions
│   ├── auth.setup.ts                  #    logs in once and saves the session
│   ├── employee-crud.spec.ts          #    full employee lifecycle (@regression)
│   ├── auth/login.spec.ts
│   ├── dashboard/dashboard.spec.ts
│   ├── navigation/side-menu.spec.ts
│   ├── pim/add-employee.spec.ts
│   ├── pim/employee-search.spec.ts
│   ├── pim/search-failure.spec.ts     #    proves a failed search is never taken as "no results"
│   ├── admin/system-users.spec.ts
│   ├── accessibility/accessibility.spec.ts # WCAG 2.1 AA scans of the main screens
│   ├── api/                           #    REST API tests, no browser ("api" project)
│   │   └── employee-crud.api.spec.ts  #      employee create/read/update/delete + validation
│   ├── security/                      #    security tests ("security" project)
│   │   ├── authentication.security.spec.ts      # 401 without session, redirects, logout, enumeration, CSRF token
│   │   ├── transport-and-headers.security.spec.ts # cookie flags, HSTS/nosniff/CSP, known findings
│   │   └── input-validation.security.spec.ts    # script injection, SQL-style input, error leakage
│   └── framework/                     #    tests OF the framework itself (not app tests)
│       ├── locator-strategies.spec.ts #    getLocator() works for every strategy
│       ├── selector-health.spec.ts    #    every locator-file entry matches the live UI
│       └── helpers.spec.ts            #    every helper and the alert message
├── test-data/                         # login.json, navigation.json, admin.json, accessibility-baseline.json
├── playwright.config.ts
├── allurerc.mjs                       # Allure report settings (name, single file, history)
├── tsconfig.json
├── .env.example
├── README.md
```

### Example: one feature through all three layers

```ts
// 1. src/locators/login.locators.ts  (where the elements are)
export const LoginLocators = {
  usernameInput: by.placeholder('Username'),
  passwordInput: by.placeholder('Password'),
  loginButton: by.role('button', { name: 'Login' }),
} satisfies LocatorMap;

// 2. src/pages/LoginPage.ts  (what you can do)
export class LoginPage extends BasePage {
  readonly elements = getLocators(this.page, LoginLocators); // descriptions → real Playwright Locators
  async login(username: string, password: string) {
    await this.elements.usernameInput.fill(username);
    await this.elements.passwordInput.fill(password);
    await this.elements.loginButton.click();
  }
}

// 3. tests/auth/login.spec.ts  (what must be true)
test('admin can log in with valid credentials', { tag: '@smoke' }, async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login('Admin', 'admin123');
  await expect(page).toHaveURL(/dashboard/);
});
```

### Adding a new screen

1. Create `src/locators/<screen>.locators.ts` exporting `<Screen>Locators = { ... } satisfies LocatorMap`, and export it from `src/locators/index.ts`.
2. Create `src/pages/<Screen>Page.ts` extending `BasePage`. Add `readonly elements = getLocators(this.page, <Screen>Locators)` and one method per user action.
3. Register the page as a fixture in `src/fixtures/test.ts`.
4. Write tests in `tests/<area>/`. Import `test` and `expect` from `@fixtures/test`, call page methods, assert, and add `{ tag: '@smoke' }` or `{ tag: '@regression' }`.
5. Add the new fixed entries to `tests/framework/selector-health.spec.ts`.

## Environment configuration

Every setting is optional. Set it as an environment variable or in a local `.env` file; copy `.env.example` to start.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `https://opensource-demo.orangehrmlive.com` | Application under test |
| `ADMIN_USERNAME` | `Admin` | Login user (public demo credentials) |
| `ADMIN_PASSWORD` | `admin123` | Login password |
| `WORKERS` | `2` | Parallel workers: a number, or a percentage of CPU cores such as `50%` |
| `RETRIES` | `2` | How many times a failed test is retried, locally and on CI. `0` turns retries off |
| `HEADED` | `false` | `true` shows the browser (same as `--headed`) |
| `SLOW_MO` | `0` | Milliseconds to pause between browser actions, so a headed run can be followed by eye |
| `ALERT_WEBHOOK_URL` | unset | Slack/Teams incoming webhook; posts an alert when tests fail or are flaky |
| `ALLURE_GENERATE` | `true` | `false` skips building the Allure report after a run |
| `CI` | unset | Set by GitHub Actions; enables CI retries and `forbidOnly` |

Unset or empty values fall back to the defaults. `src/utils/env.ts` uses `||`, so the empty strings GitHub Actions passes for missing variables also count as unset.

## Commands

All commands below are defined in `package.json`.

| Command | What it runs |
| --- | --- |
| `npm test` | Everything: UI tests in Chromium, Firefox and WebKit, plus the API and security projects |
| `npm run test:smoke` | Only tests tagged `@smoke` (`--grep @smoke`), in every project |
| `npm run test:regression` | Only tests tagged `@regression` (`--grep @regression`), in every project |
| `npm run test:chromium` | UI tests in Chromium only |
| `npm run test:firefox` | UI tests in Firefox only |
| `npm run test:webkit` | UI tests in WebKit only |
| `npm run test:api` | REST API tests (`tests/api/`), no browser |
| `npm run test:security` | Security tests (`tests/security/`) |
| `npm run test:headless` | All tests, browsers hidden (the default mode, stated explicitly) |
| `npm run test:headed` | All tests with visible browsers |
| `npm run test:headed:chromium` | UI tests in a visible Chromium window |
| `npm run test:failed` | Re-runs **only the tests that failed** in the previous run (`--last-failed`). It needs a previous run that finished; with no record of one, Playwright runs everything |
| `npm run test:debug` | Opens the Playwright Inspector and pauses at each step |
| `npm run report` | Serves the last Playwright HTML report (`playwright-report/`) |
| `npm run allure:open` | Serves the last Allure report in your browser |
| `npm run allure:generate` | Rebuilds the Allure report from `allure-results/` (normally automatic) |
| `npm run typecheck` | `tsc --noEmit` over the whole project |
| `npm run install:browsers` | Installs the three browsers and their OS dependencies |

Extra Playwright arguments go after `--`:

```bash
npm run test:smoke -- --project=chromium        # smoke tests in one browser
npm run test:headed -- tests/employee-crud.spec.ts --project=firefox
npm run test:debug -- tests/employee-crud.spec.ts --project=chromium
npx playwright test -g "finds an employee by name"
WORKERS=4 npm test                               # PowerShell: $env:WORKERS=4; npm test
```

## Reports

Every run produces all of these. No extra command is needed.

| Report | Where | What it's for |
| --- | --- | --- |
| **Allure report** | `allure-report/index.html` | Pass/fail dashboard with steps, errors, failure screenshot, video and trace, environment details, and the trend across runs |
| **Playwright HTML report** | `playwright-report/index.html` (`npm run report`) | Playwright's own report with steps and the built-in trace viewer |
| **JUnit XML** | `test-results/junit.xml` | For CI systems and test-management tools |
| **Run summary** | `test-results/run-summary.json` (+ GitHub job summary) | Totals and failed/flaky tests; source of the Slack/Teams failure alert |
| **Console (list)** | terminal | Live progress while the tests run |

### Failure evidence: screenshots, videos and traces

Configured in `playwright.config.ts` and attached automatically to the **failed** test in both the Allure and the Playwright HTML reports:

| Evidence | Setting | When it's kept |
| --- | --- | --- |
| Screenshot | `screenshot: 'only-on-failure'` | When a test fails |
| Video | `video: 'retain-on-failure'` | When a test fails |
| Trace | `trace: 'retain-on-failure-and-retries'` | When a test fails, and for every retry |

A trace is a full recording of the test: each action with before/after DOM snapshots, network calls, console output and errors. Ways to open it:

- **Allure report:** open the failed test, go to *Attachments*, and select **trace**.
- **Playwright HTML report:** `npm run report`, open the failed test, and click the trace.
- **Directly:** `npx playwright show-trace test-results/<test-folder>/trace.zip`, or drag the zip into [trace.playwright.dev](https://trace.playwright.dev).

### Allure report

[Allure 3](https://allurereport.org/) runs on Node, so it needs **no Java**. It uses two pieces:

- **`allure-playwright`** (a reporter in `playwright.config.ts`) records every test's result, steps, error and attachments into `allure-results/`.
- **`AllureReportGenerator`** (`src/utils/reporters/`) builds the HTML report **automatically at the end of every run**, whether tests passed or failed and whatever command started them. It also clears the previous run's results at the start, so each report shows exactly one run.

The report settings are in `allurerc.mjs`:

- **One self-contained file:** `allure-report/index.html` opens with a double-click, so it's easy to share or attach.
- **Trend across runs:** pass/fail history is kept in `allure-history/` (last 30 runs, local and gitignored).
- **Environment section:** base URL, OS, Node.js version, workers, retries, headed/headless mode, and CI or local.

```bash
npm test                 # any test command; the Allure report is built when it finishes
npm run allure:open      # serve it in your browser (or just open allure-report/index.html)
```

To skip report generation for a quick local run, set `ALLURE_GENERATE=false` (PowerShell: `$env:ALLURE_GENERATE='false'`).

## Headed and headless modes

Tests run **headless** (no visible browser) by default, locally and in CI.

| How | Mode |
| --- | --- |
| `npm test` / `npm run test:headless` | headless |
| `npm run test:headed`, or add `--headed` to any command | headed (browser windows visible) |
| `npm run test:headed:chromium` | headed, Chromium only |
| `HEADED=true` in the environment or `.env` | headed for every command |
| `SLOW_MO=500` together with headed mode | pauses 500 ms between browser actions, so you can follow along |
| `npm run test:debug` | headed and paused, stepping through in the Playwright Inspector |

PowerShell example (one test, headed, slowed down):

```powershell
$env:SLOW_MO=500; npx playwright test tests/employee-crud.spec.ts --project=chromium --headed; Remove-Item Env:SLOW_MO
```

**In CI:** the **Tagged Test Run** workflow has a *mode* choice (`headless` / `headed`). GitHub's Linux runners have no screen, so headed mode runs the browsers inside a virtual display (`xvfb-run`). The recorded videos and traces show the run exactly as it happened. The automatic workflow always runs headless.

## Page Object Model and custom fixtures

**Page objects** (`src/pages`) own every interaction and take their locators from `src/locators`. Specs only call page methods and make assertions.

| Page object | Screen | Main methods |
| --- | --- | --- |
| `LoginPage` | Login | `login()`, `fieldError()` |
| `DashboardPage` | Dashboard | widgets via `elements.widget(title)` |
| `PIMPage` | PIM > Employee List | `searchByEmployeeId()`, `searchByName()`, `rowByEmployeeId()`, `openEmployee()`, `requestDelete()`, `openAddEmployee()` |
| `AddEmployeePage` | PIM > Add Employee | `waitForGeneratedEmployeeId()`, `fillEmployee()`, `save()` (returns the new `empNumber`) |
| `EmployeeDetailsPage` | Employee > Personal Details | `gotoEmployee()`, `waitForLoaded()`, `updateName()` |
| `SystemUsersPage` | Admin > Users | `filterBy()`, `search()`, `reset()` |
| `BasePage` (inherited) | Layout on every page | `navigateTo()`, `searchMenu()`, `logout()`, `confirmDelete()` |

Two components remove duplication between pages. Their selectors are in `form.locators.ts` and `table.locators.ts`.

- `Form` fills and selects fields by their visible label. OrangeHRM labels are not linked to inputs, so `getByLabel` cannot find form fields.
- `DataTable` reads cells by column name and finds rows by an exact cell value.

**Custom fixtures** (`src/fixtures/test.ts`) inject page objects and data into each test:

```ts
test('finds an employee by Employee Id', { tag: '@smoke' }, async ({ pimPage, testEmployee }) => { ... });
```

| Fixture | Provides |
| --- | --- |
| `loginPage`, `dashboardPage`, `pimPage`, `addEmployeePage`, `employeeDetailsPage`, `systemUsersPage` | Page objects bound to the test's own page |
| `employeeApi` | REST client sharing the browser session's cookies |
| `testEmployee` | A unique employee created through the API before the test and deleted after it |
| `employeeCleanup` | `track(employeeId)`: deletes employees the test created through the UI, even if the test fails |

Login runs once in the `setup` project (`tests/auth.setup.ts`), which saves the session to `.auth/admin.json` (gitignored). The browser projects reuse it. Specs that test logging in, `login.spec.ts` and `employee-crud.spec.ts`, start with an empty session instead.

## Locator files and the reusable `getLocator()` method

Each screen has a locator file in `src/locators/` that exports a static map of **locator definitions**. A definition is plain data (strategy, selector and options) with no browser state. When the selector depends on a runtime value, such as a label, a message or a row id, the entry is a small function that builds the definition:

```ts
// src/locators/common.locators.ts
export const CommonLocators = {
  moduleTitle: by.css('.oxd-topbar-header-breadcrumb-module'),                     // fixed
  toast: (message: string) => by.css(`.oxd-toast:has-text(${cssString(message)})`), // dynamic
} satisfies LocatorMap;
```

**The reusable dynamic method** is `getLocator(scope, definition)` in `src/locators/LocatorHelper.ts`. It reads the strategy and calls the matching Playwright API. `scope` is the page, or a parent element to search inside. `getLocators(scope, map)` applies it to a whole locator file at once: fixed entries become `Locator`s and function entries become functions that return `Locator`s.

```ts
const elements = getLocators(page, CommonLocators);
await elements.moduleTitle.click();                          // fixed entry
await expect(elements.toast('Successfully Saved')).toBeVisible(); // dynamic entry
```

- **Two ways in.** Each page class also exposes its map statically (`LoginPage.locators === LoginLocators`), so you can read the definitions without a browser. `loginPage.elements.loginButton` is the live Playwright `Locator` for the current test's page.
- **No shared browser state.** Locator files hold only data. Real `Locator`s are created per page-object instance, and every test has its own page, so nothing leaks between tests or workers.

| Strategy | Builder | Playwright call | Used for (examples) |
| --- | --- | --- | --- |
| `role` | `by.role('button', { name: 'Save' })` | `getByRole` | buttons, headings, alert, menu items, links, options |
| `label` | `by.label('Sidepanel')` | `getByLabel` | side panel `<nav aria-label="Sidepanel">` |
| `placeholder` | `by.placeholder('Username')` | `getByPlaceholder` | login fields, employee name fields |
| `text` | `by.text('Forgot your password?')` | `getByText` | forgot-password link |
| `testId` | `by.testId('save-btn')` | `getByTestId` | supported, but OrangeHRM has no `data-testid` attributes (covered by `locator-strategies.spec.ts`) |
| `css` | `by.css('.oxd-toast:has-text("…")')` | `locator(css)` | toasts, breadcrumb, table, label-based form fields |
| `xpath` | `by.xpath('//h6[normalize-space()="Personal Details"]/following::form[1]//button[@type="submit"]')` | `locator('xpath=…')` | Employee Id input on Add Employee, Personal Details Save button (the page has two "Save" buttons) |

**Order of preference:** role, then label, placeholder or text, then test id, then CSS, then XPath. CSS and XPath are used only where the app exposes no accessible handle, and each such use has a comment explaining why.

**Checking selectors:** `tests/framework/selector-health.spec.ts` resolves every fixed entry of every locator file on the live UI and asserts it matches exactly one element. When OrangeHRM's markup changes, the failure names the broken selector.

## Reusable helpers (`src/utils/helpers`)

These are classes of static methods you can call from pages or tests: `import { ElementHelper } from '@utils/helpers/index'`. None of them uses fixed sleeps; they all rely on Playwright's auto-waiting. `tests/framework/helpers.spec.ts` covers each one.

| Helper | Methods | Used by |
| --- | --- | --- |
| **BrowserHelper**: network, navigation, session | `gotoWithRetry(page, url)`, `waitForPageReady(page, { networkIdle })`, `performAndWaitForPageLoad(page, action)`, `waitForApiResponse(page, matcher)`, `performAndWaitForResponse(page, action, matcher)`, `currentPath`, `clearSession(context)` | `BasePage` (every `goto()`, `navigateTo()`, `logout()`), `PIMPage`, `SystemUsersPage`, `EmployeeDetailsPage`, `AccessibilityHelper` |
| **ElementHelper**: elements | `getTexts(locator)` (visible text only), `waitForValue(locator)`, `fillAndVerify(locator, value)`, `isPresent`, `getRequiredAttribute` | `AddEmployeePage`, `EmployeeDetailsPage`, `DataTable`, `Form` |
| **CommonHelper**: general | `uniqueSuffix()`, `randomString(len)`, `escapeRegExp`, `parseRecordCount("(12) Records Found")`, `recordCountText(n)` | `dataFactory`, tests, other helpers |
| **VerificationHelper**: grouped assertions | `verifyUrlContains`, `verifyToast(page, type, msg)`, `verifyNoErrorToast`, `verifyResponseStatus`, `verifyInvalidParams(response, fields)`, `verifyRecordCount`, `verifyEmployeeSearchResponse`, `verifyNoEmployeeFound` | `employee-crud.spec.ts`, `search-failure.spec.ts`, API and security tests |
| **AccessibilityHelper**: WCAG checks (axe-core) | `scan(page, options)`, `verifyNoNewViolations(page, testInfo, { name, knownRuleIds })`, `attachResults`, `formatViolations` | `tests/accessibility/accessibility.spec.ts` |

`performAndWaitForResponse` is the pattern behind every reliable search and save in the framework. It starts waiting for the API call before triggering it, then returns the response:

```ts
const response = await BrowserHelper.performAndWaitForResponse(page, () => saveButton.click(), {
  path: '/personal-details', method: 'PUT',
});
VerificationHelper.verifyResponseStatus(response, 200, 'update API');
```

### Accessibility checks

`AccessibilityHelper` runs [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.1 AA rules. OrangeHRM already fails some rules on every screen: missing `lang`, icon buttons without names, inputs without labels, and low contrast. These are recorded in `test-data/accessibility-baseline.json`. Each accessibility test:

- attaches the full axe results (JSON) to the HTML report;
- fails only when a rule **not** in the baseline is violated, so the suite catches new problems instead of failing forever on known ones.

When a known issue is fixed, remove its rule from the baseline so it can't come back.

### Report sender and failed-test alerts (`src/utils/reporters/FailureAlertReporter.ts`)

This custom Playwright reporter is registered in `playwright.config.ts` and runs after every test run:

1. It writes `test-results/run-summary.json` with totals, failed tests (with the first line of each error), flaky tests, and the CI run link.
2. In GitHub Actions, it adds the same summary to the job page (`$GITHUB_STEP_SUMMARY`).
3. When tests **failed or were flaky** and `ALERT_WEBHOOK_URL` is set, it posts the summary to that Slack or Microsoft Teams incoming webhook. Without the variable, nothing is sent.

A problem sending the alert is logged and never changes the test result. To enable it in CI, add a repository secret `ALERT_WEBHOOK_URL`.

## Dynamic Employee Id handling

`tests/employee-crud.spec.ts` never hardcodes an id and never relies on existing employees:

1. Names are generated with a unique suffix (`buildEmployeeName()`).
2. `AddEmployeePage.waitForGeneratedEmployeeId()` waits until the app fills in its generated id, then reads it from the UI. The test asserts the id is not empty.
3. `save()` waits for the redirect to the new profile and returns the record's `empNumber` from the URL. The test then asserts that the profile shows the same Employee Id and names.
4. Every later search, the update, the delete and the post-delete check use the **captured** id. The PIM "Employee Id" filter is an exact match on the server, which I verified on the live API: `0312` returns one row and `03` returns none.
5. After the update, the test asserts the Employee Id is unchanged twice: on the profile right after saving, and in the next search results.
6. Rows are located by an exact cell match on the "Id" column (`DataTable.rowsWhere`). The delete response must list only this test's `empNumber`, so no other employee can be updated or deleted.
7. A `try/finally` block deletes the employee through the API if the test fails before its own delete step. It deletes by the captured `empNumber`, so it can never remove someone else's record. Cleanup errors are logged and never replace the original failure.

### Telling a genuine empty result from a failed search

When a list request fails (server error or network failure), OrangeHRM **keeps the table's previous state** and only adds an error toast. After the delete, the table already shows "No Records Found" for this id, so a failed follow-up search would look exactly like a real empty result. Checking the text alone would let a broken search pass.

`VerificationHelper.verifyNoEmployeeFound()` (`src/utils/helpers/VerificationHelper.ts`) therefore checks:

1. The response belongs to **this** search: its URL has `employeeId=<captured id>`. `PIMPage.search()` waits only for a response with its own filter, so a slower, earlier list load can't be mistaken for it. That race was real and was found by this check.
2. The server answered `200` with `meta.total === 0` and `data: []`.
3. Loading finished: no loading spinner.
4. The UI shows "No Records Found", zero rows, and the **info** toast "No Records Found".
5. **No error toast** is shown.

`tests/pim/search-failure.spec.ts` is the negative control. It reproduces the post-deletion state, makes the repeat search fail with a simulated 500, shows that the table still reads "No Records Found", and asserts that `verifyNoEmployeeFound()` rejects it. A second test asserts that the check also rejects a successful search that returns a record.

The other PIM tests get their own employee from the `testEmployee` fixture, which uses a unique, test-chosen id. No two tests share an employee record.

## API tests (`tests/api`)

`employee-crud.api.spec.ts` tests employee CRUD directly against OrangeHRM's REST API, the same API the web UI calls. It runs in the `api` project: plain HTTP using the saved admin session (`adminApi` fixture), with **no browser**, so all 9 tests finish in about 15 seconds.

| Test | Calls | Asserts |
| --- | --- | --- |
| Full lifecycle | `POST /pim/employees` → `GET /pim/employees/{n}` → `GET /pim/employees?employeeId=` → `PUT …/{n}/personal-details` → `GET` → `DELETE /pim/employees` → `GET` again | 200s with exact bodies; the update persisted and the Employee Id is unchanged; delete returns exactly `[empNumber]`; afterwards `GET` is rejected (422), search total is 0, and a second delete is 404 |
| CREATE validation (data-driven) | empty first name, empty last name, first name over 30 characters, Employee Id over 10 characters, duplicate Employee Id | 422 `Invalid Parameter` naming exactly the rejected field |
| UPDATE validation | empty first name | 422, and the stored name is unchanged |
| Missing records | read and delete a non-existent employee | 422 / 404 `Records Not Found` |

Every test creates its own uniquely named employee and deletes it in `finally`. If the API wrongly accepts invalid input, the test deletes that record before failing.

## Security tests (`tests/security`)

These run once, in the `security` project (Chromium), because the server's behaviour (headers, cookies, authentication) doesn't depend on the browser. They're **non-destructive**: one request per check, no brute force or load, harmless marker payloads, and any record created gets deleted.

| File | Checks |
| --- | --- |
| `authentication.security.spec.ts` | All five employee CRUD API calls return **401** without a session; five protected pages **redirect to login**; **logout invalidates the session on the server** (replaying the old cookie → 401) and the session id changes; login errors are the same for an unknown user and a wrong password (**no user enumeration**); the login form has a **per-session CSRF token** |
| `transport-and-headers.security.spec.ts` | Session cookie is **HttpOnly, Secure, SameSite**, and not readable by page JavaScript; pages and API send **HSTS** (≥ 1 year), **`nosniff`** and a **CSP**; API responses aren't cached |
| `input-validation.security.spec.ts` | `<script>`, `onerror` and `onload` payloads in employee names are **rejected** (API) and **not saved** (UI form, no script runs); **SQL injection-style** search input returns no data and no server error; error responses don't **leak internals** (stack traces, SQL, file paths) |

**Known findings on the demo server.** These two tests use `test.fail()`. They assert the secure behaviour, are *expected* to fail today, and show as `x` with a passing result. If the server gets fixed, Playwright reports them as "unexpectedly passed", which tells you to remove the `test.fail()`.

- **No clickjacking protection:** neither `X-Frame-Options` nor CSP `frame-ancestors` is sent.
- **Server version disclosed:** `Server: nginx/1.18.0 (Ubuntu)`.

Also observed, but not tested: the CSP allows `'unsafe-inline'` and `'unsafe-eval'`, which weakens its protection against injected scripts.

## Page loading and network waits

Measured on the demo, `networkidle` (no requests for 500 ms) arrives **about 7 seconds after the page is usable** (login 7.4 s, dashboard 6.9 s). Waiting for it on every navigation would add minutes to the suite and still wouldn't prove the right data had arrived. So the framework uses the most specific wait available:

| Situation | Wait used | Where |
| --- | --- | --- |
| Opening any page | `page.goto(url, { waitUntil: 'load' })`, **retried once on network errors** (connection reset, DNS, navigation timeout); application errors are not retried | `BrowserHelper.gotoWithRetry`, used by every page's `goto()` |
| Clicking a link that loads a new page | the new document's `load` event (works through redirects) | `BrowserHelper.performAndWaitForPageLoad`: side-menu `navigateTo()`, `logout()` |
| Search, save, update, delete | the exact API response the action triggers | `BrowserHelper.performAndWaitForResponse` |
| Form filled in after the page loads | the field has a value | `ElementHelper.waitForValue` |
| Scanning the whole page | `domcontentloaded` → `load` → **`networkidle`** (best effort, 15 s cap) | `BrowserHelper.waitForPageReady({ networkIdle: true })`, used by `AccessibilityHelper.scan` |

Login doesn't wait for a page load: with empty required fields the browser never submits the form, so there's no load to wait for. Tests assert the resulting URL instead.

## Parallel execution and cross-browser configuration

- `fullyParallel: true`: every test, not just every file, can run in parallel.
- The workers default to `2`. The public demo server starts timing out under heavier load. Use `WORKERS` to change it.
- Projects: `setup` runs first. It's followed by the UI projects `chromium`, `firefox` and `webkit`, which skip `tests/api` and `tests/security`, then by `api` (no browser) and `security` (Chromium). Each depends on `setup`.
- **Independence:** each test has its own browser context. Tests that change data use their own uniquely named records. The saved session is read-only. Nothing depends on test order.
- **Timeouts:** 90 s per test, 15 s per action and assertion, 30 s for navigation and for loading list pages.
- **Retries:** a failed test is retried **twice** (3 attempts in total), locally and on CI. A test that passes only on a retry is reported as **flaky**, not as a clean pass, in the console, the HTML report, the Allure report (*Retries* tab) and the failure alert. Each attempt keeps its own screenshot, video and trace. Set `RETRIES=0` to turn retries off, e.g. while debugging.
- **Diagnostics:** screenshots on failure; traces kept for failed and retried runs (`retain-on-failure-and-retries`); video kept on failure.

## Tags: smoke and regression

Tags use Playwright's `tag` option, so they are not part of the test title, and each test has exactly one tag:

```ts
test('admin can create, find, update and delete an employee', { tag: '@regression' }, async (...) => { ... });
```

- `@smoke` (4 tests per browser): valid login, create employee, find employee by id, find employee by name.
- `@regression` (all other tests): the full CRUD lifecycle, validation, negative cases, navigation, admin, accessibility, the locator checks, and all API and security tests.

Smoke and regression together cover the whole suite with no overlap: 12 + 216 tests, plus `setup`, is 229, the same as `npx playwright test --list`. That's 195 UI tests (65 × 3 browsers), 9 API tests and 24 security tests. The `setup` project always runs, because `--grep` is not applied to dependency projects.

## CI/CD workflow

`.github/workflows/playwright.yml` runs on **every push to any branch**, on **pull requests into `main`**, and manually with *Run workflow* in the Actions tab. If you push again to the same branch while a run is still going, the older run is cancelled.

- A matrix runs one job per project: `chromium`, `firefox`, `webkit`, `api` and `security`, with `fail-fast: false`. Every job also installs Chromium, because the login `setup` project (which runs before every project) uses Chromium.
- Steps: checkout (without persisting credentials), Node 24 LTS with an npm cache, `npm ci`, `npm run typecheck`, `npx playwright install --with-deps <browser>`, then `npx playwright test --project=<project>`.
- Artifacts are uploaded even when tests fail:
  - **`allure-report-combined`**: **one Allure report with the pass/fail results of all five projects**, built by the final *Allure report (all projects)* job. Its totals also appear on the run's summary page.
  - `allure-report-<project>`: that project's Allure report
  - `playwright-report-<project>`: the Playwright HTML report
  - `junit-<project>`: `junit.xml`
  - `test-results-<project>`: traces, screenshots and videos (only when a test failed)
  - `allure-results-<project>`: raw Allure results (inputs for the combined report)

  Each name includes the project, so the matrix jobs never overwrite each other's artifacts.
- **Security:** `permissions: contents: read`. No secret is required, because the defaults are the public demo credentials. Optional `BASE_URL` (repository variable) and `ADMIN_USERNAME`/`ADMIN_PASSWORD` (repository secrets) are read from the environment, never printed, and masked by Actions if they are printed.

### Running by tag: `tagged-tests.yml`

A second workflow, **Tagged Test Run**, runs only the tests you choose. It never starts automatically.

1. Open the repository's **Actions** tab and select **Tagged Test Run** in the left sidebar.
2. Click **Run workflow**, pick the branch, and choose:
   - **tag:** `@smoke`, `@regression` or `all`
   - **projects:** `all` (3 browsers + api + security), `ui-browsers` (3 browsers), or one of `chromium`, `firefox`, `webkit`, `api`, `security`
   - **mode:** `headless` (default) or `headed` (browsers run in a virtual display)
3. Click **Run workflow**. A short *Plan* job turns your choices into one parallel job per project. Each job is named after the tag and project, e.g. `smoke (firefox)`. A final job merges them into one Allure report, `allure-report-<tag>-combined`.

| You choose | Jobs that run |
| --- | --- |
| `@smoke` + `all` | smoke on chromium, firefox, webkit, api, security (5 jobs) |
| `@regression` + `ui-browsers` | regression on chromium, firefox, webkit (3 jobs) |
| `all` + `api` | every API test (1 job) |

- A project with no tests for the chosen tag, such as `@smoke` on `api`, **passes** with "no tests" (`--pass-with-no-tests`) rather than failing.
- Artifact names include the tag and the project (`playwright-report-smoke-webkit`, `junit-regression-api`, …), so runs never overwrite each other.
- Inputs are checked against an allow-list before use, and are never inserted directly into a shell command.

From the command line (GitHub CLI): `gh workflow run tagged-tests.yml -f tag=@smoke -f projects=all -f mode=headed`.

### Viewing results

1. Open the repository's **Actions** tab and select the run. The run summary page shows each job's status, the pass/fail/flaky totals, and the Allure totals.
2. **Pass/fail results:** under **Artifacts**, download **`allure-report-combined`** (or `allure-report-<tag>-combined` for a tagged run), unzip it, and open `index.html`. It's a single self-contained file covering every project.
3. **A failed test:** in the Allure report, open the test to see the error, the failure screenshot, the video and the trace (*Attachments* → **trace**).
4. Playwright's own report: download `playwright-report-<project>`, unzip it, and run `npx playwright show-report <unzipped-folder>`. Its trace viewer only works when the report is served this way.
5. Raw evidence: download `test-results-<project>` and open a trace with `npx playwright show-trace <test-folder>/trace.zip`, or drag the zip into [trace.playwright.dev](https://trace.playwright.dev).

## Requirement-to-assertion traceability

| # | Requirement | Where | Assertion(s) |
| --- | --- | --- | --- |
| 1 | Log in as the demo administrator | `employee-crud.spec.ts` step 1; `login.spec.ts` | `toHaveURL(/dashboard\/index/)`; module title `toHaveText('Dashboard')`; error alert `toHaveCount(0)` |
| 2 | Navigate to PIM > Add Employee | `employee-crud.spec.ts` step 2 | `Employee Information` and `Add Employee` headings `toBeVisible()` |
| 3 | Generate unique employee data programmatically | `buildEmployeeName()` (`dataFactory.ts`) | Unique suffix per call; used by every create |
| 4 | Create the employee | step 3-5; `add-employee.spec.ts` | Redirect to the profile; `empNumber > 0`; first, middle and last name `toHaveValue(...)`; toast `Successfully Saved` |
| 5 | Capture the generated Employee Id and assert it is not empty | step 3-5 | `expect(generatedId.trim()).not.toBe('')`; profile Employee Id `toHaveValue(generatedId)` |
| 6 | Search by the captured Employee Id | step 6-7 | Response: `employeeId=<id>`, status 200, `meta.total` 1; `toHaveText('(1) Record Found')` |
| 7 | The correct employee is returned | step 6-7 | Row with exact Id `toHaveCount(1)`; Id, name and last-name cells `toHaveText(...)` |
| 8 | Update an editable field (first name) | step 8 | Update API status 200; **success** toast `Successfully Updated`; input `toHaveValue(updatedFirstName)` |
| 8a | Employee Id unchanged after the update | step 8 and step 9 | Profile Employee Id `toHaveValue(employeeId)`; search Id cell `toHaveText(employeeId)` |
| 9 | Search again: updated details, same Employee Id | step 9 | Response total 1 and `data[0]` matches `{ employeeId, firstName: updated, lastName }`; UI cells `toHaveText(...)` |
| 10 | Delete only this test's employee | step 10 | Dialog `toContainText('…permanently deleted')`; delete API 200 with `data` `toEqual([empNumber])`; **success** toast; dialog hidden |
| 11 | Search again by the same id, after loading finishes | step 11-12 | Response URL `employeeId=<id>`; loading spinner `toHaveCount(0)` |
| 12 | No matching record, and not a failure | step 11-12, `VerificationHelper.verifyNoEmployeeFound()` | Status 200, `meta.total` 0, `data` `[]`; `No Records Found`; rows `toHaveCount(0)`; **info** toast visible; **error** toast `toHaveCount(0)`; API `findByEmployeeId` `toEqual([])` |
| 12a | A failed search is not mistaken for an empty result | `search-failure.spec.ts` | With a simulated 500 the UI still shows "No Records Found", yet `verifyNoEmployeeFound()` rejects it (`rejects.toThrow`) |
| - | Employee CRUD works through the REST API | `tests/api/employee-crud.api.spec.ts` | Status codes and bodies for POST/GET/PUT/DELETE; Employee Id unchanged after update; 422/404 after delete |
| - | API rejects invalid employee data | `tests/api/employee-crud.api.spec.ts` | `verifyInvalidParams()`: 422 + exact rejected field (`firstName`, `lastName`, `employeeId`) |
| - | No access without a session | `tests/security/authentication.security.spec.ts` | 5 API calls → 401; 5 pages → redirect to login |
| - | Logout really ends the session | `tests/security/authentication.security.spec.ts` | Replayed pre-logout cookie → 401; new session id after logout |
| - | Session cookie and headers are hardened | `tests/security/transport-and-headers.security.spec.ts` | HttpOnly/Secure/SameSite; HSTS ≥ 1 year; `nosniff`; CSP; no caching of API data |
| - | Injection-style input is handled safely | `tests/security/input-validation.security.spec.ts` | Script markup → 422 / not saved, no script executed; SQL-style input → no data, no 5xx; errors don't leak internals |
| - | No new accessibility violations | `tests/accessibility/accessibility.spec.ts` | `AccessibilityHelper.verifyNoNewViolations()`: violations outside the baseline `toEqual([])`; axe JSON attached |
| - | Failure alert is sent and correct | `tests/framework/helpers.spec.ts`; run against a local webhook | Message contains status, counts, failed and flaky tests, run link |
| - | Cleanup without hiding the failure | `finally` in `employee-crud.spec.ts` | Deletes by captured `empNumber`; cleanup errors logged, not thrown |
| - | Every selector matches the live UI | `tests/framework/selector-health.spec.ts` | Each locator-file entry `toHaveCount(1)` (or at least one for list entries) |
| - | Every locator strategy works | `tests/framework/locator-strategies.spec.ts` | One assertion per strategy, including `testId` and `xpath` |
| - | Invalid or empty login is rejected | `login.spec.ts` | `Invalid credentials` alert; `Required` field errors |
| - | Duplicate Employee Id is rejected | `add-employee.spec.ts` | Field error `Employee Id already exists` |

## Known limitations

- **Shared public demo.** Anyone can change or reset the data, and the server is sometimes slow. Tests create their own data and use generous timeouts, but an outage or a reset during a run can still fail tests. CI retries absorb most of this.
- **Generated Employee Id race.** The app suggests the next free id when the Add Employee page loads. If someone else saves the same id first, the save is rejected. `save()` detects this and fails with *"Save was rejected by Employee Id validation"* rather than timing out. A retry loads a fresh id.
- **Profile header lag.** After a name change, the profile header keeps showing the old name until the page reloads. The CRUD test therefore checks the input value and the search results instead.
- **`getByTestId`** is supported but not used in any page map, because OrangeHRM has no `data-testid` attributes.
- **Maintenance** is excluded from the navigation tests because it asks for the admin password again.
- **Execution time.** About 4 to 5 minutes per browser with 2 workers; raising `WORKERS` against the public demo tends to cause timeouts.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `browserType.launch: Executable doesn't exist` | Browsers are not installed: `npx playwright install chromium firefox webkit` (on Linux: `npm run install:browsers`) |
| Many `Timeout … exceeded` errors at once | The demo server is slow or down. Open the URL in a browser, then retry with `WORKERS=1`. |
| Failures in `setup` / `authenticate as admin` | Credentials changed or the site is down. Check `ADMIN_USERNAME`/`ADMIN_PASSWORD`. |
| `selector-health.spec.ts` fails | OrangeHRM markup changed. The message names the entry to update in `src/locators/<screen>.locators.ts`. |
| `Save was rejected by Employee Id validation` | Generated-id race on the shared demo (see Known limitations). Re-run the test. |
| `npm run report` shows an old report | The report is overwritten by every run; run the tests first. |
| Type errors after changing a locator file | Run `npm run typecheck`; locator files use `satisfies LocatorMap`, so a wrong strategy or option fails to compile. |
| Need to see what happened | Open the HTML report (`npm run report`), select the failed test, and open its trace, screenshot and video. |
