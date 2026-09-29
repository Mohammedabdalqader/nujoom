# Contract: match invites and joining (G3a)

Status: **proposed by Claude, 2026-09-29** (D-082); the database side is built (D-083, see Changes). Decided under the owner's delegation (D-001). Codex reviews the UX semantics (the join screen, the web page and the share copy). It revises `identity-booking.md` §5–6 against the booking contract (`booking.md`, D-070) and covers step 4 of its order of work. Teams and bibs (the squad splitter), "missing one", friends' in-app invites and notifications are separate steps (R3); this contract leaves room for them.

Spec: §6.5 (invites, join, remove, capacity), §7 (privacy, youth), C-010 (recording is optional).

## 1. What a link is

- One **join link per booking**: `https://<site>/j/<token>`. The token has 256 random bits (two v4 UUIDs' bytes), base64url (43 characters).
- **Why the token is stored, not hashed.** The organizer shares the same link many times (WhatsApp groups, later friends), so the server must be able to show it again. Guardian and staff links are one-time and hashed (D-033, D-068). A join link is a reusable capability for one match, readable only by the organizer through an RPC.
- The organizer can **reset** the link: the old one stops working at once and a new one is issued. Use it when a link spread further than intended.
- **Honesty dependency:** the link needs the public site's address, which waits on the owner's web hosting decision. Until it's set, production hides the share buttons (D-079 already does) and the join flow is reachable only through the app's own route.

## 2. Tables

All have RLS, explicit grants and pgTAP tests; clients read nothing directly.

- **`booking_invites`**
  - `id`, `booking_id`, `token` (unique), `created_at` (the exact moment, `clock_timestamp()`), `revoked_at`. No person: the link belongs to the booking, whose organizer made it.
  - At most one active link per booking (partial unique index on `booking_id` where `revoked_at is null`).
- **`booking_players`** (exists, D-071)
  - Gains a `player_ref uuid default gen_random_uuid()`, an opaque handle the organizer uses to remove someone. User ids never leave the server.
  - `removed_by` (exists) tells a player's own leave (themselves) apart from a removal (the organizer). Removals record the exact moment.

## 3. Who may join

`join_booking(token)` succeeds only when all of these hold. The first failure is the answer.

1. Rate limit: 30 join attempts per person per hour (`rate_limited`), checked before the link lookup so guessing is slow too.
2. The token names an active link (`invite_invalid` otherwise, the same answer for unknown and reset).
3. The caller is signed in and onboarded (`not_onboarded`).
4. The booking is confirmed (`booking_cancelled`) and hasn't started (`booking_started`).
5. The caller wasn't removed by the organizer while this link was active (`removed_from_booking`). A player who left on their own may come back. A link created after the removal lets them back in: resetting is the organizer's way to undo a removal.
6. An adult can't join a match a youth organized (`youth_only_match`; see "Age bands" below).
7. A **recorded** booking needs the caller's recording permission (`recording_consent_required`), and a youth needs a confirmed guardian (`guardian_required`) (C-010, §7). Unrecorded bookings are open to everyone.
8. There's room: active players < size × 2 + 2 (`booking_full`). The count and the insert happen under a lock on the booking row, so two people racing for the last spot can't both get in.

- **Already in:** joining again returns the booking as a success (idempotent).
- **Age bands (D-083, owner question B-Q2):** a youth's match stays within the youth band. An adult can't join a match organized by a youth (`youth_only_match`), while youth may join adults' matches. The spec keeps friendships and "missing one" in-band; this applies the same caution to links until the owner says otherwise. Youth privacy still applies inside the match (§6).
- **Blocking:** it arrives with friends (R3). A blocked person will get `invite_invalid`, so the block isn't revealed.

## 4. RPCs

| RPC                                   | Who                              | Notes                                                                                                                                                                                                                                                                                |
| ------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `booking_invite(booking)`             | organizer                        | Returns the active token, creating one if none exists. Only for a confirmed booking that hasn't started.                                                                                                                                                                             |
| `reset_booking_invite(booking)`       | organizer                        | Revokes the active link and returns a new token. Rate-limited to 10 a day per booking.                                                                                                                                                                                               |
| `booking_preview(token)`              | signed-in                        | What the join screen shows (§5), plus `can_join` and the reason when not.                                                                                                                                                                                                            |
| `booking_preview_public(token)`       | anyone (the web page)            | Venue, field, city, time, size, open spots and recorded yes/no. No names at all, no price and no players. A youth's match shows nothing but `details_hidden`. Unknown or reset links answer `invite_invalid`. The only anon-callable definer function (allow-listed in pgTAP `001`). |
| `join_booking(token)`                 | onboarded player                 | §3. Returns the receipt. Emits `player_joined`.                                                                                                                                                                                                                                      |
| `leave_booking(booking)`              | a player who isn't the organizer | Before kick-off. The organizer cancels instead (`organizer_cannot_leave`).                                                                                                                                                                                                           |
| `remove_player(booking, player_ref)`  | organizer                        | Before kick-off. Frees the spot; §3 rule 4 keeps them out through the same link.                                                                                                                                                                                                     |
| `booking_details(booking)` (extended) | organizer, players, staff        | Players gain `player_ref` for the organizer only, and `is_me`. Capacity and open spots added.                                                                                                                                                                                        |

## 5. The preview (signed in)

- Venue, field, city, time, length, size, open spots, recorded yes/no, and the booked total "paid in cash at the pitch". Splitting the cost is a match tool (R3).
- **"Invited by":** the organizer's display name, but only for an adult organizer. A youth organizer shows no name, since a youth's name is visible only to participants and guardians (§7).
- **No player list** before joining: the roster is for participants.
- `can_join` with one reason code from §3: `already_joined`, `not_onboarded`, `cancelled`, `started`, `removed`, `youth_only`, `recording_consent_required`, `guardian_required` or `full`. The screen explains it before the person taps Join.

## 6. Privacy (spec §7)

- Link holders learn the venue and time, never who plays. The public page shows no names at all.
- Inside the match, participants see display names (as today); a youth's name follows their guardian's rules.
- `player_ref` is per booking and useless outside it. User ids aren't exposed.
- Links hold no person, so the export and deletion guard (pgTAP `050`) is unchanged. Joins are in the export through the bookings a person plays in. Deleting an account removes its player rows; its future bookings are cancelled, which kills their links.

## 7. Clients

- **App route `j/[token]`:**
  - Signed out: the token is remembered for 24 hours across sign-in and onboarding (the existing resume mechanism), then the preview shows.
  - Signed in: the preview, then Join. Success opens the match details; failures show the reason.
- **Match details (organizer):** share the link (once the site address exists), reset the link, remove a player (with confirmation). **Other players:** leave, with confirmation.
- **Web `/[locale]/j/[token]`:** the public preview, "open in the app", and store links once the app is published.
- A join is shown as done only after `join_booking` answers, never optimistically.

## 8. Errors

`youth_only_match`, `invite_invalid`, `not_onboarded`, `booking_cancelled`, `booking_started`, `removed_from_booking`, `recording_consent_required`, `guardian_required`, `booking_full`, `rate_limited`, `not_organizer`, `organizer_cannot_leave`, `not_a_player`.

## 9. Test plan

- **pgTAP:**
  - link issue, reuse and reset (the old token fails at once)
  - each rule in §3, in order
  - joining twice is a no-op
  - removal keeps someone out through the same link, and a reset link lets them back
  - leaving and rejoining
  - the organizer can't leave
  - strangers can't issue, reset or remove
  - the public preview has no names
  - the preview hides a youth organizer's name
  - direct table reads are refused
  - export and deletion coverage
- **Race** (`tools/db-test/races.mjs`): two people join the last spot at the same time. Exactly one gets in; the other gets `booking_full`.
- **Live:** a smoke venue, the organizer's link, a second tester joins in the app, the organizer removes them and they can't rejoin, then cleanup.

## 10. Order of work

1. Migration and pgTAP, with the race test.
2. The app data layer and the join route. Mapping the new error codes needs locale strings, so it waits for Codex's X8 locale claim to end.
3. Organizer actions in match details, and the web page.

## Changes

### 2026-09-29 — built (D-083)

Migration `20260928003200_booking_invites.sql`, pgTAP `230-booking-invites.sql` (42 checks) and race 5 in `tools/db-test/races.mjs` (two people, the last spot: exactly one gets in). Differences from the proposal above are folded into the text:

- 256-bit tokens.
- No `created_by`.
- `removed_by` instead of `left_by_self`.
- The rate limit is checked first.
- A youth's match is for youth only (B-Q2), and its public page hides everything.
