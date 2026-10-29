import { test, type BrowserContext, type Page, type Response } from '@playwright/test';

/** Errors caused by the network rather than the app: worth one more try. */
const NETWORK_ERROR =
  /net::ERR_|NS_ERROR_|NS_BINDING_ABORTED|Could not connect|Connection (refused|reset)|WebKit encountered an internal error|Timeout \d+ms exceeded/i;

/** Adds a note to the current test's report when called inside a test; otherwise logs it. */
function note(type: string, description: string): void {
  try {
    test.info().annotations.push({ type, description });
  } catch {
    console.warn(`[${type}] ${description}`);
  }
}

/** Describes the API response to wait for. */
export interface ApiMatcher {
  /** The URL path must END with this, e.g. '/api/v2/pim/employees' or '/personal-details'. */
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Query parameters that must be present with exactly these values. */
  params?: Record<string, string>;
  timeout?: number;
}

/** Page, navigation, network and session helpers. */
export class BrowserHelper {
  /** Waits for the first response matching `matcher`. Start it BEFORE the action that triggers the request. */
  static waitForApiResponse(page: Page, { path, method = 'GET', params = {}, timeout }: ApiMatcher): Promise<Response> {
    return page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          url.pathname.endsWith(path) &&
          response.request().method() === method &&
          Object.entries(params).every(([key, value]) => url.searchParams.get(key) === value)
        );
      },
      { timeout },
    );
  }

  /**
   * Runs `action` (e.g. a click) and returns the API response it triggers. The
   * wait starts before the action, so a fast response can't be missed.
   */
  static async performAndWaitForResponse(
    page: Page,
    action: () => Promise<unknown>,
    matcher: ApiMatcher,
  ): Promise<Response> {
    const [response] = await Promise.all([BrowserHelper.waitForApiResponse(page, matcher), action()]);
    return response;
  }

  /**
   * Opens `url` and waits for the `load` event. If the page fails to load
   * because of the NETWORK (connection reset, DNS, navigation timeout), it
   * retries; application errors (e.g. a 500 page) are not retried.
   */
  static async gotoWithRetry(page: Page, url: string, { attempts = 2 }: { attempts?: number } = {}): Promise<Response | null> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await page.goto(url, { waitUntil: 'load' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (attempt >= attempts || !NETWORK_ERROR.test(message)) throw error;
        note('navigation-retry', `Attempt ${attempt} to open ${url} failed (${message.split('\n')[0]}); retrying`);
      }
    }
  }

  /**
   * Waits until the page has loaded: `domcontentloaded`, then `load`.
   *
   * With `networkIdle: true` it then also waits for 'networkidle' (no requests
   * for 500 ms). That costs about 7 s per OrangeHRM page, so use it only when
   * nothing more specific exists to wait for, e.g. before an accessibility scan
   * of the whole page. The idle wait is best-effort: if background requests
   * keep the network busy, it records a note and continues, and the test's own
   * assertions decide.
   */
  static async waitForPageReady(
    page: Page,
    { networkIdle = false, networkIdleTimeout = 15_000 }: { networkIdle?: boolean; networkIdleTimeout?: number } = {},
  ): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('load');
    if (!networkIdle) return;
    try {
      await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
    } catch {
      note('network-not-idle', `Network still busy after ${networkIdleTimeout} ms on ${page.url()}; continuing`);
    }
  }

  /**
   * Runs an action that opens a new document (a link click or a form submit)
   * and waits for that document's `load` event. Works through server redirects
   * and same-URL reloads, unlike waiting for a URL change.
   */
  static async performAndWaitForPageLoad(page: Page, action: () => Promise<unknown>): Promise<void> {
    await Promise.all([page.waitForEvent('load'), action()]);
  }

  /** Current URL path relative to the origin, e.g. "/web/index.php/dashboard/index". */
  static currentPath(page: Page): string {
    return new URL(page.url()).pathname;
  }

  /** Logs the browser out without the UI: removes cookies and web storage for every open page. */
  static async clearSession(context: BrowserContext): Promise<void> {
    await context.clearCookies();
    for (const page of context.pages()) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
  }
}
