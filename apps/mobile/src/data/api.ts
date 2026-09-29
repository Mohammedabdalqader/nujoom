import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  BookingDetails,
  BookingReceipt,
  BookingRequest,
  DaySlots,
  InviteLink,
  InvitePreview,
} from '@/data/booking';
import { getSource } from '@/data/source';
import type {
  CatalogDetail,
  CatalogFilters,
  CatalogListing,
  CatalogPage,
  CityCounts,
} from '@/data/catalog';
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
  MatchDetails,
} from '@/data/types';

/**
 * The app's queries (D-019, contract §2). Each reads the build's data source: labelled fixtures
 * in the demo build, Supabase in production (`src/data/source.ts`). Screens only ever see these
 * hooks and the view-model types.
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
  matchDetails: (bookingId: string) => ['match-details', bookingId] as const,
  clip: (id: string) => ['clip', id] as const,
  leaderboard: (scope: string, age: string, period: string) =>
    ['leaderboard', scope, age, period] as const,
  daySlots: (pitchId: string, date: string) => ['day-slots', pitchId, date] as const,
  myBookings: ['bookings', 'mine'] as const,
  booking: (id: string) => ['bookings', id] as const,
  invite: (bookingId: string) => ['bookings', bookingId, 'invite'] as const,
  invitePreview: (token: string) => ['invite-preview', token] as const,
  favorites: ['catalog', 'favorites'] as const,
};

export const useMe = () => useQuery<Me>({ queryKey: keys.me, queryFn: () => getSource().me() });

export const useFriends = () =>
  useQuery<Friend[]>({ queryKey: keys.friends, queryFn: () => getSource().friends() });

export const useFriendRequests = () =>
  useQuery<FriendRequest[]>({
    queryKey: keys.friendRequests,
    queryFn: () => getSource().friendRequests(),
  });

export const useFriendSuggestions = () =>
  useQuery<FriendSuggestion[]>({
    queryKey: keys.friendSuggestions,
    queryFn: () => getSource().friendSuggestions(),
  });

export const useNotifications = () =>
  useQuery<AppNotification[]>({
    queryKey: keys.notifications,
    queryFn: () => getSource().notifications(),
  });

export const useHomeFeed = () =>
  useQuery<HomeFeed>({ queryKey: keys.home, queryFn: () => getSource().homeFeed() });

export const useMyClips = () =>
  useQuery<Clip[]>({ queryKey: keys.myClips, queryFn: () => getSource().myClips() });

export const usePitches = () =>
  useQuery<Pitch[]>({ queryKey: keys.pitches, queryFn: () => getSource().pitches() });

/** The prepared pitch catalog (D1a): search both badges with filters; one page per query. */
export const useCatalogSearch = (filters: CatalogFilters) =>
  useQuery<CatalogPage>({
    queryKey: ['catalog', filters],
    queryFn: () => getSource().searchPitches(filters),
  });

/** A city's published, verified and bookable counts (D-075), for honest empty states. */
export const useCatalogCityCounts = (cityId: number | undefined) =>
  useQuery<CityCounts>({
    queryKey: ['catalog', 'city-counts', cityId],
    queryFn: () => getSource().catalogCityCounts(cityId!),
    enabled: cityId !== undefined,
  });

export const useCatalogPitch = (pitchId: string | undefined) =>
  useQuery<CatalogDetail | null>({
    queryKey: ['catalog-pitch', pitchId],
    queryFn: () => getSource().catalogPitch(pitchId!),
    enabled: !!pitchId,
  });

/** The player's favourite fields (D-086). */
export const useFavoritePitches = () =>
  useQuery<CatalogListing[]>({
    queryKey: keys.favorites,
    queryFn: () => getSource().favoritePitches(),
  });

