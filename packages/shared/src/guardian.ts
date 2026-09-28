/**
 * What a youth's guardian screen shows (S1-11, spec §7). The server decides; this reads the
 * links `me()` returns into one state, so the guardian step and Settings agree.
 *
 *   confirmed: any guardian approved
 *   expired:   the pending invite's link ran out (7 days)
 *   sent:      the email went out (the Edge Function recorded delivery)
 *   notSent:   named, but no email has gone out yet (or the last attempt failed)
 *   none:      no guardian named
 */
export type GuardianInviteState = 'none' | 'notSent' | 'sent' | 'expired' | 'confirmed';

export type GuardianLinkFacts = {
  status: 'pending' | 'confirmed';
  sentAt: string | null;
  expiresAt: string | null;
};

/** Mirrors `config.guardian_invites.resend_seconds`; the server enforces the real limit. */
export const GUARDIAN_RESEND_COOLDOWN_MS = 60_000;

export function guardianInviteState<T extends GuardianLinkFacts>(
  links: readonly T[],
  now: number,
): { state: GuardianInviteState; link: T | null } {
  const confirmed = links.find((l) => l.status === 'confirmed');
  if (confirmed) return { state: 'confirmed', link: confirmed };
  const pending = links.find((l) => l.status === 'pending');
  if (!pending) return { state: 'none', link: null };
  if (pending.expiresAt && Date.parse(pending.expiresAt) <= now) {
    return { state: 'expired', link: pending };
  }
  return { state: pending.sentAt ? 'sent' : 'notSent', link: pending };
}
