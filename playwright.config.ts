import { defineConfig, devices } from '@playwright/test';
import { ADMIN_STORAGE_STATE, env } from './src/utils/env';

/** Folders with their own projects; the browser projects skip them. */
const UI_IGNORE = ['**/api/**', '**/security/**'];

/**
 * The target is a public, shared demo server: it can be slow and other people
 * change its data concurrently. Timeouts are generous, every test creates its
 * own uniquely named data, and failed tests are retried to absorb network flakiness.
 *
 * Environment variables (all optional; see .env.example):
 *   BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD   target and credentials
 *   WORKERS    parallel workers (number or percentage, e.g. "50%"); default 2
 *   RETRIES    times a failed test is retried; default 2 (locally and on CI), 0 = off
 *   HEADED     "1"/"true" to show browsers (same as the --headed CLI flag); default headless
 *   SLOW_MO    milliseconds to pause between browser actions, to follow a headed run; default 0
 *   ALERT_WEBHOOK_URL  Slack/Teams webhook for failure alerts
 *   ALLURE_GENERATE    "false" to skip building the Allure report after a run
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: env.isCI,
  // A failed test runs again up to twice. Passing on a retry is reported as "flaky", never as a clean pass.
  retries: env.retries,
  // Kept low by default: many parallel sessions make the shared demo server time out.
  workers: env.workers,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    // Writes test-results/run-summary.json; alerts Slack/Teams on failure when ALERT_WEBHOOK_URL is set.
    ['./src/utils/reporters/FailureAlertReporter.ts'],
    // Allure: raw results per test (with failure screenshots, videos and traces attached)...
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          'Base URL': env.baseUrl,
          'Node.js': process.version,
          OS: `${process.platform} ${process.arch}`,
          Workers: String(env.workers),
          Retries: String(env.retries),
          Mode: env.headed ? 'headed' : 'headless',
          CI: env.isCI ? 'yes' : 'no',
        },
      },
    ],
    // ...then the HTML report, built automatically after every run (must come after allure-playwright).
    ['./src/utils/reporters/AllureReportGenerator.ts'],
  ],

  use: {
    baseURL: env.baseUrl,
    // Headless by default; headed with --headed or HEADED=true.
    headless: !env.headed,
    launchOptions: { slowMo: env.slowMo },
    // Failure evidence, attached to the HTML and Allure reports.
    trace: 'retain-on-failure-and-retries',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Logs in once; every other project reuses the saved session (cookies are browser-agnostic).
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // UI tests, once per browser. API and security tests run in their own projects below.
    {
      name: 'chromium',
      testIgnore: UI_IGNORE,
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: UI_IGNORE,
      use: { ...devices['Desktop Firefox'], storageState: ADMIN_STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testIgnore: UI_IGNORE,
      use: { ...devices['Desktop Safari'], storageState: ADMIN_STORAGE_STATE },
      dependencies: ['setup'],
    },

    // REST API tests: plain HTTP with the saved session, no browser. Browser-independent, so run once.
    {
      name: 'api',
      testDir: './tests/api',
      use: { storageState: ADMIN_STORAGE_STATE },
      dependencies: ['setup'],
    },

    // Security checks: server behaviour (headers, cookies, auth) is the same for every browser, so run once.
    {
      name: 'security',
      testDir: './tests/security',
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});
