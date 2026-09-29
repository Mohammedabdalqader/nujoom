import type {
  AppConfig,
  ConsentVersions,
  FeatureFlag,
  GuardianState,
  JourneyStage,
  PlayerPosition,
  DominantFoot,
  ProfileVisibility,
} from '@nujoom/shared';

import type { BookingDetails, BookingReceipt, BookingRequest, DaySlots } from '@/data/booking';
import type { CatalogDetail, CatalogFilters, CatalogPage } from '@/data/catalog';
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
  Bilingual,
} from '@/data/types';

export type Session = { userId: string; email: string | null };

/** The signed-in user's account state: where the journey stands and what they may do. */
export type Account = {
  userId: string;
  email: string | null;
  stage: Exclude<JourneyStage, 'auth'>;
  isYouth: boolean;
  guardian: GuardianState;
  /** The player's own recording yes (C-010). */
  recordingConsent: boolean;
  /** Recording yes + (youth) a confirmed guardian's yes. */
  canJoinRecorded: boolean;
  visibility: ProfileVisibility | null;
  settings: { locale: 'ar' | 'en'; sharePresence: boolean; shareInMatch: boolean };
  /** A youth's guardian links, pending and confirmed (empty for adults). */
  guardians: GuardianLink[];
};

/** One guardian a youth named (S1-11). `sentAt` is set only after the email went out. */
export type GuardianLink = {
  id: string;
  email: string;
  status: 'pending' | 'confirmed';
  sentAt: string | null;
  expiresAt: string | null;
};

/** What an invited guardian sees before approving: never more than the youth's name. */
export type GuardianInvite = {
  youthName: string;
  expiresAt: string | null;
  /** The guardian has no account profile yet: approving asks for their name and date of birth. */
  needsDetails: boolean;
};

export type GuardianApproval = {
  visibility: ProfileVisibility;
  /** The guardian's own recording decision for this youth; null leaves it unanswered (C-010). */
  recording: boolean | null;
  /** Only for a guardian without an account profile: their name and adult date of birth. */
  name?: string;
  dob?: string;
};

/** A "download my data" or "delete my account" request (S1-9, D-038). */
export type DataRequest = {
  id: string;
  kind: 'export' | 'deletion';
  status: 'pending' | 'ready' | 'completed' | 'cancelled' | 'failed';
  requestedAt: string;
  /** Deletion: when the grace period ends. */
  scheduledFor: string;
  /** Export: when the download link stops working. */
  expiresAt: string | null;
};

export type DataRightsApi = {
  /** The user's recent requests, newest first. */
  list(): Promise<DataRequest[]>;
  /** Builds (or reuses) the data bundle and returns a signed download link (Edge Function). */
  requestExport(): Promise<{ url: string; expiresAt: string }>;
  /** Schedules deletion after the grace period (idempotent). */
  requestDeletion(): Promise<DataRequest>;
  cancelDeletion(): Promise<DataRequest>;
};

export type GuardianApi = {
  /** The youth names (or corrects) the guardian's email; returns the pending link's id. */
  name(email: string): Promise<string>;
  /** The youth's guardian links, fresh from the server. */
  links(): Promise<GuardianLink[]>;
  /**
   * Emails the approval link (Edge Function `guardian-invite`). Resolves only when the email
   * went out; otherwise throws with a code (`email_failed`, `invite_rate_limited`, …).
   */
  sendInvite(linkId: string, locale: 'ar' | 'en'): Promise<void>;
  /** The invited guardian's view of a token; null when it isn't theirs, is used or expired. */
  preview(token: string): Promise<GuardianInvite | null>;
  accept(token: string, approval: GuardianApproval): Promise<void>;
  decline(token: string): Promise<void>;
};

/** Booking (contract agentic_system/contracts/booking.md). The server decides every outcome. */
export type BookingApi = {
  /** A verified field's slots for one Amman day (YYYY-MM-DD): free, busy or past. */
  daySlots(pitchId: string, date: string): Promise<DaySlots>;
  /** Books a slot; retries a lost request with the same request id (never books twice). */
  create(request: BookingRequest): Promise<BookingReceipt>;
  /** Bookings the player organizes or plays in: upcoming and the last 30 days. */
  mine(): Promise<BookingReceipt[]>;
  /** null when it doesn't exist or isn't theirs to see. */
  details(bookingId: string): Promise<BookingDetails | null>;
  cancel(bookingId: string): Promise<BookingReceipt>;
};

export type City = {
  id: number;
  name: Bilingual;
  neighborhoods: { id: number; name: Bilingual }[];
};

export type OnboardingSubmit = {
  displayName: string;
  dob: string;
  cityId: number;
  neighborhoodId: number | null;
  position: PlayerPosition;
  dominantFoot: DominantFoot | null;
  handle: string | null;
  shirtNumber: number | null;
  visibility: ProfileVisibility;
  /** complete_onboarding's p_consents (see consentPayload in @nujoom/shared). */
  consents: Record<string, string | false>;
};

export type AuthApi = {
  current(): Promise<Session | null>;
  /** Calls back on sign-in, sign-out and token refresh; returns an unsubscribe function. */
  subscribe(listener: (session: Session | null) => void): () => void;
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  /** Google through the system browser; 'cancelled' when the user backed out. */
  google(): Promise<'signed_in' | 'cancelled'>;
  /** Finishes a magic-link sign-in from the PKCE code in the link. */
  completeLink(code: string): Promise<void>;
  signOut(): Promise<void>;
};

/**
 * Where the app's data comes from (contract §2, §7). Screens never see this; they use the hooks
 * in `src/data/api.ts`. The demo build reads labelled fixtures and has no backend credentials;
 * the production build reads Supabase and can never fall back to fixtures (C-005).
 */
export type DataSource = {
  auth: AuthApi;
  account(): Promise<Account>;
  onboardingOptions(): Promise<{ cities: City[]; consentVersions: ConsentVersions }>;
  completeOnboarding(input: OnboardingSubmit): Promise<Account>;
  setSettings(patch: Partial<Account['settings']>): Promise<Account>;
  setVisibility(visibility: ProfileVisibility): Promise<Account>;
  setRecordingConsent(granted: boolean): Promise<Account>;
  /** Re-accepts the current terms and privacy versions (the `consent` stage). */
  acceptCurrentConsents(): Promise<Account>;
  guardian: GuardianApi;
  dataRights: DataRightsApi;
  booking: BookingApi;
  /** Replaces the profile photo with an already cropped, resized image (S1-7). */
  setAvatar(image: { uri: string; mimeType: 'image/jpeg' | 'image/webp' }): Promise<void>;
  removeAvatar(): Promise<void>;
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
  /** The prepared catalog (D1a): both badges, unknown facts stay unknown. */
  searchPitches(filters: CatalogFilters): Promise<CatalogPage>;
  /** One field's detail; null when it isn't searchable. */
  catalogPitch(pitchId: string): Promise<CatalogDetail | null>;
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
