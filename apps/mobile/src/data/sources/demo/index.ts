import { DEFAULT_CONFIG, DEFAULT_FEATURE_FLAGS } from '@nujoom/shared';

import type { DataSource } from '@/data/source';

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
export const demoSource: DataSource & { marker: string } = {
  marker: DEMO_FIXTURE_MARKER,
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
