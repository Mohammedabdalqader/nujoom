import type { Localized } from '@/data/catalog';
import type { Bilingual, LineupPlayer, MatchDetails, Team, UpcomingMatch } from '@/data/types';

/**
 * Booking as the app sees it (contract agentic_system/contracts/booking.md, D-070–D-074). The
 * server decides everything: which slots exist (pitch_day_slots), whether a booking succeeded
 * (create_booking) and what the receipt says. The app only shows a booking as confirmed once the
 * server returned its receipt, and retries a lost request with the same request id so it can
 * never book twice (§6).
 */

export type SlotState = 'free' | 'busy' | 'past';
export type DaySlot = { startsAt: string; endsAt: string; state: SlotState };
export type DaySlots = {
  date: string;
  slotMinutes: number;
  pricePerHour: number;
  slots: DaySlot[];
};

export type BookingReceipt = {
  id: string;
  kind: 'app' | 'manual' | 'block';
  status: 'confirmed' | 'cancelled';
  startsAt: string;
  endsAt: string;
  venue: Localized;
  /** The field's own label; null when the venue has one field. */
  field: Localized | null;
  city: Localized | null;
  pitchId: string;
  facilityId: string;
  playersPerSide: number | null;
  slotMinutes: number | null;
  /** As confirmed when booked (a later price change never alters it). */
  pricePerHour: number | null;
  total: number | null;
  currency: 'JOD';
  /** Always cash at the pitch: no money moves in the app. */
  payment: 'cash_at_pitch';
  recorded: boolean;
  teamAName: string | null;
  teamBName: string | null;
  isOrganizer: boolean;
  cancelledAt: string | null;
  cancelReason: string | null;
};

export type BookingPlayer = {
  name: string;
  team: 'a' | 'b' | null;
  bib: number | null;
  isOrganizer: boolean;
};
export type BookingDetails = BookingReceipt & {
  players: BookingPlayer[];
  /** Only for the organizer and the venue's staff. */
  contactPhone: string | null;
};

export type BookingRequest = {
  pitchId: string;
  startsAt: string;
  recorded: boolean;
  teamA?: string | null;
  teamB?: string | null;
  contactPhone?: string | null;
  /** Made once per booking attempt (when the sheet opens) and reused for every retry. */
  requestId: string;
};

type Raw = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const localized = (v: unknown): Localized | null => {
  const o = v as { ar?: unknown; en?: unknown } | null;
  return o && (str(o.ar) || str(o.en)) ? { ar: str(o.ar), en: str(o.en) } : null;
};

export function toDaySlots(raw: unknown): DaySlots {
  const r = raw as Raw;
  return {
    date: String(r.date),
    slotMinutes: Number(r.slot_minutes),
    pricePerHour: Number(r.price_per_hour),
    slots: ((r.slots as Raw[] | undefined) ?? []).map((s) => ({
      startsAt: String(s.starts_at),
      endsAt: String(s.ends_at),
      state: s.state === 'free' || s.state === 'busy' ? s.state : 'past',
    })),
  };
}

export function toReceipt(raw: unknown): BookingReceipt {
  const r = raw as Raw;
  return {
    id: String(r.id),
    kind: r.kind === 'manual' || r.kind === 'block' ? r.kind : 'app',
    status: r.status === 'cancelled' ? 'cancelled' : 'confirmed',
    startsAt: String(r.starts_at),
    endsAt: String(r.ends_at),
    venue: localized(r.venue) ?? { ar: null, en: null },
    field: localized(r.field),
    city: localized(r.city),
    pitchId: String(r.pitch_id),
    facilityId: String(r.facility_id),
    playersPerSide: num(r.players_per_side),
    slotMinutes: num(r.slot_minutes),
    pricePerHour: num(r.price_per_hour),
    total: num(r.total),
    currency: 'JOD',
    payment: 'cash_at_pitch',
    recorded: r.recorded !== false,
    teamAName: str(r.team_a_name),
    teamBName: str(r.team_b_name),
    isOrganizer: r.is_organizer === true,
    cancelledAt: str(r.cancelled_at),
    cancelReason: str(r.cancel_reason),
  };
}

export function toBookingDetails(raw: unknown): BookingDetails {
  const r = raw as Raw;
  return {
    ...toReceipt(raw),
    players: ((r.players as Raw[] | undefined) ?? []).map((p) => ({
      name: String(p.name ?? ''),
      team: p.team === 'a' || p.team === 'b' ? p.team : null,
      bib: num(p.bib),
      isOrganizer: p.is_organizer === true,
    })),
    contactPhone: str(r.contact_phone),
  };
}

