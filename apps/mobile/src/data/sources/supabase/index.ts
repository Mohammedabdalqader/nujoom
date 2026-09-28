import {
  DEFAULT_CONFIG,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAGS,
  parseConfigValue,
  parseStage,
  type AppConfig,
  type ConfigKey,
  type ConsentVersions,
  type FeatureFlag,
  type GuardianState,
} from '@nujoom/shared';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type {
  Account,
  BackendConfig,
  City,
  DataSource,
  GuardianLink,
  Session,
} from '@/data/source';
import type { Me, Position } from '@/data/types';
import { createSupabase } from '@/lib/supabase';

/**
 * The production source (contract §2). Identity reads and writes go through the RPCs of the
 * identity migration; features from later slices return honest empty values until they're wired,
 * so a real account sees empty states and never sample players, bookings, ratings or slots (C-004).
 */

/** What public.me() returns (supabase/migrations/*_identity.sql). */
type MeRow = {
  id: string;
  email: string | null;
  stage: string;
  display_name?: string;
  handle?: string | null;
  card_code?: string;
  city_id?: number | null;
  neighborhood_id?: number | null;
  position?: Position | null;
  shirt_number?: number | null;
  avatar_path?: string | null;
  visibility?: 'public' | 'city' | 'private';
  is_youth?: boolean;
  guardian?: GuardianState;
  recording_consent?: boolean;
  can_join_recorded?: boolean;
  settings?: { locale?: string; share_presence?: boolean; share_in_match?: boolean };
  guardians?: GuardianLinkRow[];
};

/** private.guardian_links_json (supabase/migrations/*_guardian_invites.sql). */
type GuardianLinkRow = {
  id: string;
  contact_email: string;
  status: string;
  invite_sent_at: string | null;
  invite_expires_at: string | null;
};

const toGuardianLinks = (rows: GuardianLinkRow[] | null | undefined): GuardianLink[] =>
  (rows ?? []).flatMap((row) =>
    row.status === 'pending' || row.status === 'confirmed'
      ? [
          {
            id: row.id,
            email: row.contact_email,
            status: row.status,
            sentAt: row.invite_sent_at,
            expiresAt: row.invite_expires_at,
          },
        ]
      : [],
  );

/** FIFA-style card tag per position. */
const POSITION_TAG: Record<Position, string> = { GK: 'GK', DEF: 'CB', MID: 'CM', FWD: 'ST' };

const toAccount = (raw: MeRow): Account => ({
  userId: raw.id,
  email: raw.email ?? null,
  stage: parseStage(raw.stage) as Account['stage'],
  isYouth: raw.is_youth ?? true, // fail closed
  guardian: raw.guardian ?? 'none',
  recordingConsent: raw.recording_consent === true,
  canJoinRecorded: raw.can_join_recorded === true,
  visibility: raw.visibility ?? null,
  settings: {
    locale: raw.settings?.locale === 'en' ? 'en' : 'ar',
    sharePresence: raw.settings?.share_presence === true,
    shareInMatch: raw.settings?.share_in_match === true,
  },
  guardians: toGuardianLinks(raw.guardians),
});

