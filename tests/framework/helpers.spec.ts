import { test, expect } from '@playwright/test';
import { AccessibilityHelper, BrowserHelper, CommonHelper, ElementHelper } from '@utils/helpers/index';
import { buildAlertMessage, type RunSummary } from '@utils/reporters/FailureAlertReporter';

/**
 * Checks of the reusable helpers themselves, against static HTML and mocked
 * network calls. No OrangeHRM server or login needed.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const API_URL = 'https://helpers.test/api/items?page=2';

test.describe('CommonHelper', () => {
  test('uniqueSuffix and randomString produce distinct values', { tag: '@regression' }, () => {
    // 1000 calls land in the same few milliseconds: this caught a collision bug in an earlier version.
    const suffixes = Array.from({ length: 1000 }, () => CommonHelper.uniqueSuffix());
    expect(new Set(suffixes).size).toBe(1000);
    // Employee Ids use the last 10 characters, which must stay unique as well.
    expect(new Set(suffixes.map((s) => s.slice(-10))).size).toBe(1000);
    expect(CommonHelper.randomString(12)).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(CommonHelper.randomString(5, 'ab')).toMatch(/^[ab]{5}$/);
  });

  test('parses and formats OrangeHRM record counts', { tag: '@regression' }, () => {
    expect(CommonHelper.parseRecordCount('No Records Found')).toBe(0);
    expect(CommonHelper.parseRecordCount(' (1) Record Found')).toBe(1);
    expect(CommonHelper.parseRecordCount('(176) Records Found')).toBe(176);
    expect(() => CommonHelper.parseRecordCount('Loading...')).toThrow('Unrecognised');
    for (const count of [0, 1, 25]) {
      expect(CommonHelper.parseRecordCount(CommonHelper.recordCountText(count))).toBe(count);
    }
  });

  test('escapeRegExp makes routes literal', { tag: '@regression' }, () => {
    const pattern = new RegExp(CommonHelper.escapeRegExp('/web/index.php/auth/login'));
    expect(pattern.test('https://x/web/index.php/auth/login')).toBe(true);
    expect(pattern.test('https://x/web/indexXphp/auth/login')).toBe(false);
  });
});

test.describe('ElementHelper', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(`
      <ul><li> One </li><li>Two <span style="display:none">Ascending Descending</span></li></ul>
      <input id="late" value="">
      <input id="name" data-kind="text">
      <script>setTimeout(() => document.getElementById('late').value = 'ready', 300);</script>`);
  });

  test('getTexts returns trimmed visible text, without hidden child text', { tag: '@regression' }, async ({ page }) => {
    // Like OrangeHRM's sortable headers: textContent would include the hidden menu text.
    expect(await page.locator('li').allTextContents()).toEqual([' One ', 'Two Ascending Descending']);
    expect(await ElementHelper.getTexts(page.locator('li'))).toEqual(['One', 'Two']);
  });

  test('waitForValue waits for an asynchronously filled input', { tag: '@regression' }, async ({ page }) => {
    expect(await ElementHelper.waitForValue(page.locator('#late'))).toBe('ready');
  });

  test('fillAndVerify, isPresent and getRequiredAttribute', { tag: '@regression' }, async ({ page }) => {
    await ElementHelper.fillAndVerify(page.locator('#name'), 'Ada');
    await expect(page.locator('#name')).toHaveValue('Ada');
    expect(await ElementHelper.isPresent(page.locator('#name'))).toBe(true);
    expect(await ElementHelper.isPresent(page.locator('#missing'))).toBe(false);
    expect(await ElementHelper.getRequiredAttribute(page.locator('#name'), 'data-kind')).toBe('text');
    await expect(ElementHelper.getRequiredAttribute(page.locator('#name'), 'nope')).rejects.toThrow('missing');
  });
});

test.describe('BrowserHelper', () => {
  test('performAndWaitForResponse returns only the matching response', { tag: '@regression' }, async ({ page }) => {
    await page.route('https://helpers.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: route.request().url() }) }),
    );
    await page.setContent(`
      <button onclick="fetch('https://helpers.test/api/items?page=1'); setTimeout(() => fetch('${API_URL}'), 100)">Load</button>`);

    const response = await BrowserHelper.performAndWaitForResponse(page, () => page.getByRole('button').click(), {
      path: '/api/items',
      params: { page: '2' },
    });

    expect(response.url()).toBe(API_URL);
    expect(response.status()).toBe(200);
  });

  test('clearSession removes cookies and storage', { tag: '@regression' }, async ({ page, context }) => {
    await page.route('https://helpers.test/', (route) => route.fulfill({ body: '<p>app</p>', contentType: 'text/html' }));
    await page.goto('https://helpers.test/');
    await context.addCookies([{ name: 'session', value: 'x', url: 'https://helpers.test/' }]);
    await page.evaluate(() => localStorage.setItem('token', 'x'));

    await BrowserHelper.clearSession(context);

    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    expect(BrowserHelper.currentPath(page)).toBe('/');
  });
});

test.describe('AccessibilityHelper', () => {
  test('reports new violations and accepts known ones', { tag: '@regression' }, async ({ page }, testInfo) => {
    // <html> without lang + an unlabeled image button: two known WCAG failures.
    await page.setContent('<main><button><img src="x.png"></button></main>');

    const violations = (await AccessibilityHelper.scan(page)).violations.map((v) => v.id);
    expect(violations).toEqual(expect.arrayContaining(['button-name', 'html-has-lang']));

    await AccessibilityHelper.verifyNoNewViolations(page, testInfo, { name: 'fixture', knownRuleIds: violations });
    await expect(
      AccessibilityHelper.verifyNoNewViolations(page, testInfo, { name: 'fixture-strict', knownRuleIds: [] }),
    ).rejects.toThrow(/button-name/);
  });
});

test.describe('FailureAlertReporter', () => {
  test('builds a readable alert message', { tag: '@regression' }, () => {
    const summary: RunSummary = {
      status: 'failed',
      total: 3,
      passed: 1,
      failed: 1,
      flaky: 1,
      skipped: 0,
      durationSeconds: 42,
      failures: [{ title: 'PIM › finds an employee', project: 'firefox', error: 'Timeout 15000ms exceeded' }],
      flakyTests: [{ title: 'Login › valid login', project: 'webkit', error: '' }],
      runUrl: 'https://github.com/org/repo/actions/runs/1',
    };

    const message = buildAlertMessage(summary);

    expect(message).toContain('FAILED');
    expect(message).toContain('Passed: 1 | Failed: 1 | Flaky: 1');
    expect(message).toContain('[firefox] PIM › finds an employee — Timeout 15000ms exceeded');
    expect(message).toContain('[webkit] Login › valid login');
    expect(message).toContain('https://github.com/org/repo/actions/runs/1');
  });
});