/**
 * Only a request that never got an answer may be retried: a network failure. Any answer from the
 * server (`slot_taken`, `too_many_bookings`, …) is final and shown to the player.
 */
export function isRetryable(error: unknown): boolean {
  const e = error as { message?: unknown; code?: unknown; name?: unknown } | null;
  if (!e || typeof e !== 'object') return false;
  if (typeof e.code === 'string' && e.code !== '') return false; // Postgres/PostgREST answered
  const message = typeof e.message === 'string' ? e.message : '';
  return /fetch failed|failed to fetch|network request failed|networkerror|load failed/i.test(
    message,
  );
}

/**
 * Runs `attempt` until it succeeds, fails with a server answer, or runs out of tries. The caller
 * passes the same request id to every attempt, so a request that did reach the server returns
 * the booking it made instead of making another (create_booking, D-071).
 */
export async function withRetry<T>(
  attempt: () => Promise<T>,
  { delays = [800, 2000], wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) } = {},
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (error) {
      if (i >= delays.length || !isRetryable(error)) throw error;
      await wait(delays[i]!);
    }
  }
}

/**
 * A fresh request id (UUID v4 format) for one booking attempt (contract §6). It only has to be
 * unique per organizer, since the database keys retries on (organizer, request id); Hermes has
 * no crypto.randomUUID, so the random source is injectable for tests.
 */
export function newRequestId(random: () => number = Math.random): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** The next booking to show on Home: the earliest confirmed one that hasn't ended yet. */
export function nextBooking<T extends BookingReceipt>(bookings: T[], now: number): T | null {
  return (
    bookings
      .filter((b) => b.status === 'confirmed' && new Date(b.endsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null
  );
}

/** Default team names in the viewer's language (spec §6.5: blue team / orange team). */
export type TeamNames = { a: string; b: string };

const both = (l: Localized | null): Bilingual => ({
  ar: l?.ar ?? l?.en ?? '',
  en: l?.en ?? l?.ar ?? '',
});

/** Badge initials from a team name: first letters of up to two words, without the Arabic "ال". */
export function teamInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w.startsWith('ال') && w.length > 3 ? w.slice(2) : w).charAt(0).toUpperCase())
    .join('.');
}

function teams(b: BookingReceipt, names: TeamNames): [Team, Team] {
  const hara = both(b.city);
  const a = b.teamAName ?? names.a;
  const bName = b.teamBName ?? names.b;
  return [
    { side: 'A', name: a, initials: teamInitials(a), kit: 'blue', hara },
    { side: 'B', name: bName, initials: teamInitials(bName), kit: 'orange', hara },
  ];
}

/**
 * A booking as Home's hero card. Until rankings (R6) nothing counts as ranked, and until invite
 * links exist there is no link to share, so the card hides sharing rather than send a dead link.
 */
export function toUpcomingMatch(b: BookingReceipt, names: TeamNames): UpcomingMatch {
  const venue = both(b.venue);
  const field = b.field ? both(b.field) : null;
  return {
    bookingId: b.id,
    pitchName: field ? { ar: `${venue.ar} · ${field.ar}`, en: `${venue.en} · ${field.en}` } : venue,
    pitchPhotoUrl: null,
    startsAt: b.startsAt,
    endsAt: b.endsAt,
    ranked: false,
    teams: teams(b, names),
    shareUrl: null,
  };
}

/** A booking's line-ups for its players; people not yet split into teams are listed apart. */
export function toMatchDetails(d: BookingDetails, names: TeamNames): MatchDetails {
  const players = d.players.map((p, i): LineupPlayer & { team: 'a' | 'b' | null } => ({
    id: `p${i}`,
    name: p.name,
    avatarUrl: null,
    bib: p.bib,
    position: null,
    form: null,
    captain: false,
    team: p.team,
  }));
  const strip = ({ team: _team, ...p }: LineupPlayer & { team: 'a' | 'b' | null }) => p;
  const byBib = (x: LineupPlayer, y: LineupPlayer) => (x.bib ?? 99) - (y.bib ?? 99);
  return {
    ...toUpcomingMatch(d, names),
    size: d.playersPerSide ?? 0,
    recorded: d.recorded,
    recordingBy: null,
    lineups: [
      players
        .filter((p) => p.team === 'a')
        .map(strip)
        .sort(byBib),
      players
        .filter((p) => p.team === 'b')
        .map(strip)
        .sort(byBib),
    ],
    unassigned: players.filter((p) => p.team === null).map(strip),
    organizer: d.isOrganizer,
    cancelled: d.status === 'cancelled',
    total: d.total,
  };
}
