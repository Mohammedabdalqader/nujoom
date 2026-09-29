# Contract: booking transactions (G2b)

Status: **proposed by Claude, 2026-09-29** (D-070). Codex is paused, so this is decided under the owner's delegation (D-001) and logged. Codex reviews the UX semantics when back. It replaces the booking parts of `identity-booking.md` §5, which predate the pitch catalog (`pitch-catalog.md`). Invitations, joining, teams and "missing one" (G3) stay in `identity-booking.md` §5–6 and will be revised against this contract when G3 starts.

Roadmap gate (`docs/PRODUCTION_ROADMAP.md` G2b): two concurrent attempts can't book the same field and time; failure never shows success; stale or offline slots can't be confirmed; receipts identify venue and field. No money moves in the app (`payments_enabled = false`): bookings are paid at the pitch.

## 1. What can be booked

A field (`pitches` row) can be booked only when `private.pitch_is_bookable(pitch)` holds (D-046/D-050): published field and venue, the **Verified by Nujoom** badge, and an active schedule. Operations come from `pitch_operations` (owner-confirmed price, slot length 60/90, opening hours, D-063/D-064).

Additional requirement for booking: the field's `players_per_side` must be known, since capacity depends on it. **Proposal:** `admin_set_participation(verified)` also requires it, so a verified field is always bookable-complete.

## 2. Tables

All have RLS, explicit grants, pgTAP tests and clients never read them directly: reads go through RPCs.

- **`bookings`**
  - `id`, `pitch_id`, `kind` (`app` | `manual` | `block`), `status` (`confirmed` | `cancelled`), `during tstzrange` (`[)`), `organizer_id` (null for `manual` and `block`), `created_by` (the person who made it: organizer or staff)
  - `recorded boolean default true` (C-010), `team_a_name`, `team_b_name` (defaults from i18n, not stored), `price_per_hour` and `slot_minutes` **snapshotted** at booking time (a later price change never rewrites a receipt), `client_request_id uuid`
  - `created_at`, `cancelled_at`, `cancelled_by`, `cancel_reason` (code: `organizer`, `venue_closed`, `weather`, `maintenance`, `staff_other`, `admin`)
  - **No double booking, in the database:** `exclude using gist (pitch_id with =, during with &&) where (status = 'confirmed')` (needs `btree_gist`). Blocks are bookings of kind `block`, so one constraint covers bookings, manual bookings and staff blocks together. A losing concurrent insert raises `23P01`, which the RPC turns into `slot_taken`. Bookings on one field also take turns (a per-field transaction lock just before inserting): without it, two sessions inserting the same hour can each wait on the other's uncommitted row in the exclusion index, and Postgres kills one as a deadlock instead of answering `slot_taken`. The two-connection race test found this (D-071).
  - **Safe retries:** `unique (created_by, client_request_id)`. A retried request returns the booking it already made instead of failing or booking twice.
- **`booking_private`**: `booking_id` pk, `contact_phone` (E.164, optional), `walk_in_name` (manual bookings only). Readable by the venue's staff and the organizer only.
- **`booking_players`**: `booking_id`, `user_id`, `team` (`a` | `b` | null), `bib` (1–12, unique per booking), `joined_at`, `removed_at`, `removed_by`. The organizer is inserted as the first player. Joining by invite, teams and bibs are G3.

## 3. Slot rules (`private.slot_fits`, mirrored by `generateSlots` in `@nujoom/shared`)

1. The field is bookable (§1).
2. `during` equals exactly one slot: its length is the field's `slot_minutes`.
3. The start lies on the field's grid: each opening range starts its own grid, like `generateSlots`. The slot lies wholly inside one opening range of that Amman calendar day. No slot crosses midnight in v1; `24:00` ends the day.
4. The start is in the future (server clock), and the Amman date is within the 14-day horizon (`config.booking.horizon_days`).
5. Only for `app` bookings, the organizer has fewer than 3 upcoming confirmed app bookings (`config.booking.max_upcoming`).

Staff `manual` bookings and `block`s follow rules 1–4, except that blocks may cover any whole number of slots, e.g. an evening.

## 4. RPCs

