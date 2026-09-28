import { generateSlots, slotState, type Slot, type SlotState } from '@nujoom/shared';

import type { Pitch } from '@/data/types';

export type FormatFilter = 'all' | '5' | '6' | '7' | 'indoor';

/** Pitches in the chosen area and format, favourites first, then by rating. */
export function filterPitches(
  pitches: readonly Pitch[],
  { area, format }: { area: string | 'all'; format: FormatFilter },
): Pitch[] {
  return pitches
    .filter((p) => area === 'all' || p.areaSlug === area)
    .filter((p) =>
      format === 'all' ? true : format === 'indoor' ? p.indoor : p.size === Number(format),
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || (b.rating ?? 0) - (a.rating ?? 0));
}

export type DaySlot = Slot & { state: SlotState };

/** Every slot of a pitch on an Amman date, with its state (free, busy or past). */
export function daySlots(pitch: Pitch, date: string, now: Date = new Date()): DaySlot[] {
  return generateSlots(pitch.openingHours, pitch.slotMinutes, date).map((slot) => ({
    ...slot,
    state: slotState(slot, pitch.busy, now),
  }));
}

/**
 * The slots a pitch card shows: upcoming ones only (past slots are hidden), optionally keeping
 * booked ones so the hero card can strike them through, up to `limit`.
 */
export function cardSlots(
  pitch: Pitch,
  date: string,
  { limit, includeBusy, now = new Date() }: { limit: number; includeBusy: boolean; now?: Date },
): DaySlot[] {
  return daySlots(pitch, date, now)
    .filter((s) => s.state === 'free' || (includeBusy && s.state === 'busy'))
    .slice(0, limit);
}

/** Pitch-card badge, in priority order: verified camera, recording dock, elite rating. */
export function pitchBadge(pitch: Pitch): 'verified' | 'dock' | 'elite' | null {
  if (pitch.level === 'verified') return 'verified';
  if (pitch.level === 'dock') return 'dock';
  if ((pitch.rating ?? 0) >= 4.8 && pitch.ratingCount >= 20) return 'elite';
  return null;
}

/**
 * Pins for the schematic map: each pitch's real position scaled into the map box (0..1 with a
 * margin), so relative positions are true even without map tiles.
 */
export function mapPins(
  pitches: readonly Pitch[],
  margin = 0.12,
): { pitch: Pitch; x: number; y: number }[] {
  const located = pitches.filter((p) => p.location);
  if (!located.length) return [];
  const lats = located.map((p) => p.location!.lat);
  const lngs = located.map((p) => p.location!.lng);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const span = (lo: number, hi: number, v: number) => (hi - lo < 1e-6 ? 0.5 : (v - lo) / (hi - lo));
  return located.map((pitch) => ({
    pitch,
    // West→east is left→right on a map in every language.
    x: margin + (1 - 2 * margin) * span(minLng, maxLng, pitch.location!.lng),
    // North is up: higher latitude → smaller y.
    y: margin + (1 - 2 * margin) * (1 - span(minLat, maxLat, pitch.location!.lat)),
  }));
}
