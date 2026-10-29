let counter = 0;

/** Small, framework-independent utilities used across pages, tests and data factories. */
export class CommonHelper {
  /**
   * Short unique suffix: base-36 time + 4 random chars + a per-process counter.
   * The public demo is shared and tests run in parallel, so created data must
   * be unique. The counter makes every call in one worker distinct, even within
   * the same millisecond; time + randomness separate different workers.
   * The last 10 characters (the Employee Id limit) stay unique too.
   */
  static uniqueSuffix(): string {
    const time = Date.now().toString(36);
    const random = CommonHelper.randomString(4, '0123456789abcdefghijklmnopqrstuvwxyz');
    const sequence = (counter++ % 1296).toString(36).padStart(2, '0');
    return `${time}${random}${sequence}`;
  }

  /** Random string of `length` characters from `charset` (letters and digits by default). */
  static randomString(
    length: number,
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  ): string {
    return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
  }

  /** Escapes a literal string for use inside a RegExp (e.g. routes containing "." or "?"). */
  static escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** "(12) Records Found" -> 12, "(1) Record Found" -> 1, "No Records Found" -> 0. */
  static parseRecordCount(text: string): number {
    const normalized = text.trim();
    if (normalized === 'No Records Found') return 0;
    const match = /^\((\d+)\) Records? Found$/.exec(normalized);
    if (!match) throw new Error(`Unrecognised record count text: "${text}"`);
    return Number(match[1]);
  }

  /** The text OrangeHRM shows for `count` results; the inverse of `parseRecordCount`. */
  static recordCountText(count: number): string {
    if (count === 0) return 'No Records Found';
    return `(${count}) ${count === 1 ? 'Record' : 'Records'} Found`;
  }
}
