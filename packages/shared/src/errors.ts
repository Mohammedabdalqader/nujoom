/**
 * Maps errors from our SQL functions and Supabase Auth to translation keys (contract §1), so
 * every screen shows the same actionable message. Messages never reveal SQL details or whether
 * an account exists. Unknown errors fall back to `errors.generic`.
 *
 * SQL functions raise a bare snake_case code as the message (`raise exception 'handle_taken'`),
 * so codes are matched exactly: a substring match would read `recording_consent_required`
 * as `consent_required`.
 */
const SQL_ERROR_KEYS = {
  not_authenticated: 'errors.auth.signedOut',
  rate_limited: 'errors.rateLimited',
  not_found: 'errors.notFound',
  forbidden: 'errors.forbidden',
  // Onboarding and profile
  not_onboarded: 'errors.onboarding.notOnboarded',
  already_onboarded: 'errors.onboarding.alreadyOnboarded',
  below_min_age: 'errors.onboarding.belowMinAge',
  dob_in_future: 'errors.onboarding.dob',
  invalid_name: 'errors.profile.name',
  invalid_handle: 'errors.profile.handle',
  handle_taken: 'errors.profile.handleTaken',
  invalid_city: 'errors.profile.city',
  invalid_neighborhood: 'errors.profile.neighborhood',
  invalid_position: 'errors.profile.position',
  invalid_shirt_number: 'errors.profile.shirtNumber',
  invalid_avatar: 'errors.profile.avatar',
  invalid_patch: 'errors.profile.invalid',
  guardian_controls_visibility: 'errors.profile.guardianControls',
  youth_presence_hidden: 'errors.profile.youthPresence',
  // Consent
  consent_required: 'errors.consent.required',
  consent_outdated: 'errors.consent.outdated',
  invalid_consent: 'errors.consent.invalid',
  streaming_not_available: 'errors.consent.streaming',
  // Guardians (S1-11): the youth naming one, the email, and the guardian approving
  too_many_guardians: 'errors.guardian.tooMany',
  not_youth: 'errors.guardian.notYouth',
  invalid_email: 'errors.auth.emailInvalid',
  same_email: 'errors.guardian.sameEmail',
  duplicate_guardian: 'errors.guardian.duplicate',
  invite_rate_limited: 'errors.guardian.wait',
  invite_limit_reached: 'errors.guardian.limit',
  invite_not_pending: 'errors.guardian.notPending',
  invite_failed: 'errors.guardian.sendFailed',
  email_failed: 'errors.guardian.sendFailed',
  invalid_invite: 'errors.guardian.invalidInvite',
  contact_mismatch: 'errors.guardian.contactMismatch',
  cannot_guard_self: 'errors.guardian.self',
  guardian_must_be_adult: 'errors.guardian.adult',
  // Data rights (S1-9)
  export_failed: 'errors.dataRights.exportFailed',
  no_pending_deletion: 'errors.dataRights.noPendingDeletion',
  // Venue owners (D-060)
  not_adult: 'errors.venue.notAdult',
  claim_exists: 'errors.venue.claimExists',
  already_staff: 'errors.venue.alreadyStaff',
  no_operations: 'errors.venue.noOperations',
  no_opening_hours: 'errors.venue.noOpeningHours',
  invalid_opening_hours: 'errors.venue.invalidOpeningHours',
} as const;

/** Supabase Auth error codes (AuthError.code) we explain specifically. */
const AUTH_ERROR_KEYS: Record<string, string> = {
  otp_expired: 'errors.auth.codeInvalid',
  otp_disabled: 'errors.auth.unavailable',
  email_address_invalid: 'errors.auth.emailInvalid',
  validation_failed: 'errors.auth.emailInvalid',
  // The built-in sender only mails project members until custom SMTP is set up.
  email_address_not_authorized: 'errors.auth.emailUnavailable',
  email_provider_disabled: 'errors.auth.unavailable',
  signup_disabled: 'errors.auth.unavailable',
  provider_disabled: 'errors.auth.unavailable',
  over_email_send_rate_limit: 'errors.auth.tooManyCodes',
  over_request_rate_limit: 'errors.rateLimited',
};

export type SqlErrorCode = keyof typeof SQL_ERROR_KEYS;

/** Every key errorKey() can return (a test checks each exists in both locales). */
export const ERROR_KEYS: readonly string[] = [
  ...new Set([
    ...Object.values(SQL_ERROR_KEYS),
    ...Object.values(AUTH_ERROR_KEYS),
    'errors.rateLimited',
    'errors.network',
    'errors.generic',
  ]),
];

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown; name?: unknown } | null;

export function errorKey(error: unknown): string {
  const e = (typeof error === 'object' ? error : null) as ErrorLike;
  const message = (
    typeof e?.message === 'string' ? e.message : typeof error === 'string' ? error : ''
  ).trim();
  const code = typeof e?.code === 'string' ? e.code : '';

  if (Object.hasOwn(SQL_ERROR_KEYS, message)) return SQL_ERROR_KEYS[message as SqlErrorCode];
  if (Object.hasOwn(AUTH_ERROR_KEYS, code)) return AUTH_ERROR_KEYS[code]!;
  if (/token has expired|otp.*(expired|invalid)|invalid.*(otp|token)/i.test(message)) {
    return 'errors.auth.codeInvalid';
  }
  if (e?.status === 429 || /rate limit|too many requests|for security purposes/i.test(message)) {
    return 'errors.rateLimited';
  }
  if (
    e?.name === 'AuthRetryableFetchError' ||
    /network request failed|failed to fetch|fetch failed|network|timeout/i.test(message)
  ) {
    return 'errors.network';
  }
  return 'errors.generic';
}
