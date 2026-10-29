import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';

export interface FailedTest {
  title: string;
  project: string;
  error: string;
}

export interface RunSummary {
  status: FullResult['status'];
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  durationSeconds: number;
  failures: FailedTest[];
  flakyTests: FailedTest[];
  runUrl?: string;
}

export interface FailureAlertOptions {
  /** Where the JSON summary is written. */
  outputFile?: string;
  /** Slack/Teams incoming-webhook URL. Defaults to the ALERT_WEBHOOK_URL env var; no URL = no alert. */
  webhookUrl?: string;
  /** Also alert when tests only passed on retry. Default true. */
  alertOnFlaky?: boolean;
}

/** Text of the alert/summary. Exported separately so it can be unit-tested. */
export function buildAlertMessage(summary: RunSummary): string {
  const icon = summary.failed > 0 ? '❌' : summary.flaky > 0 ? '⚠️' : '✅';
  const lines = [
    `${icon} *OrangeHRM E2E run: ${summary.status.toUpperCase()}*`,
    `Passed: ${summary.passed} | Failed: ${summary.failed} | Flaky: ${summary.flaky} | Skipped: ${summary.skipped} | ` +
      `Duration: ${summary.durationSeconds}s`,
  ];
  const list = (heading: string, tests: FailedTest[]) => {
    if (tests.length === 0) return;
    lines.push('', `*${heading}:*`);
    for (const test of tests.slice(0, 10)) {
      const project = test.project ? `[${test.project}] ` : '';
      lines.push(`• ${project}${test.title}${test.error ? ` — ${test.error}` : ''}`);
    }
    if (tests.length > 10) lines.push(`…and ${tests.length - 10} more`);
  };
  list('Failed', summary.failures);
  list('Flaky (passed on retry)', summary.flakyTests);
  if (summary.runUrl) lines.push('', `Report and traces: ${summary.runUrl}`);
  return lines.join('\n');
}

/**
 * Report sender and failed-test alerts.
 *
 * After every run it:
 *  1. writes a machine-readable summary (test-results/run-summary.json);
 *  2. in GitHub Actions, appends a summary to the job page ($GITHUB_STEP_SUMMARY);
 *  3. if tests failed (or were flaky) AND a webhook URL is configured, posts an
 *     alert to Slack/Microsoft Teams. Without a URL nothing is sent.
 *
 * Alerting problems are logged, never thrown, so they can't change the test result.
 */
export default class FailureAlertReporter implements Reporter {
  private rootSuite?: Suite;
  private readonly outputFile: string;
  private readonly webhookUrl?: string;
  private readonly alertOnFlaky: boolean;

  constructor(options: FailureAlertOptions = {}) {
    this.outputFile = options.outputFile ?? 'test-results/run-summary.json';
    this.webhookUrl = options.webhookUrl ?? (process.env.ALERT_WEBHOOK_URL || undefined);
    this.alertOnFlaky = options.alertOnFlaky ?? true;
  }

  onBegin(_config: unknown, suite: Suite): void {
    this.rootSuite = suite;
  }

  // Required so Playwright keeps results on the TestCase objects read in onEnd.
  onTestEnd(_test: TestCase, _result: TestResult): void {}

  async onEnd(result: FullResult): Promise<void> {
    const summary = this.summarise(result);

    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, JSON.stringify(summary, null, 2));

    const message = buildAlertMessage(summary);
    if (process.env.GITHUB_STEP_SUMMARY) {
      // Markdown: Slack-style *bold* becomes **bold**; trailing double spaces keep each line break.
      const markdown = message.replace(/\*/g, '**').replace(/\n/g, '  \n');
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n\n`);
    }

    const shouldAlert = summary.failed > 0 || (this.alertOnFlaky && summary.flaky > 0);
    if (shouldAlert && this.webhookUrl) {
      await this.send(message);
    }
  }

  private summarise(result: FullResult): RunSummary {
    const tests = this.rootSuite?.allTests() ?? [];
    const describe = (test: TestCase): FailedTest => {
      const last = test.results.at(-1);
      const error = (last?.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0].slice(0, 200);
      return { title: test.titlePath().slice(3).join(' › '), project: test.parent.project()?.name ?? '', error };
    };
    const byOutcome = (outcome: ReturnType<TestCase['outcome']>) => tests.filter((t) => t.outcome() === outcome);

    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
    return {
      status: result.status,
      total: tests.length,
      passed: byOutcome('expected').length,
      failed: byOutcome('unexpected').length,
      flaky: byOutcome('flaky').length,
      skipped: byOutcome('skipped').length,
      durationSeconds: Math.round(result.duration / 1000),
      failures: byOutcome('unexpected').map(describe),
      flakyTests: byOutcome('flaky').map(describe),
      runUrl:
        GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
          ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
          : undefined,
    };
  }

  /** Slack and Teams incoming webhooks both accept `{ "text": "..." }`. */
  private async send(text: string): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.warn(`[FailureAlertReporter] webhook responded ${response.status}`);
      else console.log('[FailureAlertReporter] failure alert sent');
    } catch (error) {
      console.warn('[FailureAlertReporter] could not send alert:', error instanceof Error ? error.message : error);
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