export function createSupabaseSource(config: BackendConfig): DataSource {
  const db = createSupabase(config);
  WebBrowser.maybeCompleteAuthSession(); // web: finishes the Google popup

  async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await db.rpc(fn, args);
    if (error) throw error;
    return data as T;
  }

  const toSession = (s: { user: { id: string; email?: string | null } } | null): Session | null =>
    s ? { userId: s.user.id, email: s.user.email ?? null } : null;

  let places: Promise<{ cities: City[]; country: { ar: string; en: string } }> | null = null;
  const loadPlaces = () =>
    (places ??= (async () => {
      const [cities, hoods, country] = await Promise.all([
        db.from('cities').select('id, name_ar, name_en').eq('is_active', true).order('sort_order'),
        db.from('neighborhoods').select('id, city_id, name_ar, name_en').eq('is_active', true),
        db.from('countries').select('name_ar, name_en').eq('code', 'JO').maybeSingle(),
      ]);
      const error = cities.error ?? hoods.error ?? country.error;
      if (error) {
        places = null; // retry next time
        throw error;
      }
      const byCity = new Map<number, City['neighborhoods']>();
      for (const h of hoods.data ?? []) {
        const list = byCity.get(h.city_id) ?? [];
        list.push({ id: h.id, name: { ar: h.name_ar, en: h.name_en } });
        byCity.set(h.city_id, list);
      }
      for (const list of byCity.values()) list.sort((a, b) => a.name.ar.localeCompare(b.name.ar, 'ar'));
      return {
        cities: (cities.data ?? []).map((c) => ({
          id: c.id,
          name: { ar: c.name_ar, en: c.name_en },
          neighborhoods: byCity.get(c.id) ?? [],
        })),
        country: country.data
          ? { ar: country.data.name_ar, en: country.data.name_en }
          : { ar: 'الأردن', en: 'Jordan' },
      };
    })());

  async function consentVersions(): Promise<ConsentVersions> {
    const { data, error } = await db
      .from('config')
      .select('value')
      .eq('key', 'consent_versions')
      .single();
    if (error) throw error;
    return data.value as ConsentVersions;
  }

  const none = <T>(value: T) => Promise.resolve(value);

  return {
    auth: {
      async current() {
        const { data } = await db.auth.getSession();
        return toSession(data.session);
      },
      subscribe(listener) {
        const { data } = db.auth.onAuthStateChange((_event, session) =>
          listener(toSession(session)),
        );
        return () => data.subscription.unsubscribe();
      },
      async sendCode(email) {
        const { error } = await db.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('auth-callback') },
        });
        if (error) throw error;
      },
      async verifyCode(email, code) {
        const { error } = await db.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) throw error;
      },
      async google() {
        const redirectTo = Linking.createURL('auth-callback');
        const { data, error } = await db.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return 'cancelled';
        const code = new URL(result.url).searchParams.get('code');
        if (!code) throw new Error('otp_expired');
        const exchanged = await db.auth.exchangeCodeForSession(code);
        if (exchanged.error) throw exchanged.error;
        return 'signed_in';
      },
      async completeLink(code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (error) throw error;
      },
      async signOut() {
        const { error } = await db.auth.signOut({ scope: 'local' });
        if (error) throw error;
      },
    },

    account: async () => toAccount(await rpc<MeRow>('me')),
    async onboardingOptions() {
      const [{ cities }, versions] = await Promise.all([loadPlaces(), consentVersions()]);
      return { cities, consentVersions: versions };
    },
    async completeOnboarding(input) {
      const raw = await rpc<MeRow>('complete_onboarding', {
        p_display_name: input.displayName,
        p_dob: input.dob,
        p_city_id: input.cityId,
        p_neighborhood_id: input.neighborhoodId,
        p_position: input.position,
        p_consents: input.consents,
        p_dominant_foot: input.dominantFoot,
        p_handle: input.handle,
        p_visibility: input.visibility,
        p_shirt_number: input.shirtNumber,
      });
      return toAccount(raw);
    },
    async setSettings(patch) {
      const body: Record<string, unknown> = {};
      if (patch.locale) body.locale = patch.locale;
      if (patch.sharePresence !== undefined) body.share_presence = patch.sharePresence;
      if (patch.shareInMatch !== undefined) body.share_in_match = patch.shareInMatch;
      return toAccount(await rpc<MeRow>('set_settings', { p_patch: body }));
    },
    setVisibility: async (visibility) =>
      toAccount(await rpc<MeRow>('set_visibility', { p_visibility: visibility })),
    async acceptCurrentConsents() {
      const versions = await consentVersions();
      await rpc('record_consent', { p_type: 'terms', p_version: versions.terms, p_granted: true });
      return toAccount(
        await rpc<MeRow>('record_consent', {
          p_type: 'privacy',
          p_version: versions.privacy,
          p_granted: true,
        }),
      );
    },
    guardian: {
      async name(email) {
        const raw = await rpc<{ link_id: string }>('name_guardian', { p_email: email });
        return raw.link_id;
      },
      links: async () => toGuardianLinks(await rpc<GuardianLinkRow[]>('my_guardians')),
      async sendInvite(linkId, locale) {
        const { data, error } = await db.functions.invoke<{ sent?: boolean }>('guardian-invite', {
          body: { linkId, locale },
        });
        if (error instanceof FunctionsHttpError) {
          const body = (await (error.context as Response)
            .json()
            .catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'email_failed');
        }
        if (error instanceof FunctionsFetchError) throw new Error('fetch failed');
        if (error) throw error;
        if (data?.sent !== true) throw new Error('email_failed');
      },
      async preview(token) {
        const raw = await rpc<{ youth_name: string; expires_at: string | null } | null>(
          'guardian_invite_preview',
          { p_token: token },
        );
        return raw ? { youthName: raw.youth_name, expiresAt: raw.expires_at } : null;
      },
      async accept(token, approval) {
        await rpc('accept_guardian_invite', {
          p_token: token,
          p_visibility: approval.visibility,
          p_recording: approval.recording,
          p_guardian_name: approval.name ?? null,
          p_guardian_dob: approval.dob ?? null,
        });
      },
      async decline(token) {
        await rpc('decline_guardian_invite', { p_token: token });
      },
    },
    async setRecordingConsent(granted) {
      const version = granted ? (await consentVersions()).recording : null;
      return toAccount(
        await rpc<MeRow>('record_consent', {
          p_type: 'recording',
          p_version: version,
          p_granted: granted,
        }),
      );
    },

    async me(): Promise<Me> {
      const raw = await rpc<MeRow>('me');
      if (raw.stage === 'onboarding' || !raw.display_name || !raw.position || !raw.card_code) {
        throw new Error('not_onboarded');
      }
      const { cities, country } = await loadPlaces();
      const city = cities.find((c) => c.id === raw.city_id);
      const neighborhood = city?.neighborhoods.find((n) => n.id === raw.neighborhood_id);
      let avatarUrl: string | null = null;
      if (raw.avatar_path) {
        const signed = await db.storage.from('avatars').createSignedUrl(raw.avatar_path, 3600);
        avatarUrl = signed.data?.signedUrl ?? null; // initials if the photo can't be read
      }
      const year = new Date().getFullYear();
      return {
        id: raw.id,
        name: raw.display_name,
        firstName: raw.display_name.split(' ')[0] ?? raw.display_name,
        handle: raw.handle ?? null,
        avatarUrl,
        city: city?.name ?? { ar: '', en: '' },
        country,
        countryCode: 'JO',
        neighborhood: neighborhood?.name ?? null,
        position: raw.position,
        positionTag: POSITION_TAG[raw.position],
        cardCode: raw.card_code,
        shirtNumber: raw.shirt_number ?? null,
        isYouth: raw.is_youth ?? true,
        visibility: raw.visibility ?? 'private',
        // Ratings, stats and progression arrive with slice 6; until then honest zeros and nulls.
        rankingEligible: false,
        form: null,
        formChange30d: null,
        formConfidence: null,
        ovr: null,
        attributes: null,
        elo: null,
        shareUrl: null,
        stats: { matches: 0, goals: 0, assists: 0, mvps: 0 },
        lastFive: [],
        season: String(year),
        xp: 0,
        editionYear: year,
      };
    },

    friends: () => none([]),
    friendRequests: () => none([]),
    friendSuggestions: () => none([]),
    findPlayerByCardCode: () => none(null),
    notifications: () => none([]),
    homeFeed: () => none({ nextMatch: null, missingOne: [], trendingClips: [], pulse: [] }),
    myClips: () => none([]),
    clip: () => none(null),
    pitches: () => none([]),
    async areas() {
      // The pitch filter's areas are Amman's neighbourhoods (real reference data).
      const { cities } = await loadPlaces();
      return (cities[0]?.neighborhoods ?? []).map((n) => ({ slug: String(n.id), name: n.name }));
    },
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

    async config(): Promise<AppConfig> {
      const { data, error } = await db.from('config').select('key, value');
      if (error) return DEFAULT_CONFIG;
      const out = { ...DEFAULT_CONFIG } as Record<ConfigKey, unknown>;
      for (const row of data ?? []) {
        if (row.key in DEFAULT_CONFIG) {
          out[row.key as ConfigKey] = parseConfigValue(row.key as ConfigKey, row.value);
        }
      }
      return out as AppConfig;
    },
    async flags() {
      const { data, error } = await db.from('feature_flags').select('key, enabled');
      if (error) return DEFAULT_FEATURE_FLAGS;
      const out: Partial<Record<FeatureFlag, boolean>> = {};
      for (const row of data ?? []) {
        if ((FEATURE_FLAGS as readonly string[]).includes(row.key)) {
          out[row.key as FeatureFlag] = row.enabled === true;
        }
      }
      return out;
    },
  };
}
