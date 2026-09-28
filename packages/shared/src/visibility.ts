import type { ProfileVisibility } from './onboarding';

/**
 * Client-side mirror of `private.can_view_profile` (supabase/migrations/*_identity.sql). The
 * database is the authority; this exists so screens can explain who will see what.
 */
export type ViewerContext = {
  viewerId: string | null;
  viewerCityId: number | null;
  isAdmin: boolean;
  guardianOf: readonly string[];
};

export type ProfileAccessFacts = {
  id: string;
  visibility: ProfileVisibility;
  isYouth: boolean;
  cityId: number | null;
};

export function canViewProfile(viewer: ViewerContext, target: ProfileAccessFacts): boolean {
  if (viewer.viewerId === target.id) return true;
  if (target.visibility === 'public') return true;
  if (viewer.viewerId === null) return false;
  // For youth, 'city' means city leaderboards only, never the profile (spec §7).
  if (
    target.visibility === 'city' &&
    !target.isYouth &&
    target.cityId !== null &&
    target.cityId === viewer.viewerCityId
  ) {
    return true;
  }
  return viewer.guardianOf.includes(target.id) || viewer.isAdmin;
}

/** Adults choose their own visibility; a youth's is set by their guardian (spec §7). */
export function canEditOwnVisibility(profile: { isYouth: boolean }): boolean {
  return !profile.isYouth;
}

/** Most restrictive confirmed guardian choice; private with none. Mirrors private.youth_visibility. */
export function youthVisibility(confirmedChoices: readonly ProfileVisibility[]): ProfileVisibility {
  if (confirmedChoices.length === 0 || confirmedChoices.includes('private')) return 'private';
  if (confirmedChoices.includes('city')) return 'city';
  return 'public';
}
