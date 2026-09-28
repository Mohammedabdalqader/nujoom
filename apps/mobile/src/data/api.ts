import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  previewFriends,
  previewHome,
  previewMe,
  previewMyClips,
  previewNotifications,
  previewAreas,
  previewPitches,
} from '@/data/preview';
import type { AppNotification, Area, Clip, Friend, HomeFeed, Me, Pitch } from '@/data/types';

/**
 * The app's queries (D-019). Each resolves from Supabase once its milestone lands; until then from
 * the typed preview data. Screens only ever see these hooks and the view-model types.
 */
export const keys = {
  me: ['me'] as const,
  friends: ['friends'] as const,
  notifications: ['notifications'] as const,
  home: ['home'] as const,
  myClips: ['clips', 'mine'] as const,
  pitches: ['pitches'] as const,
  areas: ['areas'] as const,
};

const preview =
  <T>(value: T) =>
  () =>
    // A deep copy so cache edits never mutate the fixtures (JSON-safe data; Hermes has no structuredClone).
    Promise.resolve(JSON.parse(JSON.stringify(value)) as T);

export const useMe = () => useQuery<Me>({ queryKey: keys.me, queryFn: preview(previewMe) });

export const useFriends = () =>
  useQuery<Friend[]>({ queryKey: keys.friends, queryFn: preview(previewFriends) });

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

/** Local cache updates for the preview phase; replaced by mutations with RPCs per milestone. */
export function useCache() {
  const client = useQueryClient();
  return {
    update<T>(key: readonly unknown[], fn: (old: T) => T) {
      client.setQueryData<T>(key, (old) => (old === undefined ? old : fn(old)));
    },
  };
}
