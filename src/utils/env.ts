import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const isCI = !!process.env.CI;

/** "4" -> 4, "50%" -> "50%", anything else -> fallback. */
function parseWorkers(value: string | undefined, fallback: number): number | string {
  if (!value) return fallback;
  if (/^\d+%$/.test(value)) return value;
  const count = Number(value);
  return Number.isInteger(count) && count > 0 ? count : fallback;
}

function parseCount(value: string | undefined, fallback: number): number {
  const count = Number(value);
  return value && Number.isInteger(count) && count >= 0 ? count : fallback;
}

/**
 * Central runtime configuration. Every value can be overridden through
 * environment variables (or a local `.env` file) so the same suite can target
 * another OrangeHRM instance without code changes.
 *
 * `||` rather than `??`: CI passes unset variables/secrets as empty strings.
 */
export const env = {
  baseUrl: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',
  adminUsername: process.env.ADMIN_USERNAME || 'Admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  isCI,
  workers: parseWorkers(process.env.WORKERS, 2),
  /** A failed test is retried this many times (locally and on CI); RETRIES=0 turns retries off. */
  retries: parseCount(process.env.RETRIES, 2),
  headed: ['1', 'true'].includes((process.env.HEADED ?? '').toLowerCase()),
  /** Pause between browser actions (ms) so a headed run can be followed by eye. */
  slowMo: parseCount(process.env.SLOW_MO, 0),
} as const;

/** Authenticated browser state written by `tests/auth.setup.ts` and reused by every test. */
export const ADMIN_STORAGE_STATE = path.resolve(__dirname, '../../.auth/admin.json');
