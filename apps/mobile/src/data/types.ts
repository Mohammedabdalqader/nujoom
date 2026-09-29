import type { BusyRange, MonthProgress, OpeningHours } from '@nujoom/shared';

export type { MonthProgress };

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
  /** The home city's id, for city-scoped queries like the pitch directory (D-076); null in the demo. */
  cityId: number | null;
  country: Bilingual;
  countryCode: string;
  neighborhood: Bilingual | null;
  position: Position;
  /** FIFA-style tag shown on the card: ST, CM, CB, GK … */
  positionTag: string;
  cardCode: string;
  /** Favourite shirt number, printed on the card ("STREET CARD #10"). */
  shirtNumber: number | null;
  isYouth: boolean;
  visibility: 'public' | 'city' | 'private';
  /** Ranking-eligible ("لاعب معتمد"): false until S6 has a real rule (C-012). */
  rankingEligible: boolean;
  /**
   * Rating-derived values are null until the player has been rated ("غير مصنّف بعد", C-007):
   * zero is a real count, never a stand-in for a missing score.
   */
  /** Form rating x/10 (spec §6.10 metric 3). */
  form: number | null;
  formChange30d: number | null;
  formConfidence: number | null;
  ovr: number | null;
  attributes: Attributes | null;
  elo: number | null;
  /** Public link to the player card; null until the web domain exists (no dead links). */
  shareUrl: string | null;
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
  position: Position;
  form: number | null;
  presence: 'online' | 'offline' | 'in_match';
  /** Only for adults who opted in (D-006.5). */
  inMatchAt: Bilingual | null;
  neighborhood: Bilingual;
  cardCode: string;
  lastActiveAt: string | null;
};

/** A player you could add: public or city-visible, same city and age band (D-023). */
export type FriendSuggestion = PlayerRef & {
  position: Position;
  form: number | null;
  neighborhood: Bilingual;
  cardCode: string;
};

export type FriendRequest = {
  id: string;
  from: FriendSuggestion;
  createdAt: string;
};

/** A player in the match tools (squad splitter): profile players have a form, walk-ins do not. */
export type SquadPlayer = PlayerRef & {
  position: Position | null;
  form: number | null;
  isMe?: boolean;
};

/** The squad of your next match, which the tools start from (empty without a booking). */
export type Squad = {
  bookingId: string | null;
  pitchName: Bilingual | null;
  players: SquadPlayer[];
};

export type GearKind = 'ball' | 'bibs' | 'water' | 'referee' | 'firstaid' | 'booking' | 'custom';

/** One line of the match gear checklist; only custom items carry a (player-typed) name. */
export type GearItem = {
  id: string;
  kind: GearKind;
  name: string | null;
  assignee: PlayerRef | null;
  ready: boolean;
};

export type GearList = {
  bookingId: string | null;
  pitchName: Bilingual | null;
  startsAt: string | null;
  /** Players per side (5, 6 or 7), for the bibs line. */
  size: number;
  items: GearItem[];
};

export type KittyPlayer = {
  id: string;
  name: string;
  isMe?: boolean;
  /** How they paid their share, or null while unpaid. Stars never pay (D-006.1). */
  paid: 'cash' | 'cliq' | null;
};

/** The pitch kitty ("القطية") for your next match: what it costs and who has paid. */
export type Kitty = {
  bookingId: string | null;
  pitchName: Bilingual | null;
  /** Pitch rent for the booking, in JOD. */
  pitchCost: number;
  /** Water and extras, in JOD. */
  extrasCost: number;
  players: KittyPlayer[];
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
  /** The join link to share; null until the booking has one. */
  shareUrl: string | null;
};

export type LineupPlayer = PlayerRef & {
  bib: number | null;
  position: Position | null;
  form: number | null;
  captain: boolean;
};

/** "تشكيلة وتفاصيل المباراة": a booking's teams and line-ups, for its players. */
export type MatchDetails = UpcomingMatch & {
  size: number;
  /** False for a match booked without recording. */
  recorded: boolean;
  /** Whose phone records the match, null until the organizer picks one. */
  recordingBy: string | null;
  lineups: [LineupPlayer[], LineupPlayer[]];
  /** Players not split into teams yet. */
  unassigned: LineupPlayer[];
};

