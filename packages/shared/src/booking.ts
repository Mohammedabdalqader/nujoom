/**
 * Booking rules shared by the apps. The database is the authority (private.slot_fits and
 * public.create_booking, R2 migrations); these mirror it so the apps show only bookable slots.
 */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type OpeningHours = Partial<Record<DayKey, [string, string][]>>;

/** Jordan has used UTC+3 all year since 2022 (no daylight saving). */
export const AMMAN_UTC_OFFSET = '+03:00';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * 24-hour times in 30-minute steps for the owner dashboard's time selects.
 * Start times run 00:00–23:30; end times run 00:30–24:00, where 24:00 is midnight at day end.
 */
export function halfHourTimes(kind: 'start' | 'end'): string[] {
  const out: string[] = [];
  for (let m = kind === 'start' ? 0 : 30; m <= (kind === 'start' ? 1410 : 1440); m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

/** An end time must be later than its start ("24:00" counts as the end of the day). */
export function endsAfter(start: string, end: string): boolean {
  return hhmmToMinutes(end) > hhmmToMinutes(start);
}

export function isValidOpeningHours(hours: unknown): hours is OpeningHours {
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) return false;
  return Object.entries(hours).every(
    ([day, intervals]) =>
      (DAY_KEYS as readonly string[]).includes(day) &&
      Array.isArray(intervals) &&
      intervals.every(
        (interval) =>
          Array.isArray(interval) &&
          interval.length === 2 &&
          HHMM.test(interval[0]) &&
          (HHMM.test(interval[1]) || interval[1] === '24:00') &&
          hhmmToMinutes(interval[0]) < hhmmToMinutes(interval[1]),
      ),
  );
}

/** Day key of a calendar date (YYYY-MM-DD). */
export function dayKeyOf(date: string): DayKey {
  const [y, m, d] = date.split('-').map(Number);
  return DAY_KEYS[new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay()]!;
}

export type Slot = { startsAt: string; endsAt: string; label: string };

function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Amman wall-clock time on a date → ISO instant. `minutes` may be 1440 (midnight). */
function ammanInstant(date: string, minutes: number): string {
  const base = new Date(`${date}T00:00:00${AMMAN_UTC_OFFSET}`).getTime();
  return new Date(base + minutes * 60_000).toISOString();
}

/**
 * Every opening interval for a date ("YYYY-MM-DD", Amman), or null when the pitch is closed.
 * Split days keep their gap: showing 10:00–23:00 for 10:00–13:00 + 15:00–23:00 would claim the
 * pitch is open during a closure.
 */
export function hoursOn(hours: OpeningHours, date: string): [string, string][] | null {
  const ranges = hours[dayKeyOf(date)];
  if (!ranges?.length) return null;
  return ranges.map(([open, close]) => [open, close]);
}

/** All slots of a day on the pitch's grid (each interval starts its own grid, like slot_fits). */
export function generateSlots(hours: OpeningHours, slotMinutes: number, date: string): Slot[] {
  const slots: Slot[] = [];
  for (const [open, close] of hours[dayKeyOf(date)] ?? []) {
    const end = hhmmToMinutes(close);
    for (let start = hhmmToMinutes(open); start + slotMinutes <= end; start += slotMinutes) {
      slots.push({
        startsAt: ammanInstant(date, start),
        endsAt: ammanInstant(date, start + slotMinutes),
        label: minutesToHhmm(start),
      });
    }
  }
  return slots;
}

export type SlotState = 'free' | 'busy' | 'past';
export type BusyRange = { starts_at: string; ends_at: string };

export function slotState(
  slot: Slot,
  busy: readonly BusyRange[],
  now: Date = new Date(),
): SlotState {
  const start = Date.parse(slot.startsAt);
  const end = Date.parse(slot.endsAt);
  if (start < now.getTime()) return 'past';
  const overlaps = busy.some((b) => Date.parse(b.starts_at) < end && Date.parse(b.ends_at) > start);
  return overlaps ? 'busy' : 'free';
}

/** Next `count` calendar dates in Amman, starting today (booking horizon). */
export function nextDates(today: string, count: number): string[] {
  const [y, m, d] = today.split('-').map(Number);
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + i)).toISOString().slice(0, 10),
  );
}

/** Players per side plus two substitutes each (spec §6.5). */
export function maxPlayers(size: number): number {
  return size * 2 + 2;
}

export type Team = 'A' | 'B';
export type Assignment = { user_id: string; team: Team; bib: number };

/**
 * Splits players into two balanced teams with a snake draft by rating (A, B, B, A, A, B …),
 * then numbers bibs from 1 per team. Ties keep the input order (join order), so results
 * are deterministic. Players without a rating count as 1000 (the Elo base).
 */
export function autoBalance(
  players: readonly { userId: string; rating?: number | null }[],
): Assignment[] {
  const ordered = players
    .map((p, index) => ({ ...p, index, rating: p.rating ?? 1000 }))
    .sort((a, b) => b.rating - a.rating || a.index - b.index);

  const bibs: Record<Team, number> = { A: 0, B: 0 };
  return ordered.map((player, pick) => {
    const team: Team = pick % 4 === 0 || pick % 4 === 3 ? 'A' : 'B';
    bibs[team] += 1;
    return { user_id: player.userId, team, bib: bibs[team] };
  });
}

export function teamRatingGap(
  assignments: readonly Assignment[],
  ratings: Record<string, number>,
): number {
  const sum = (team: Team) =>
    assignments
      .filter((a) => a.team === team)
      .reduce((total, a) => total + (ratings[a.user_id] ?? 1000), 0);
  return Math.abs(sum('A') - sum('B'));
}

/**
 * The invite token in a join deep link (`nujoom://join/<token>`, `/join/<token>`, or the web
 * form `/ar/j/<token>`), or null. Used to resume the invite after sign-in and onboarding.
 */
export function joinTokenFromPath(path: string): string | null {
  const match = /(?:^|\/)(?:join|j)\/([A-Za-z0-9_-]{16,128})(?:[/?#]|$)/.exec(path);
  return match ? match[1]! : null;
}

/** A remembered invite expires after a day, so a stale link never hijacks a later sign-in. */
export const PENDING_JOIN_TTL_MS = 24 * 60 * 60 * 1000;
