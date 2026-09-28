// Mirrors the guardians.contact_email check in supabase/migrations/*_identity.sql.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Trims and lower-cases an email address; returns null when it is not a plausible address. */
export function normalizeEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  return EMAIL.test(value) && value.length <= 254 ? value : null;
}