| RPC                                                                                            | Who                             | Notes                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pitch_busy_ranges(pitch, from, to)`                                                           | signed-in                       | Confirmed ranges only, for bookable fields, window ≤ 15 days. No names, kinds or counts. Clients compute free slots with `generateSlots` + `slotState`.                                                                                                                                                                                                                             |
| `create_booking(pitch, starts_at, recorded, team_a, team_b, contact_phone, client_request_id)` | onboarded player                | Validates §3, then inserts the booking, `booking_private` and the organizer player row in one transaction. Checks: `recorded` needs the organizer's recording permission (`recording_consent_required`, C-010); a youth needs a confirmed guardian (`guardian_required`); unrecorded bookings are open to everyone. Returns the receipt (below). Emits the `booking_created` event. |
| `my_bookings()`                                                                                | signed-in                       | Upcoming and recent bookings the person organizes or plays in (receipt shape).                                                                                                                                                                                                                                                                                                      |
| `booking_details(booking)`                                                                     | organizer, players, venue staff | Receipt plus players (display names only; youth rules apply). The contact phone is only for staff and the organizer.                                                                                                                                                                                                                                                                |
| `cancel_booking(booking, reason)`                                                              | organizer (before start), staff | Sets `cancelled`; the slot frees at once. Players are told when notifications exist (R3). Cancelling twice is a no-op.                                                                                                                                                                                                                                                              |
| `venue_schedule(facility, from, to)`                                                           | venue staff                     | Every booking and block with kind, organizer display name, contact phone and walk-in name. This is the owner dashboard calendar.                                                                                                                                                                                                                                                    |
| `create_manual_booking(pitch, starts_at, walk_in_name, contact_phone, client_request_id)`      | venue staff                     | A phone or walk-in booking without an app organizer. A claim link that lets the customer take it over comes with G3.                                                                                                                                                                                                                                                                |
| `block_slots(pitch, starts_at, ends_at, reason)`                                               | venue owner                     | Maintenance, private events. Refused over existing confirmed bookings (`slot_taken`); staff cancel those first, with a reason.                                                                                                                                                                                                                                                      |

**Receipt shape:** booking id, venue name (ar/en), field label, city, Amman start and end, slot minutes, the price snapshot and total for the slot (**paid in cash at the pitch**; no stars, no in-app payment), recorded yes/no, and status.

## 5. Errors (snake_case, mapped in `@nujoom/shared` errors)

`pitch_unavailable`, `invalid_slot`, `slot_in_past`, `beyond_horizon`, `slot_taken`, `too_many_bookings`, `not_onboarded`, `recording_consent_required`, `guardian_required`, `booking_cancelled`, `booking_started`, `not_organizer`, `forbidden`, `invalid_phone`, `rate_limited`.

## 6. Clients: honest states

- A booking is shown as confirmed only after `create_booking` returns. On a network failure the client retries with the **same** `client_request_id`, then shows the receipt or the error, never an optimistic success.
- Free slots are recomputed from fresh `pitch_busy_ranges` when the sheet opens and after any `slot_taken`, and a taken slot is greyed out. Offline, slots are shown as not bookable: we never confirm from cache.
- Not-verified fields never show slots or Book (D-032). Paused schedules show "not taking bookings right now".
- Times are Amman wall-clock on the 12-hour clock (D-008). The currency is JOD.

## 7. Partnership changes (owner input needed, defaults below)

- **Pausing the schedule:** stops new bookings. Existing confirmed bookings stay; staff can cancel with a reason.
- **Losing the badge** (staleness, D-050; opt-out or end of partnership, D-048): no new bookings. **Default:** future confirmed bookings stay, and are listed for admins to follow up with the venue. They are not cancelled automatically, since players may already have arranged their match. Owner question B-Q1: auto-cancel, or admin follow-up (default)?
- **Deleting an account:** the organizer's future bookings are cancelled with reason `organizer`, and the slot frees. Past bookings keep only non-personal facts (the venue's history stays; personal links are removed as in D-040).

## 8. Privacy (spec §7)

- Busy ranges reveal nothing about who plays.
- Booking details show display names only to participants and venue staff.
- A youth's name follows their visibility and guardian rules; a youth's booking never appears publicly.
- Contact phones are for staff and the organizer only, never other players.
- Everything personal is included in the data export and removed on deletion (the coverage guard in pgTAP `050` enforces the tables).

## 9. Test plan (pgTAP plus live e2e)

- **Negative:**
  - not bookable (not verified, paused, unpublished, size unknown)
  - off-grid, wrong length, outside hours, crossing midnight, past, beyond 14 days
  - a fourth upcoming booking
  - a youth without a guardian on a recorded match, and recording declined on a recorded match
  - a stranger reading details or cancelling
  - staff actions on another venue
  - reading the tables directly
- **Concurrency:**
  - two sessions insert the same slot: exactly one wins and the other gets `slot_taken`, exercised against real Postgres with two connections in `tools/db-test`
  - a retry with the same `client_request_id` returns the same booking
- **Lifecycle:**
  - create, then details and receipt snapshot
  - a price change doesn't change the receipt
  - cancel frees the slot, and the slot can be booked again
  - a block over free slots, and a block over a booking is refused
  - a manual booking
  - export and deletion coverage
- **Live:** a verified smoke venue, a real booking from the web or app tester, the staff calendar, cancel, and cleanup.

## 10. Order of work

1. Migration: `btree_gist`, tables, `slot_fits`, `pitch_busy_ranges`, `create_booking`, `my_bookings`, `booking_details`, `cancel_booking`, with pgTAP including the two-connection race.
2. Staff: `venue_schedule`, `create_manual_booking`, `block_slots`, and the owner page calendar on the web.
3. Mobile data layer (`bookSlot`, `myBookings`) behind the existing sheets. Codex owns the booking UX acceptance.
4. G3 revisions of invites and join against this contract.
