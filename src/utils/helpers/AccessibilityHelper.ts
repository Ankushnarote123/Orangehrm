import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { BrowserHelper } from './BrowserHelper';

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
export type AxeViolation = AxeResults['violations'][number];

/** WCAG 2.0 / 2.1 level A and AA rules: the usual legal and contractual baseline. */
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface ScanOptions {
  /** Limit the scan to these CSS selectors (default: whole page). */
  include?: string[];
  /** Skip these CSS selectors, e.g. third-party widgets. */
  exclude?: string[];
  tags?: string[];
}

export interface BaselineScanOptions extends ScanOptions {
  /** Name used for the report attachment, e.g. "dashboard". */
  name: string;
  /**
   * Rule ids that are already known to fail on this page (an accepted baseline).
   * The check fails only on violations of OTHER rules, so new problems are
   * caught without the suite failing forever on known, reported issues.
   */
  knownRuleIds?: string[];
}

/** Accessibility checks powered by axe-core. */
export class AccessibilityHelper {
  /**
   * Runs an axe scan of the current page. Waits for network idle first, so
   * widgets that load their data late are rendered and scanned too.
   */
  static async scan(page: Page, { include = [], exclude = [], tags = WCAG_AA_TAGS }: ScanOptions = {}): Promise<AxeResults> {
    await BrowserHelper.waitForPageReady(page, { networkIdle: true });
    let builder = new AxeBuilder({ page }).withTags(tags);
    for (const selector of include) builder = builder.include(selector);
    for (const selector of exclude) builder = builder.exclude(selector);
    return builder.analyze();
  }

  /** One line per violated rule: "[critical] button-name (3 elements): Buttons must have discernible text". */
  static formatViolations(violations: AxeViolation[]): string {
    return violations
      .map((v) => `[${v.impact ?? 'unknown'}] ${v.id} (${v.nodes.length} elements): ${v.help}`)
      .join('\n');
  }

  /** Attaches the full axe results to the test, viewable in the HTML report. */
  static async attachResults(testInfo: TestInfo, name: string, results: AxeResults): Promise<void> {
    await testInfo.attach(`accessibility-${name}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
  }

  /**
   * Scans the page, attaches the results to the report, and fails if any rule
   * outside `knownRuleIds` is violated. Returns all violations for extra checks.
   */
  static async verifyNoNewViolations(
    page: Page,
    testInfo: TestInfo,
    { name, knownRuleIds = [], ...scanOptions }: BaselineScanOptions,
  ): Promise<AxeViolation[]> {
    const results = await AccessibilityHelper.scan(page, scanOptions);
    await AccessibilityHelper.attachResults(testInfo, name, results);

    const newViolations = results.violations.filter((v) => !knownRuleIds.includes(v.id));
    expect(newViolations, `New accessibility violations on ${name}:\n${AccessibilityHelper.formatViolations(newViolations)}`)
      .toEqual([]);
    return results.violations;
  }
}