/** Adds or removes a favourite; the list refetches from the server either way. */
export function useSetPitchFavorite() {
  const client = useQueryClient();
  return useMutation<boolean, Error, { pitchId: string; favorite: boolean }>({
    mutationFn: ({ pitchId, favorite }) => getSource().setPitchFavorite(pitchId, favorite),
    onSettled: () => void client.invalidateQueries({ queryKey: keys.favorites }),
  });
}

export const useAreas = () =>
  useQuery<Area[]>({ queryKey: keys.areas, queryFn: () => getSource().areas() });

/** The player's current match: live, next up today, or voting (null when there is none). */
export const useMatchDay = () =>
  useQuery<MatchDay | null>({ queryKey: keys.matchDay, queryFn: () => getSource().matchDay() });

/** Leaderboard for a scope, age group and period (spec §6.10). */
export const useLeaderboard = (scope: string, age: string, period: string) =>
  useQuery<Leaderboard>({
    queryKey: keys.leaderboard(scope, age, period),
    queryFn: () => getSource().leaderboard(scope, age, period),
  });

/** Progress charts, stars wallet, endorsements and clip count for the Me tab. */
export const useProfileExtras = () =>
  useQuery<ProfileExtras>({
    queryKey: keys.profileExtras,
    queryFn: () => getSource().profileExtras(),
  });

/** The next match's squad for the match tools (R2: the booking's players with their form). */
export const useSquad = () =>
  useQuery<Squad>({ queryKey: keys.squad, queryFn: () => getSource().squad() });

/** The next match's shared gear checklist (R3: one list per booking, edited by its players). */
export const useGear = () =>
  useQuery<GearList>({ queryKey: keys.gear, queryFn: () => getSource().gear() });

/** The next match's kitty (R3: the booking's price and each player's payment mark). */
export const useKitty = () =>
  useQuery<Kitty>({ queryKey: keys.kitty, queryFn: () => getSource().kitty() });

/** A booking's line-ups; null when it doesn't exist or you're not in it (R2: RLS decides). */
export const useMatchDetails = (bookingId: string) =>
  useQuery<MatchDetails | null>({
    queryKey: keys.matchDetails(bookingId),
    queryFn: () => getSource().matchDetails(bookingId),
  });

/** One clip for the player; null when it's gone or you may not see it (R5: RLS + signed URL). */
export const useClip = (id: string) =>
  useQuery<Clip | null>({
    queryKey: keys.clip(id),
    queryFn: () => getSource().clip(id),
  });

/**
 * Card-code lookup for "add a player" (contract §4). Slice 3 makes it a rate-limited RPC that only
 * finds players the caller may see, in the same age band (D-023, D-025).
 */
export function findPlayerByCardCode(code: string): Promise<FriendSuggestion | null> {
  return getSource().findPlayerByCardCode(code);
}

/** Local cache edits until each feature's mutations land as RPCs. */
export function useCache() {
  const client = useQueryClient();
  return {
    update<T>(key: readonly unknown[], fn: (old: T) => T) {
      client.setQueryData<T>(key, (old) => (old === undefined ? old : fn(old)));
    },
  };
}

// ---------------------------------------------------------------------------
// Booking (contract agentic_system/contracts/booking.md §6)
// ---------------------------------------------------------------------------

/**
 * A verified field's slots for a day, always fresh from the server (never booked from cache:
 * staleTime 0, refetched when the sheet opens and after every attempt).
 */
export const useDaySlots = (pitchId: string, date: string, enabled = true) =>
  useQuery<DaySlots>({
    queryKey: keys.daySlots(pitchId, date),
    queryFn: () => getSource().booking.daySlots(pitchId, date),
    enabled,
    staleTime: 0,
  });

export const useMyBookings = () =>
  useQuery<BookingReceipt[]>({
    queryKey: keys.myBookings,
    queryFn: () => getSource().booking.mine(),
  });

export const useBookingDetails = (bookingId: string) =>
  useQuery<BookingDetails | null>({
    queryKey: keys.booking(bookingId),
    queryFn: () => getSource().booking.details(bookingId),
  });

