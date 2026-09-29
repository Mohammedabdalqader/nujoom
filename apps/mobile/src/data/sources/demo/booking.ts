import { generateSlots, slotState } from '@nujoom/shared';

import type { BookingDetails, BookingReceipt, InvitePreview } from '@/data/booking';
import type { BookingApi } from '@/data/source';
import type { Pitch } from '@/data/types';

import { previewMe, previewPitches } from './fixtures';

/**
 * The demo build's booking (labelled fixtures, no backend): the same shapes and rules as the
 * server for the sample venues, kept in memory for the session. Never used by production builds.
 */
const booked: (BookingReceipt & { contactPhone: string | null })[] = [];

/** Demo join links: one per demo booking, 43 URL-safe characters like the server's. */
const demoToken = (bookingId: string, round = 0) =>
  `demo${round}${bookingId.replace(/[^A-Za-z0-9]/g, '')}`.padEnd(43, 'x').slice(0, 43);
const linkRound = new Map<string, number>();
const byToken = (token: string) =>
  booked.find((b) => demoToken(b.id, linkRound.get(b.id) ?? 0) === token);

const demoDetails = (b: (typeof booked)[number]): BookingDetails => {
  const { contactPhone, ...receipt } = b;
  const capacity = b.playersPerSide === null ? null : b.playersPerSide * 2 + 2;
  return {
    ...receipt,
    contactPhone,
    players: [
      {
        name: previewMe.name,
        team: null,
        bib: null,
        isOrganizer: true,
        isMe: true,
        playerRef: 'demo-me',
      },
    ],
    capacity,
    openSpots: capacity === null ? null : capacity - 1,
  };
};

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
    return b ? demoDetails(b) : null;
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
  // The demo player organizes every demo booking, so its link always says "already in".
  async invite(bookingId) {
    const b = booked.find((x) => x.id === bookingId);
    if (!b) throw new Error('not_found');
    if (b.status !== 'confirmed') throw new Error('booking_cancelled');
    return { token: demoToken(b.id, linkRound.get(b.id) ?? 0), createdAt: b.startsAt };
  },
  async resetInvite(bookingId) {
    const b = booked.find((x) => x.id === bookingId);
    if (!b) throw new Error('not_found');
    const round = (linkRound.get(b.id) ?? 0) + 1;
    linkRound.set(b.id, round);
    return { token: demoToken(b.id, round), createdAt: new Date().toISOString() };
  },
  async preview(token): Promise<InvitePreview> {
    const b = byToken(token);
    if (!b) throw new Error('invite_invalid');
    const { contactPhone: _phone, ...receipt } = b;
    const details = demoDetails(b);
    return {
      ...receipt,
      capacity: details.capacity,
      openSpots: details.openSpots,
      invitedBy: previewMe.name,
      canJoin: false,
      reason: b.status === 'confirmed' ? 'already_joined' : 'cancelled',
    };
  },
  async join(token) {
    const b = byToken(token);
    if (!b) throw new Error('invite_invalid');
    if (b.status !== 'confirmed') throw new Error('booking_cancelled');
    const { contactPhone: _phone, ...receipt } = b;
    return receipt;
  },
  async leave() {
    throw new Error('organizer_cannot_leave');
  },
  async removePlayer() {
    throw new Error('organizer_cannot_leave');
  },
};
