import { test, expect } from '@fixtures/test';
import { API, ROUTES } from '@utils/routes';
import { BrowserHelper } from '@utils/helpers/index';

/**
 * Cookie flags and HTTP security headers on the pages and API used by the
 * employee CRUD scenario.
 *
 * Two tests document KNOWN FINDINGS of the demo server with `test.fail()`:
 * they assert the secure behaviour, are expected to fail today, and will be
 * reported as "unexpectedly passed" once the server is fixed, which is the
 * signal to remove the `test.fail()`.
 */
test.describe('Security - transport, cookies and headers', () => {
  test('session cookie is HttpOnly, Secure and SameSite', { tag: '@regression' }, async ({ page, context }) => {
    await BrowserHelper.gotoWithRetry(page, ROUTES.dashboard);
    const session = (await context.cookies()).find((cookie) => cookie.name === 'orangehrm');

    expect(session, 'session cookie').toBeDefined();
    expect(session!.httpOnly, 'HttpOnly: not readable by page scripts').toBe(true);
    expect(session!.secure, 'Secure: only sent over HTTPS').toBe(true);
    expect(['Lax', 'Strict'], 'SameSite limits cross-site sending').toContain(session!.sameSite);
  });

  test('session cookie is not exposed to page JavaScript', { tag: '@regression' }, async ({ page }) => {
    await BrowserHelper.gotoWithRetry(page, ROUTES.dashboard);
    expect(await page.evaluate(() => document.cookie)).not.toContain('orangehrm=');
  });

  for (const [name, path] of Object.entries({ 'login page': ROUTES.login, 'employee API': API.employees })) {
    test(`${name} sends core security headers`, { tag: '@regression' }, async ({ adminRequest }) => {
      const headers = (await adminRequest.get(path)).headers();

      const hsts = /max-age=(\d+)/.exec(headers['strict-transport-security'] ?? '');
      expect(hsts, 'Strict-Transport-Security present').not.toBeNull();
      expect(Number(hsts![1]), 'HSTS max-age of at least one year').toBeGreaterThanOrEqual(31_536_000);
      expect(headers['x-content-type-options'], 'no MIME sniffing').toBe('nosniff');
      expect(headers['content-security-policy'], 'Content-Security-Policy present').toBeTruthy();
    });
  }

  test('employee API responses are not cached', { tag: '@regression' }, async ({ adminRequest }) => {
    const cacheControl = (await adminRequest.get(API.employees, { params: { limit: 1 } })).headers()['cache-control'] ?? '';
    expect(cacheControl).toMatch(/no-cache|no-store|private/);
  });

  test('KNOWN FINDING: pages can be framed (no clickjacking protection)', { tag: '@regression' }, async ({ adminRequest }) => {
    test.fail(true, 'Demo server sends neither X-Frame-Options nor CSP frame-ancestors (verified 2026-10-30).');
    const headers = (await adminRequest.get(ROUTES.login)).headers();

    const frameOptions = headers['x-frame-options'] ?? '';
    const frameAncestors = /frame-ancestors[^;]*/.exec(headers['content-security-policy'] ?? '')?.[0] ?? '';
    expect(/deny|sameorigin/i.test(frameOptions) || /frame-ancestors\s+('none'|'self')/.test(frameAncestors)).toBe(true);
  });

  test('KNOWN FINDING: server version is disclosed', { tag: '@regression' }, async ({ adminRequest }) => {
    test.fail(true, 'Demo server returns "Server: nginx/1.18.0 (Ubuntu)" (verified 2026-10-30).');
    const server = (await adminRequest.get(ROUTES.login)).headers()['server'] ?? '';

    expect(server, 'Server header must not include a version number').not.toMatch(/\d+\.\d+/);
  });
});
