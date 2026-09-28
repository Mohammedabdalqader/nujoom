import { safeAppResumePath } from '@nujoom/shared';

/**
 * A deep link opened while signed out (a guardian approval link) waits here until sign-in
 * finishes; the root navigator then opens it. Only routes `safeAppResumePath` allows are kept,
 * and only for this app session.
 */
let pending: string | null = null;

export function rememberResume(path: string): void {
  pending = safeAppResumePath(path);
}

/** Returns the waiting route once and forgets it. */
export function takeResume(): string | null {
  const path = pending;
  pending = null;
  return path;
}
