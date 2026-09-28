import type { AppConfig, FeatureFlag } from '@nujoom/shared';

import type {
  AppNotification,
  Area,
  Clip,
  Friend,
  FriendRequest,
  FriendSuggestion,
  GearList,
  HomeFeed,
  Kitty,
  Leaderboard,
  MatchDay,
  MatchDetails,
  Me,
  Pitch,
  ProfileExtras,
  Squad,
} from '@/data/types';

/**
 * Where the app's data comes from (contract §2, §7). Screens never see this; they use the hooks
 * in `src/data/api.ts`. The demo build reads labelled fixtures and has no backend credentials;
 * the production build reads Supabase and can never fall back to fixtures (C-005).
 */
export type DataSource = {
  me(): Promise<Me>;
  friends(): Promise<Friend[]>;
  friendRequests(): Promise<FriendRequest[]>;
  friendSuggestions(): Promise<FriendSuggestion[]>;
  findPlayerByCardCode(code: string): Promise<FriendSuggestion | null>;
  notifications(): Promise<AppNotification[]>;
  homeFeed(): Promise<HomeFeed>;
  myClips(): Promise<Clip[]>;
  clip(id: string): Promise<Clip | null>;
  pitches(): Promise<Pitch[]>;
  areas(): Promise<Area[]>;
  matchDay(): Promise<MatchDay | null>;
  matchDetails(bookingId: string): Promise<MatchDetails | null>;
  leaderboard(scope: string, age: string, period: string): Promise<Leaderboard>;
  profileExtras(): Promise<ProfileExtras>;
  squad(): Promise<Squad>;
  gear(): Promise<GearList>;
  kitty(): Promise<Kitty>;
  config(): Promise<AppConfig>;
  flags(): Promise<Partial<Record<FeatureFlag, boolean>>>;
};

export type BackendConfig = { url: string; anonKey: string };

export type BuildEnv = {
  variant: string | undefined;
  /** Development bundles (`__DEV__`) without a variant run the demo; release bundles never do. */
  dev?: boolean;
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
};

/** A build that can't be trusted to show real data refuses to start instead of guessing. */
export class ConfigError extends Error {
  constructor(readonly reason: 'variant' | 'backend') {
    super(
      reason === 'variant'
        ? 'EXPO_PUBLIC_APP_VARIANT must be "production" or "demo".'
        : 'Production builds need EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
    this.name = 'ConfigError';
  }
}

/**
 * Picks the source for a build: demo → fixtures; production → Supabase with valid config;
 * anything else throws. Pure, so the rule is unit-tested; `getSource()` feeds it the real build
 * environment and loaders.
 */
export function selectSource(
  env: BuildEnv,
  load: { demo: () => DataSource; supabase: (config: BackendConfig) => DataSource },
): DataSource {
  if (env.variant === 'demo' || (env.dev === true && !env.variant)) return load.demo();
  if (env.variant !== 'production') throw new ConfigError('variant');
  const url = env.supabaseUrl?.trim();
  const anonKey = env.supabaseAnonKey?.trim();
  if (!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !anonKey) {
    throw new ConfigError('backend');
  }
  return load.supabase({ url, anonKey });
}

let current: DataSource | undefined;

export function getSource(): DataSource {
  current ??= selectSource(
    {
      variant: process.env.EXPO_PUBLIC_APP_VARIANT,
      dev: __DEV__,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    {
      // The literal comparison is folded at build time (the variant is inlined), so production
      // bundles don't contain the demo module at all. scripts/check-production-bundle.mjs checks.
      demo: () => {
        if (process.env.EXPO_PUBLIC_APP_VARIANT === 'demo' || __DEV__) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports -- build-time exclusion
          return (require('./sources/demo') as typeof import('./sources/demo')).demoSource;
        }
        throw new ConfigError('variant');
      },
      supabase: (config) =>
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- keep demo builds free of the client
        (require('./sources/supabase') as typeof import('./sources/supabase')).createSupabaseSource(
          config,
        ),
    },
  );
  return current;
}
