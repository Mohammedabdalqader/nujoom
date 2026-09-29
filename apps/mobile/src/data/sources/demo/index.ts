import { DEFAULT_CONFIG, DEFAULT_FEATURE_FLAGS } from '@nujoom/shared';

import type { Account, DataSource } from '@/data/source';

import { demoBooking } from './booking';
import { demoCatalogPitch, searchDemoCatalog } from './catalog';

import {
  DEMO_FIXTURE_MARKER,
  previewAreas,
  previewClips,
  previewFriendRequests,
  previewFriendSuggestions,
  previewFriends,
  previewGear,
  previewHome,
  previewKitty,
  previewLeaderboard,
  previewMatchDay,
  previewMatchDetails,
  previewMe,
  previewMyClips,
  previewNotifications,
  previewPitches,
  previewProfileExtras,
  previewSquad,
} from './fixtures';

/** A deep copy, so cache edits never mutate the fixtures (JSON-safe data; Hermes has no structuredClone). */
const copy = <T>(value: T): Promise<T> => Promise.resolve(JSON.parse(JSON.stringify(value)) as T);

/**
 * The demo build's data: labelled sample players, venues, matches and illustrative images
 * (contract §7). It never talks to a backend, and demo actions stay on the device.
 */
/** The demo persona is always signed in; sign-in screens exist only in production. */
let demoAccount: Account = {
  userId: 'me',
  email: null,
  stage: 'app',
  isYouth: false,
  guardian: 'none',
  recordingConsent: true,
  canJoinRecorded: true,
  visibility: 'public',
  settings: { locale: 'ar', sharePresence: true, shareInMatch: false },
  guardians: [],
};
const update = (patch: Partial<Account>) => {
  demoAccount = { ...demoAccount, ...patch };
  return copy(demoAccount);
};
const demoOnly = () => Promise.reject(new Error('demo_only'));

export const demoSource: DataSource & { marker: string } = {
  marker: DEMO_FIXTURE_MARKER,
  auth: {
    current: () => Promise.resolve({ userId: 'me', email: null }),
    subscribe: () => () => {},
    sendCode: demoOnly,
    verifyCode: demoOnly,
    google: demoOnly,
    completeLink: demoOnly,
    signOut: () => Promise.resolve(),
  },
  account: () => copy(demoAccount),
  onboardingOptions: () =>
    copy({
      cities: [],
      consentVersions: { terms: 'demo', privacy: 'demo', recording: 'demo' },
    }),
  completeOnboarding: () => copy(demoAccount),
  setSettings: (patch) => update({ settings: { ...demoAccount.settings, ...patch } }),
  setVisibility: (visibility) => update({ visibility }),
  acceptCurrentConsents: () => copy(demoAccount),
  setAvatar: demoOnly,
  removeAvatar: demoOnly,
  // Nothing to download or delete on the device-only demo.
  dataRights: {
    list: () => copy([]),
    requestExport: demoOnly,
    requestDeletion: demoOnly,
    cancelDeletion: demoOnly,
  },
  booking: demoBooking,
  // The demo persona is an adult: there is no guardian flow to show.
  guardian: {
    name: demoOnly,
    links: () => copy([]),
    sendInvite: demoOnly,
    preview: () => Promise.resolve(null),
    accept: demoOnly,
    decline: demoOnly,
  },
  setRecordingConsent: (granted) => update({ recordingConsent: granted, canJoinRecorded: granted }),
  me: () => copy(previewMe),
  friends: () => copy(previewFriends),
  friendRequests: () => copy(previewFriendRequests),
  friendSuggestions: () => copy(previewFriendSuggestions),
  findPlayerByCardCode: (code) =>
    copy(
      [...previewFriendSuggestions, ...previewFriendRequests.map((r) => r.from)].find(
        (p) => p.cardCode === code,
      ) ?? null,
    ),
  notifications: () => copy(previewNotifications),
  homeFeed: () => copy(previewHome),
  myClips: () => copy(previewMyClips),
  clip: (id) => copy([...previewClips, ...previewMyClips].find((c) => c.id === id) ?? null),
  pitches: () => copy(previewPitches),
  searchPitches: (filters) => copy(searchDemoCatalog(filters)),
  catalogPitch: (id) => copy(demoCatalogPitch(id)),
  areas: () => copy(previewAreas),
  matchDay: () => copy(previewMatchDay),
  matchDetails: (bookingId) =>
    copy(previewMatchDetails.bookingId === bookingId ? previewMatchDetails : null),
  leaderboard: () => copy(previewLeaderboard),
  profileExtras: () => copy(previewProfileExtras),
  squad: () => copy(previewSquad),
  gear: () => copy(previewGear),
  kitty: () => copy(previewKitty),
  config: () => copy(DEFAULT_CONFIG),
  flags: () => copy(DEFAULT_FEATURE_FLAGS),
};
