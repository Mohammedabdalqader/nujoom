import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  previewFriendRequests,
  previewFriendSuggestions,
  previewFriends,
  previewHome,
  previewMe,
  previewMyClips,
  previewNotifications,
  previewAreas,
  previewPitches,
  previewMatchDay,
  previewLeaderboard,
  previewProfileExtras,
  previewSquad,
  previewGear,
  previewKitty,
} from '@/data/preview';
import type {
  AppNotification,
  Area,
  Clip,
  Friend,
  FriendRequest,
  FriendSuggestion,
  HomeFeed,
  Leaderboard,
  MatchDay,
  Me,
  Pitch,
  ProfileExtras,
  Squad,
  GearList,
  Kitty,
} from '@/data/types';

/**
 * The app's queries (D-019). Each resolves from Supabase once its milestone lands; until then from
 * the typed preview data. Screens only ever see these hooks and the view-model types.
 */
export const keys = {
  me: ['me'] as const,
  friends: ['friends'] as const,
  friendRequests: ['friends', 'requests'] as const,
  friendSuggestions: ['friends', 'suggestions'] as const,
  notifications: ['notifications'] as const,
  home: ['home'] as const,
  myClips: ['clips', 'mine'] as const,
  pitches: ['pitches'] as const,
  areas: ['areas'] as const,
  matchDay: ['match-day'] as const,
  profileExtras: ['profile', 'extras'] as const,
  squad: ['squad'] as const,
  gear: ['gear'] as const,
  kitty: ['kitty'] as const,
  leaderboard: (scope: string, age: string, period: string) =>
    ['leaderboard', scope, age, period] as const,
};

const preview =
  <T>(value: T) =>
  () =>
    // A deep copy so cache edits never mutate the fixtures (JSON-safe data; Hermes has no structuredClone).
    Promise.resolve(JSON.parse(JSON.stringify(value)) as T);

export const useMe = () => useQuery<Me>({ queryKey: keys.me, queryFn: preview(previewMe) });

export const useFriends = () =>
  useQuery<Friend[]>({ queryKey: keys.friends, queryFn: preview(previewFriends) });

export const useFriendRequests = () =>
  useQuery<FriendRequest[]>({
    queryKey: keys.friendRequests,
    queryFn: preview(previewFriendRequests),
  });

export const useFriendSuggestions = () =>
  useQuery<FriendSuggestion[]>({
    queryKey: keys.friendSuggestions,
    queryFn: preview(previewFriendSuggestions),
  });

export const useNotifications = () =>
  useQuery<AppNotification[]>({
    queryKey: keys.notifications,
    queryFn: preview(previewNotifications),
  });

export const useHomeFeed = () =>
  useQuery<HomeFeed>({ queryKey: keys.home, queryFn: preview(previewHome) });

export const useMyClips = () =>
  useQuery<Clip[]>({ queryKey: keys.myClips, queryFn: preview(previewMyClips) });

export const usePitches = () =>
  useQuery<Pitch[]>({ queryKey: keys.pitches, queryFn: preview(previewPitches) });

export const useAreas = () =>
  useQuery<Area[]>({ queryKey: keys.areas, queryFn: preview(previewAreas) });

/** The player's current match: live, next up today, or voting (null when there is none). */
export const useMatchDay = () =>
  useQuery<MatchDay | null>({ queryKey: keys.matchDay, queryFn: preview(previewMatchDay) });

/** Leaderboard for a scope, age group and period (spec §6.10). */
export const useLeaderboard = (scope: string, age: string, period: string) =>
  useQuery<Leaderboard>({
    queryKey: keys.leaderboard(scope, age, period),
    queryFn: preview(previewLeaderboard),
  });

/** Progress charts, stars wallet, endorsements and clip count for the Me tab. */
export const useProfileExtras = () =>
  useQuery<ProfileExtras>({ queryKey: keys.profileExtras, queryFn: preview(previewProfileExtras) });

/** Local cache updates for the preview phase; replaced by mutations with RPCs per milestone. */
/**
 * Card-code lookup for "add a player". R3 turns this into an RPC that only finds players the
 * caller may see: public or city-visible, same age band (D-023).
 */
/** The next match's squad for the match tools (R2: the booking's players with their form). */
export const useSquad = () =>
  useQuery<Squad>({ queryKey: keys.squad, queryFn: preview(previewSquad) });

/** The next match's shared gear checklist (R3: one list per booking, edited by its players). */
export const useGear = () =>
  useQuery<GearList>({ queryKey: keys.gear, queryFn: preview(previewGear) });

/** The next match's kitty (R3: the booking's price and each player's payment mark). */
export const useKitty = () =>
  useQuery<Kitty>({ queryKey: keys.kitty, queryFn: preview(previewKitty) });

export async function findPlayerByCardCode(code: string): Promise<FriendSuggestion | null> {
  const known = [...previewFriendSuggestions, ...previewFriendRequests.map((r) => r.from)];
  return known.find((p) => p.cardCode === code) ?? null;
}

export function useCache() {
  const client = useQueryClient();
  return {
    update<T>(key: readonly unknown[], fn: (old: T) => T) {
      client.setQueryData<T>(key, (old) => (old === undefined ? old : fn(old)));
    },
  };
}
