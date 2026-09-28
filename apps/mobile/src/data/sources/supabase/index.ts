import { DEFAULT_CONFIG, DEFAULT_FEATURE_FLAGS } from '@nujoom/shared';

import type { BackendConfig, DataSource } from '@/data/source';

/**
 * The production source (contract §2). Each feature is wired to Supabase in its slice; until
 * then it returns honest empty values, so a real account sees empty states and never sample
 * players, bookings, ratings or slots (C-004). `me()` lands with the session in S1-5/S1-6.
 */
export function createSupabaseSource(config: BackendConfig): DataSource {
  void config; // the Supabase client arrives in S1-5
  const none = <T>(value: T) => Promise.resolve(value);
  return {
    me: () => Promise.reject(new Error('not_authenticated')),
    friends: () => none([]),
    friendRequests: () => none([]),
    friendSuggestions: () => none([]),
    findPlayerByCardCode: () => none(null),
    notifications: () => none([]),
    homeFeed: () => none({ nextMatch: null, missingOne: [], trendingClips: [], pulse: [] }),
    myClips: () => none([]),
    clip: () => none(null),
    pitches: () => none([]),
    areas: () => none([]),
    matchDay: () => none(null),
    matchDetails: () => none(null),
    leaderboard: () => none({ standings: [], playerOfWeek: null, rows: [], me: null }),
    profileExtras: () =>
      none({
        progress: [],
        wallet: {
          balance: 0,
          totalEarned: 0,
          transactions: [],
          counts: { match_counted: 0, mvp: 0, hat_trick: 0, tournament_win: 0 },
        },
        endorsements: [],
        clipsCount: 0,
      }),
    squad: () => none({ bookingId: null, pitchName: null, players: [] }),
    gear: () => none({ bookingId: null, pitchName: null, startsAt: null, size: 5, items: [] }),
    kitty: () =>
      none({ bookingId: null, pitchName: null, pitchCost: 0, extrasCost: 0, players: [] }),
    // S1-6 reads public.config and public.feature_flags; until then the safe shared defaults.
    config: () => none(DEFAULT_CONFIG),
    flags: () => none(DEFAULT_FEATURE_FLAGS),
  };
}
