import type { BusyRange, OpeningHours } from '@nujoom/shared';

/**
 * View models the screens render. The data layer (src/data/api.ts) produces them from Supabase,
 * or from src/data/preview.ts while a feature has no backend yet (D-019). User-generated text
 * (names, clip titles) is shown as written; everything else is translated in the views.
 */

export type Bilingual = { ar: string; en: string };
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type TeamSide = 'A' | 'B';
export type KitColor = 'blue' | 'orange';
export type AgeBand = 'U14' | 'U16' | 'U18' | 'ADULT';

export type PlayerRef = {
  id: string;
  name: string;
  handle?: string | null;
  /** Null when there is no photo or the viewer may not see it (spec §7). */
  avatarUrl: string | null;
};

export type Attributes = {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
};

export type Me = PlayerRef & {
  firstName: string;
  city: Bilingual;
  neighborhood: Bilingual | null;
  position: Position;
  /** FIFA-style tag shown on the card: ST, CM, CB, GK … */
  positionTag: string;
  cardCode: string;
  isYouth: boolean;
  visibility: 'public' | 'city' | 'private';
  /** Ranking-eligible ("لاعب معتمد"). */
  isVerifiedPlayer: boolean;
  /** Form rating x/10 (spec §6.10 metric 3). */
  form: number;
  formChange30d: number;
  formConfidence: number;
  ovr: number;
  attributes: Attributes;
  elo: number;
  stats: { matches: number; goals: number; assists: number; mvps: number };
  lastFive: FormResult[];
  season: string;
  xp: number;
  editionYear: number;
};

export type FormResult = {
  result: 'W' | 'D' | 'L';
  scoreFor: number;
  scoreAgainst: number;
  mvp: boolean;
};

export type Friend = PlayerRef & {
  position: string;
  form: number;
  presence: 'online' | 'offline' | 'in_match';
  /** Only for adults who opted in (D-006.5). */
  inMatchAt: Bilingual | null;
  neighborhood: Bilingual;
  cardCode: string;
  lastActiveAt: string | null;
};

export type Team = {
  side: TeamSide;
  name: string;
  initials: string;
  kit: KitColor;
  hara: Bilingual;
};

export type UpcomingMatch = {
  bookingId: string;
  pitchName: Bilingual;
  pitchPhotoUrl: string | null;
  startsAt: string;
  endsAt: string;
  ranked: boolean;
  teams: [Team, Team];
  shareUrl: string;
};

export type MissingOne = {
  id: string;
  bookingId: string;
  pitchName: Bilingual;
  size: number;
  startsAt: string;
  sharePerPlayer: number;
  wantedPosition: Position | null;
  roster: PlayerRef[];
  openSpots: number;
  shareUrl: string;
};

export type ClipType = 'moment' | 'goal' | 'skill' | 'save';

export type Clip = {
  id: string;
  title: string;
  type: ClipType;
  player: PlayerRef;
  pitchName: Bilingual;
  durationSec: number;
  thumbnailUrl: string;
  likes: number;
  likedByMe: boolean;
  views: number;
  createdAt: string;
  /** "ضد نمور الجبل" / "Winning assist": short match context, user text. */
  context: string | null;
  verified: boolean;
  shareUrl: string;
  canDownload: boolean;
};

export type PulseItem =
  | {
      id: string;
      kind: 'result';
      at: string;
      hara: Bilingual;
      opponent: Bilingual;
      scoreFor: number;
      scoreAgainst: number;
    }
  | { id: string; kind: 'hat_trick'; at: string; player: string; form: number; against: Bilingual }
  | { id: string; kind: 'new_pitch'; at: string; pitchName: Bilingual; hara: Bilingual };

export type HomeFeed = {
  nextMatch: UpcomingMatch | null;
  missingOne: MissingOne[];
  trendingClips: Clip[];
  pulse: PulseItem[];
};

export type NotificationType =
  | 'invited'
  | 'friend_request'
  | 'booking_reminder'
  | 'checkin_open'
  | 'clips_ready'
  | 'voting_open'
  | 'mvp_result'
  | 'missing_one_nearby'
  | 'rating_updated'
  | 'weekly_ranking';

export type AppNotification = {
  id: string;
  type: NotificationType;
  /** Values interpolated into the translated title/body (names, pitch, numbers). */
  params: Record<string, string | number>;
  createdAt: string;
  unread: boolean;
  /** Where tapping it goes. */
  href: string;
  tab: 'home' | 'pitches' | 'match' | 'rankings' | 'profile';
};

export type PitchLevel = 'listed' | 'dock' | 'verified';
export type Surface = 'artificial' | 'certified' | 'concrete';
export type Amenity = 'parking' | 'lights' | 'water' | 'showers' | 'cafe';

export type Pitch = {
  id: string;
  name: Bilingual;
  area: Bilingual;
  areaSlug: string;
  city: Bilingual;
  photoUrl: string | null;
  pricePerHour: number;
  /** "شامل الإضاءة والمياه": what the hourly price includes, set by the owner. */
  priceNote: Bilingual | null;
  rating: number | null;
  ratingCount: number;
  size: 5 | 6 | 7;
  indoor: boolean;
  surface: Surface;
  level: PitchLevel;
  amenities: Amenity[];
  slotMinutes: 60 | 90;
  openingHours: OpeningHours;
  /** Booked and blocked ranges (from pitch_busy_ranges). */
  busy: BusyRange[];
  location: { lat: number; lng: number } | null;
  favorite: boolean;
  /** An open "missing one" request at this pitch, if any. */
  openSpot: { id: string; spots: number } | null;
};

export type Area = { slug: string; name: Bilingual };
