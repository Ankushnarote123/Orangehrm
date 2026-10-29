import { defineConfig } from 'allure';

/**
 * Allure 3 report settings (Node-based: no Java needed).
 * The report is generated automatically after every Playwright run by
 * src/utils/reporters/AllureReportGenerator.ts, or manually with `npm run allure:generate`.
 */
export default defineConfig({
  name: 'OrangeHRM Playwright Tests',
  output: './allure-report',
  // Keeps a trend of pass/fail results across runs on this machine (gitignored).
  historyPath: './allure-history/history.jsonl',
  historyLimit: 30,
  plugins: {
    awesome: {
      options: {
        // One self-contained index.html: opens by double-click, easy to share or attach.
        singleFile: true,
        reportLanguage: 'en',
        groupBy: ['parentSuite', 'suite', 'subSuite'],
      },
    },
  },
});