export type MissingOne = {
  id: string;
  bookingId: string;
  /** Who posted the open spot (the booking's organizer). */
  organizer: PlayerRef;
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
  /** Signed or public MP4; null while the clip is still processing. */
  videoUrl: string | null;
  /** Only clips that may be public can be downloaded; youth follow their guardians (D-006.9). */
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

export type MatchPhase = 'upcoming' | 'live' | 'voting' | 'closed';

export type MatchEvent =
  | {
      id: string;
      minute: number;
      kind: 'goal';
      team: TeamSide;
      note: string | null;
      scorer: string;
      assist: string | null;
      clip: { id: string; durationSec: number; likes: number } | null;
    }
  | {
      id: string;
      minute: number;
      kind: 'save';
      team: TeamSide;
      note: string | null;
      keeper: string;
    }
  | {
      id: string;
      minute: number;
      kind: 'sub';
      team: TeamSide;
      playerIn: string;
      playerOut: string;
    };

export type MvpCandidate = {
  player: PlayerRef;
  goals: number;
  assists: number;
  saves: number;
  form: number | null;
};

export type MatchDay = {
  bookingId: string;
  matchId: string;
  pitchName: Bilingual;
  city: Bilingual;
  size: number;
  phase: MatchPhase;
  startsAt: string;
  endsAt: string;
  startedAt: string | null;
  half: 1 | 2;
  teams: [Team, Team];
  score: [number, number];
  referee: string | null;
  /** Whose phone records the match (spec §6.7), null until the organizer picks one. */
  recordingBy: string | null;
  roster: PlayerRef[];
  checkedInIds: string[];
  meCheckedIn: boolean;
  events: MatchEvent[];
  candidates: MvpCandidate[];
  votingClosesAt: string | null;
  myVote: string | null;
  /** Vote shares, only once voting has closed (spec §6.10). */
  results: { playerId: string; percent: number }[] | null;
  costPerPlayer: number | null;
};

export type RankScope = 'hara' | 'city' | 'country';
export type RankPeriod = 'week' | 'month' | 'season';

export type NeighborhoodStanding = {
  rank: number;
  name: Bilingual;
  crestUrl: string | null;
  points: number;
  weeklyChange: number;
};

export type LeaderboardRow = {
  rank: number;
  trend: 'up' | 'down' | 'same';
  player: PlayerRef;
  neighborhood: Bilingual;
  position: Position;
  matches: number;
  keyStat: { kind: 'goals' | 'assists' | 'saves_pct' | 'clean_sheets'; value: number };
  elo: number;
  confidence: number;
};

export type PlayerOfWeek = {
  player: PlayerRef;
  positionTag: string;
  neighborhood: Bilingual;
  ovr: number;
  attributes: Attributes;
};

export type MyRank = {
  rank: number | null;
  scopeName: Bilingual;
  weeklyChange: number | null;
  elo: number | null;
  /** Counted matches still needed before the player is ranked (spec §6.10). */
  matchesToQualify: number;
};

export type Leaderboard = {
  standings: NeighborhoodStanding[];
  playerOfWeek: PlayerOfWeek | null;
  rows: LeaderboardRow[];
  me: MyRank | null;
};

export type StarsReason = 'match_counted' | 'mvp' | 'hat_trick' | 'tournament_win';

export type StarsTx = {
  id: string;
  amount: number;
  reason: StarsReason;
  at: string;
  /** Context for the history line, e.g. the pitch or opponent. */
  context: string | null;
};

export type Wallet = {
  balance: number;
  totalEarned: number;
  transactions: StarsTx[];
  counts: Record<StarsReason, number>;
};

export type EndorsementBadge =
  'finisher' | 'playmaker' | 'wall' | 'safe_hands' | 'leader' | 'sportsman';

export type EndorsementSummary = {
  badge: EndorsementBadge;
  count: number;
  /** The latest player who gave it (shown only when they are visible to the viewer). */
  lastFrom: string | null;
};

export type ProfileExtras = {
  progress: MonthProgress[];
  wallet: Wallet;
  endorsements: EndorsementSummary[];
  clipsCount: number;
};
