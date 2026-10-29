import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export interface AllureReportGeneratorOptions {
  /** Must match allure-playwright's `resultsDir`. */
  resultsDir?: string;
  /** Allure config file (report name, output folder, history). */
  configFile?: string;
  /** Set to false (or ALLURE_GENERATE=false) to skip generation, e.g. for quick local runs. */
  enabled?: boolean;
}

/**
 * Builds the Allure HTML report automatically at the end of EVERY run,
 * whether tests passed or failed, and whichever command started them.
 *
 * Register it AFTER 'allure-playwright' in the reporter list, so the results
 * are complete when it runs. It also clears the previous run's results when
 * the run starts, so each report shows exactly one run (the trend across runs
 * comes from Allure's history file).
 *
 * Report problems are logged, never thrown: they can't change the test result.
 */
export default class AllureReportGenerator implements Reporter {
  private readonly resultsDir: string;
  private readonly configFile: string;
  private readonly enabled: boolean;
  /** `--list` only lists tests; allure-playwright still records them as "skipped". */
  private readonly listOnly = process.argv.includes('--list');
  private testsRun = 0;

  constructor(options: AllureReportGeneratorOptions = {}) {
    this.resultsDir = path.resolve(options.resultsDir ?? 'allure-results');
    this.configFile = path.resolve(options.configFile ?? 'allurerc.mjs');
    this.enabled = options.enabled ?? process.env.ALLURE_GENERATE !== 'false';
    // Reporters are created before any test runs or result is written: the safe moment to clear old results.
    // Not when only listing tests, which would wipe the last real run's results for nothing.
    if (!this.listOnly) fs.rmSync(this.resultsDir, { recursive: true, force: true });
  }

  onTestEnd(_test: TestCase, _result: TestResult): void {
    this.testsRun++;
  }

  onEnd(_result: FullResult): void {
    // Only build a report when tests actually ran: never replace a real report with a listing.
    if (!this.enabled || this.listOnly || this.testsRun === 0) return;
    const hasResults = fs.existsSync(this.resultsDir) && fs.readdirSync(this.resultsDir).some((f) => f.endsWith('-result.json'));
    if (!hasResults) return;

    // The allure package exports only its API, so locate its CLI next to the resolved entry point.
    const cli = path.join(path.dirname(require.resolve('allure')), '..', 'cli.js');
    // --clean: remove the previous report first, so no stale files from an older report remain.
    const run = spawnSync(process.execPath, [cli, 'generate', this.resultsDir, '--config', this.configFile, '--clean'], {
      encoding: 'utf8',
      timeout: 120_000,
    });

    if (run.status === 0) {
      const report = path.relative(process.cwd(), path.resolve('allure-report', 'index.html'));
      console.log(`\nAllure report: ${report}  (open it directly, or run "npm run allure:open")`);
    } else {
      console.warn('[AllureReportGenerator] report generation failed:', (run.stderr || run.error?.message || '').trim());
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
