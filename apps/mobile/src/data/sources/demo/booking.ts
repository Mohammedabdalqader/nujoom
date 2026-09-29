import { generateSlots, slotState } from '@nujoom/shared';

import type { BookingReceipt } from '@/data/booking';
import type { BookingApi } from '@/data/source';
import type { Pitch } from '@/data/types';

import { previewMe, previewPitches } from './fixtures';

/**
 * The demo build's booking (labelled fixtures, no backend): the same shapes and rules as the
 * server for the sample venues, kept in memory for the session. Never used by production builds.
 */
const booked: (BookingReceipt & { contactPhone: string | null })[] = [];

const demoPitch = (id: string): Pitch => {
  const pitch = previewPitches.find((p) => p.id === id);
  if (!pitch) throw new Error('pitch_unavailable');
  return pitch;
};

const busyOf = (pitch: Pitch) => [
  ...pitch.busy,
  ...booked
    .filter((b) => b.pitchId === pitch.id && b.status === 'confirmed')
    .map((b) => ({ starts_at: b.startsAt, ends_at: b.endsAt })),
];

export const demoBooking: BookingApi = {
  async daySlots(pitchId, date) {
    const pitch = demoPitch(pitchId);
    return {
      date,
      slotMinutes: pitch.slotMinutes,
      pricePerHour: pitch.pricePerHour,
      slots: generateSlots(pitch.openingHours, pitch.slotMinutes, date).map((s) => ({
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        state: slotState(s, busyOf(pitch)),
      })),
    };
  },
  async create(request) {
    const same = booked.find((b) => b.id === `demo-${request.requestId}`);
    if (same) return same;
    const pitch = demoPitch(request.pitchId);
    const endsAt = new Date(
      Date.parse(request.startsAt) + pitch.slotMinutes * 60_000,
    ).toISOString();
    const clash = busyOf(pitch).some(
      (b) =>
        Date.parse(b.starts_at) < Date.parse(endsAt) &&
        Date.parse(b.ends_at) > Date.parse(request.startsAt),
    );
    if (clash) throw new Error('slot_taken');
    const receipt = {
      id: `demo-${request.requestId}`,
      kind: 'app' as const,
      status: 'confirmed' as const,
      startsAt: request.startsAt,
      endsAt,
      venue: { ar: pitch.name.ar, en: pitch.name.en },
      field: null,
      city: { ar: pitch.city.ar, en: pitch.city.en },
      pitchId: pitch.id,
      facilityId: pitch.id,
      playersPerSide: pitch.size,
      slotMinutes: pitch.slotMinutes,
      pricePerHour: pitch.pricePerHour,
      total: Math.round((pitch.pricePerHour * pitch.slotMinutes * 100) / 60) / 100,
      currency: 'JOD' as const,
      payment: 'cash_at_pitch' as const,
      recorded: request.recorded,
      teamAName: request.teamA ?? null,
      teamBName: request.teamB ?? null,
      isOrganizer: true,
      cancelledAt: null,
      cancelReason: null,
      contactPhone: request.contactPhone ?? null,
    };
    booked.push(receipt);
    return receipt;
  },
  async mine() {
    return booked.map(({ contactPhone: _phone, ...r }) => r);
  },
  async details(bookingId) {
    const b = booked.find((x) => x.id === bookingId);
    return b
      ? { ...b, players: [{ name: previewMe.name, team: null, bib: null, isOrganizer: true }] }
      : null;
  },
  async cancel(bookingId) {
    const b = booked.find((x) => x.id === bookingId);
    if (!b) throw new Error('not_found');
    if (b.status === 'confirmed') {
      b.status = 'cancelled';
      b.cancelledAt = new Date().toISOString();
      b.cancelReason = 'organizer';
    }
    const { contactPhone: _phone, ...receipt } = b;
    return receipt;
  },
};