/**
 * Books a slot. The caller makes the request id once per attempt (e.g. when the sheet opens) so
 * retries never book twice. Success or failure, the day's slots are refetched, so a taken slot
 * shows as busy straight away.
 */
export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation<BookingReceipt, Error, BookingRequest>({
    mutationFn: (request) => getSource().booking.create(request),
    onSettled: (_receipt, _error, request) => {
      void client.invalidateQueries({ queryKey: ['day-slots', request.pitchId] });
      void client.invalidateQueries({ queryKey: keys.myBookings });
      void client.invalidateQueries({ queryKey: keys.home });
    },
  });
}

export function useCancelBooking() {
  const client = useQueryClient();
  return useMutation<BookingReceipt, Error, string>({
    mutationFn: (bookingId) => getSource().booking.cancel(bookingId),
    onSuccess: (receipt) => {
      client.setQueryData(keys.booking(receipt.id), (old: BookingDetails | null | undefined) =>
        old ? { ...old, ...receipt } : old,
      );
      void client.invalidateQueries({ queryKey: ['day-slots', receipt.pitchId] });
      void client.invalidateQueries({ queryKey: keys.myBookings });
      void client.invalidateQueries({ queryKey: keys.home });
      void client.invalidateQueries({ queryKey: keys.matchDetails(receipt.id) });
    },
  });
}

// ---------------------------------------------------------------------------------------------
// Invites and joining (contracts/invites.md, D-083/D-084)
// ---------------------------------------------------------------------------------------------

/** Everything that shows who's in a booking or whether it's the player's. */
function refreshBooking(client: ReturnType<typeof useQueryClient>, bookingId: string) {
  void client.invalidateQueries({ queryKey: keys.booking(bookingId) });
  void client.invalidateQueries({ queryKey: keys.matchDetails(bookingId) });
  void client.invalidateQueries({ queryKey: keys.myBookings });
  void client.invalidateQueries({ queryKey: keys.home });
}

/** The organizer's join link; only fetched when asked for (`enabled`). */
export const useInviteLink = (bookingId: string, enabled: boolean) =>
  useQuery<InviteLink>({
    queryKey: keys.invite(bookingId),
    queryFn: () => getSource().booking.invite(bookingId),
    enabled,
  });

export function useResetInvite() {
  const client = useQueryClient();
  return useMutation<InviteLink, Error, string>({
    mutationFn: (bookingId) => getSource().booking.resetInvite(bookingId),
    onSuccess: (link, bookingId) => client.setQueryData(keys.invite(bookingId), link),
  });
}

/** The join screen's preview: always fresh (room left changes), and a bad link isn't retried. */
export const useInvitePreview = (token: string | null) =>
  useQuery<InvitePreview>({
    queryKey: keys.invitePreview(token ?? ''),
    queryFn: () => getSource().booking.preview(token!),
    enabled: token !== null,
    staleTime: 0,
    retry: false,
  });

export function useJoinBooking() {
  const client = useQueryClient();
  return useMutation<BookingReceipt, Error, string>({
    mutationFn: (token) => getSource().booking.join(token),
    onSettled: (receipt, _error, token) => {
      void client.invalidateQueries({ queryKey: keys.invitePreview(token) });
      if (receipt) refreshBooking(client, receipt.id);
    },
  });
}

export function useLeaveBooking() {
  const client = useQueryClient();
  return useMutation<BookingReceipt, Error, string>({
    mutationFn: (bookingId) => getSource().booking.leave(bookingId),
    onSuccess: (receipt) => refreshBooking(client, receipt.id),
  });
}

export function useRemovePlayer() {
  const client = useQueryClient();
  return useMutation<BookingDetails, Error, { bookingId: string; playerRef: string }>({
    mutationFn: ({ bookingId, playerRef }) =>
      getSource().booking.removePlayer(bookingId, playerRef),
    onSuccess: (details) => {
      client.setQueryData(keys.booking(details.id), details);
      refreshBooking(client, details.id);
    },
  });
}
