# Contract: prepared Jordan pitch catalog (D1)

Status: **accepted (Codex 20:54); D1a implemented (D-045)** (Claude, 2026-09-28; changes at the end). Codex reviews presentation-facing parts; the owner decides the open questions (§10). Nothing here is built yet. Premise: D-032, `docs/PRODUCT_SPEC.md` §6.4, `docs/PRODUCTION_ROADMAP.md` G1/D1–D6.

## 1. Principles

1. **Our catalog only.** Search reads published rows of our own tables. No provider is queried at request time.
2. **Facility ≠ field.** A facility is a venue with an entrance and an operator. A pitch is one physical field in it. Search results are pitches, so one facility can have fields with different badges.
3. **Unknown is a value.** Design attributes are nullable. A null is shown as "unknown" or omitted, never replaced by a default (no "5-a-side", "artificial turf" or price unless evidenced).
4. **Three independent axes**, each changed only by an audited RPC:
   - `listing_state`: is it in search?
   - `participation`: the public badge.
   - `operator_state`: where outreach stands.

   A claim or outreach never flips the badge.

5. **Only verified participating fields enter booking and match paths**, through one database gate (`private.pitch_is_bookable`). The mobile app never decides this.
6. **Provenance on every fact.** Source records keep what the source said, and the published columns are the reviewed projection. An append-only evidence log says who asserted each value, from where and when.

## 2. Tables

All tables get RLS enabled, `revoke all` from `anon, authenticated`, and `service_role` grants. Clients never select them directly. Reads go through the search RPCs (§5), writes through admin/operator/player RPCs (§6). This is the same model as identity (D-025).

### 2.1 Places (extension)

| Change                                                                                            | Why                                                                            |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `governorates` (12 rows: code, name_ar, name_en) + `cities.governorate_code` (not null, FK)       | Coverage is reported per governorate (roadmap); cities alone can't express it. |
| Cities and neighbourhoods for new areas are added by migration or admin RPC as imports reach them | The 12 seeded cities are not a coverage denominator.                           |

### 2.2 Catalog

**`facilities`**: the venue.

| Column                                         | Type / rule                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`                                           | uuid pk                                                                                                                     |
| `name_ar`, `name_en`                           | text null; at least one non-null to publish                                                                                 |
| `city_id`, `neighborhood_id`                   | FK; neighbourhood nullable; composite FK keeps it inside the city (existing pattern)                                        |
| `address_ar`, `address_en`                     | text null                                                                                                                   |
| `lat`, `lng`                                   | double precision null; the **entrance**, not a centroid                                                                     |
| `location_confidence`                          | enum `unchecked` \| `approximate` \| `map_checked` \| `site_checked`                                                        |
| `access`                                       | enum `public_rental` \| `public_free` \| `members_only` \| `school_only` \| `closed` \| `unknown`                           |
| `listing_state`                                | enum `candidate` \| `published` \| `hidden` \| `duplicate` \| `closed` \| `rejected`; default `candidate`                   |
| `duplicate_of`                                 | uuid null FK facilities; required when `duplicate`                                                                          |
| `operator_state`                               | enum `none` \| `contacted` \| `responded` \| `claimed` \| `authority_verified` \| `declined` \| `opted_out`; default `none` |
| `last_reviewed_at`, `created_at`, `updated_at` | timestamptz                                                                                                                 |

Checks: `published` requires `access in ('public_rental','public_free')` (pending owner Q1), a city, and a non-null name. A `published` facility with `location_confidence = 'unchecked'` is allowed but returns no coordinates (§5.3).

**`pitches`**: one physical field. This replaces the mobile prototype's pitch concept at the data level.

| Column                 | Type / rule                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | uuid pk                                                                                                                                                                                                             |
| `facility_id`          | FK not null                                                                                                                                                                                                         |
| `label_ar`, `label_en` | text null ("ملعب 2"); null when the facility has one field                                                                                                                                                          |
| `players_per_side`     | smallint null, check 3–11 (5/6/7 are the pilot's sizes; 8 and 11 exist in Jordan)                                                                                                                                   |
| `futsal`               | boolean null (hard court with futsal goals)                                                                                                                                                                         |
| `length_m`, `width_m`  | numeric(5,1) null, sane ranges                                                                                                                                                                                      |
| `surface`              | enum null `artificial_turf` \| `natural_grass` \| `hard_court` \| `sand` \| `other`                                                                                                                                 |
| `indoor`, `lights`     | boolean null                                                                                                                                                                                                        |
| `amenities`            | text[] **null** = unknown; `{}` = checked, none; otherwise only evidenced items from a closed list (`changing_rooms`, `parking`, `water`, `seating`, `toilets`, `cafe`). Each non-null value needs `pitch_evidence` |
| `listing_state`        | same enum as facilities                                                                                                                                                                                             |
| `participation`        | enum `not_verified` \| `verified`, default `not_verified`; changed only by `admin_set_participation` (§6)                                                                                                           |
| `pitch_level`          | existing concept (`listed` \| `dock` \| `verified`): recording trust weight (§6.10), admin-set, independent of the badge                                                                                            |
| `verified_at`          | timestamptz null                                                                                                                                                                                                    |

Checks: a pitch is searchable only when it and its facility are both `published`. `participation = 'verified'` requires the facility's `operator_state = 'authority_verified'`, enforced in the RPC and by a trigger.

**`pitch_operations`**: exists only for participating fields; owner-confirmed.

`pitch_id` pk FK, `price_per_hour` numeric(6,2) (JOD), `price_note_ar/en`, `slot_minutes` (60 | 90), `opening_hours` jsonb (validated shape, Amman local times), `schedule_active` boolean default false, `confirmed_by` uuid (the staff member), `confirmed_at`. Staff of a **claimed** facility (`operator_state` `claimed` or `authority_verified`) may prepare and activate the schedule while the field is still not verified. That staging is private: search returns `operations: null` for every not-verified field, and `pitch_is_bookable` stays false until the badge flips (§3, §4).

**`pitch_evidence`**: append-only provenance per attribute.

`id`, `pitch_id` or `facility_id`, `attribute` (e.g. `surface`, `players_per_side`, `location`), `value` jsonb, `source_kind` (`osm` \| `operator` \| `field_team` \| `community` \| `reviewer`), `source_record_id` / `submission_id` null, `observed_at`, `recorded_by`, `recorded_at`. The published column holds whatever the latest **accepted** evidence says. The review RPC writes both in one transaction.

### 2.3 Sources and imports

| Table            | Key columns                                                                                                                                                                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import_runs`    | `id`, `source` (`osm_geofabrik`, …), `source_date`, `started_at`, `finished_at`, `counts` jsonb (new/changed/unchanged/gone per type)                                                                                                                                                                          |
| `source_records` | `id`, `source`, `source_key` (e.g. `osm:way/123456`), unique (`source`, `source_key`), `source_version`, `licence` (`ODbL-1.0`, `owner`, `internal`), `raw` jsonb (tags), `geometry` jsonb (GeoJSON), `first_seen_run`, `last_seen_run`, `gone_at`, `facility_id` / `pitch_id` null (the link a reviewer made) |

Re-import is an upsert on (`source`, `source_key`). It updates `raw`, `geometry`, `source_version` and `last_seen_run`. It never creates or edits facilities or pitches. A changed source record re-enters the review queue as "source changed"; one missing from a run gets `gone_at`, and a reviewer decides about closure.

### 2.4 Review, outreach, claims, submissions

| Table                   | Purpose                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listing_reviews`       | Append-only reviewer decisions: target, action (`publish`, `hide`, `mark_duplicate`, `mark_closed`, `split`, `merge_sources`, `update_facts`, `reject`), `before`/`after` jsonb, reason code, reviewer, at. Also mirrored to `audit_log`.                                                                                         |
| `verification_events`   | Append-only badge changes per pitch: from, to, reviewer, evidence refs, at. The only writer of `pitches.participation`.                                                                                                                                                                                                           |
| `facility_contacts`     | Operator business contact (name, E.164 phone, email), admin-only, deleted on `opted_out`.                                                                                                                                                                                                                                         |
| `outreach_attempts`     | facility, channel (`phone`, `visit`, `whatsapp`, `email`), outcome (`no_answer`, `interested`, `declined`, `opted_out`, `wrong_contact`, `agreed`), staff, at, next follow-up. Internal staff note allowed, max 500 characters, never shown to players.                                                                           |
| `facility_claims`       | A signed-in user claims a facility: status (`submitted`, `evidence_requested`, `approved`, `rejected`, `withdrawn`), evidence media (private bucket). Approval creates `pitch_staff` (owner) rows and sets `operator_state = 'claimed'`, **not** `authority_verified` and not the badge.                                          |
| `community_submissions` | Player reports: kind (`missing_pitch`, `closed`, `wrong_details`, `wrong_location`, `duplicate`), target null, structured payload (coordinates, attribute choices, plus a name of at most 80 characters for a missing pitch), status (`pending`, `accepted`, `rejected`). Rate-limited, visible only to the submitter and admins. |
| `pitch_media`           | Photos: facility/pitch, private storage path, `rights` (`owner_granted`, `staff_photo`, `cc_by`, `cc_by_sa`), attribution text, uploader, status (`pending`, `approved`, `rejected`). Only `approved` media with rights is ever returned.                                                                                         |

## 3. State machines

```
listing_state (facility, pitch):  candidate → published ⇄ hidden
                                  candidate → rejected
                                  any → duplicate (needs duplicate_of) | closed      (kept for audit, never searchable)

operator_state (facility):        none → contacted → responded → claimed → authority_verified
                                  any → declined | opted_out   (opted_out deletes facility_contacts)

participation (pitch):            not_verified → verified   only when operator_state = authority_verified,
                                                            the field details were confirmed by the operator,
                                                            and pitch_operations exists
                                  verified → not_verified   (operator leaves, schedule wrong, admin action)
```

A verified field without `schedule_active` shows the badge but no slots or Book button. The badge promises that the operator participates, not that it is open now.

### 3.1 Pause and freshness (Codex's review; the numbers are proposals, stored in `config.catalog_freshness`)

| Situation                                                                                 | Result                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First verification                                                                        | `admin_set_participation` checks, in one transaction: `authority_verified`, operator-confirmed facts, `pitch_operations` present and `schedule_active = true`, staged privately beforehand (D-032) |
| Operator pauses the schedule                                                              | Badge stays, "Bookings unavailable right now" (`الحجز غير متاح حالياً`), for at most `pause_days` (proposed 30)                                                                                    |
| Pause longer than `pause_days`, or operator facts older than `confirm_days` (proposed 90) | The listing enters the admin review queue as `stale`; after `grace_days` more (proposed 14) without re-confirmation, a scheduled job downgrades the badge to not verified                          |
| Partnership ends, or the integration is found wrong                                       | An admin downgrades immediately (`admin_set_participation`)                                                                                                                                        |

Every downgrade, including the scheduled one (`recorded_by` = system), writes a `verification_events` row. Re-verification follows the first-verification rule.

## 4. The booking gate

`private.pitch_is_bookable(p_pitch uuid) returns boolean`: pitch and facility `published`, `participation = 'verified'`, `pitch_operations.schedule_active`. Every R2 RPC calls it and fails closed with `pitch_not_bookable`: create booking, busy ranges, match creation, check-in and the QR poster. pgTAP proves an unverified pitch is refused by each of them as they land.

## 5. Read API (authenticated; anon pending Q2)

### 5.1 `search_pitches(p jsonb) returns jsonb`

Input (all optional): `city_id`, `neighborhood_id`, `q` (name text), `players_per_side[]`, `surface[]`, `indoor`, `lights`, `badge` (`all` \| `verified` \| `not_verified`; default `all`), `near` {`lat`, `lng`, `km` ≤ 25}, `bbox` {`s`, `w`, `n`, `e`} for the map viewport, `limit` ≤ 50, `cursor`.

Output: `{ items: [...], next_cursor }`. Each item is a **catalog listing**, and it is the same record for list and map:

```json
{
  "pitch_id": "…",
  "facility_id": "…",
  "facility_name": { "ar": "ملاعب الريم", "en": null },
  "label": { "ar": "ملعب 2", "en": "Pitch 2" },
  "city": { "ar": "عمّان", "en": "Amman" },
  "neighborhood": { "ar": "خلدا", "en": "Khalda" },
  "badge": "not_verified",
  "players_per_side": 5,
  "surface": null,
  "indoor": false,
  "lights": true,
  "amenities": null,
  "location": { "lat": 31.99, "lng": 35.84, "confidence": "map_checked" },
  "distance_km": 2.4,
  "access": "public_rental",
  "sources": ["osm"],
  "last_reviewed_at": "2026-10-02T10:00:00+03:00",
  "photo": null,
  "operations": null
}
```

A `verified` item adds `"operations": { "price_per_hour": 25, "price_note": {…}, "slot_minutes": 60, "bookable": <pitch_is_bookable> }`, plus its rating once ratings exist. `bookable` is the gate's actual result. When it is false (a paused schedule, §3.1), the app shows "Bookings unavailable right now" and no slots or Book button. "No times available right now" is a different state: the schedule is active but every slot is taken. A `not_verified` item always has `operations: null`, so there is nothing the app could render as a price or slot.

### 5.2 `catalog_pitch(p_pitch_id uuid) returns jsonb`

The same item, plus `siblings` (the facility's other searchable fields with their own badges), `attribution` (e.g. "© OpenStreetMap contributors"), and `can_report: true`. Null if not searchable.

### 5.3 Location precision

`unchecked` → `location: null` (city and neighbourhood only, list only; no pin or directions): "الموقع غير مؤكد / Location not confirmed". `approximate` → an approximate marker, no turn-by-turn: "موقع تقريبي / Approximate location". `map_checked` / `site_checked` → pin and directions to the facility entrance. Labels per Codex's G1 section in `docs/DESIGN.md`.

### 5.4 Search implementation (no PostGIS in D1)

- **Name search:** `private.normalize_ar(text)`, immutable. It strips tashkeel and tatweel, unifies أ/إ/آ → ا, ة → ه and ى → ي, lower-cases, and applies `unaccent` for Latin. It feeds a generated `search_text` over facility names, labels, neighbourhood and city names, with a `pg_trgm` GIN index. Similarity plus `ilike`, so "ريم" finds "الرّيم".
- **Near me and viewport:** `earthdistance` (`ll_to_earth`, GiST on `cube`), plus a btree on (`lat`, `lng`) for the bbox. Both extensions are in Supabase and in the Docker-free test Postgres (checked in `@embedded-postgres` 18.4). PostGIS is **not** in the test Postgres. Points, radius and bbox are all D1 needs, so PostGIS waits until polygon work is justified. The original GeoJSON stays in `source_records.geometry`.
- **Ordering:** distance when `near` is given, else verified first then name. The badge filter is explicit, so not-verified results are never silently hidden.

## 6. Write API

| RPC                                                                             | Who                   | Notes                                                                           |
| ------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `admin_upsert_source_record(source, key, version, licence, raw, geometry, run)` | service role (import) | Idempotent; never touches the catalog                                           |
| `admin_create_listing(source_record_ids[], facility jsonb, pitches jsonb[])`    | admin                 | Creates a candidate facility + fields from reviewed sources; writes evidence    |
| `admin_review_listing(target, action, patch, reason)`                           | admin                 | All `listing_state` and fact changes; writes `listing_reviews` + `audit_log`    |
| `admin_log_outreach(facility, channel, outcome, note, follow_up)`               | admin / field team    | Moves `operator_state` forward per §3                                           |
| `admin_decide_claim(claim, decision, reason)`                                   | admin                 | Approval → `pitch_staff` owner + `operator_state = claimed`                     |
| `admin_verify_authority(facility, evidence)`                                    | admin                 | → `authority_verified`                                                          |
| `owner_confirm_field(pitch, facts jsonb, operations jsonb)`                     | pitch staff (owner)   | Operator-sourced evidence + `pitch_operations`; no badge change                 |
| `admin_set_participation(pitch, to, evidence)`                                  | admin                 | The only badge writer; checks §3 preconditions                                  |
| `owner_set_schedule_active(pitch, active)`                                      | pitch staff           | Allowed for staff of a claimed facility; public and bookable only once verified |
| `claim_facility(facility, evidence_paths)`                                      | authenticated adult   | One open claim per user per facility; youth refused                             |
| `submit_catalog_report(kind, target, payload)`                                  | authenticated         | Rate-limited (e.g. 5/day); structured payload validated per kind                |

Admin checks use the existing `app_admins` table. A field-team role is a later addition (`app_admins.role`) if the owner staffs one.

## 7. Mobile data layer

- New `CatalogListing` type (the §5.1 item). The existing `Pitch` type stays the **bookable** shape, built only from a verified listing's `operations`, and is used by the booking sheet.
- `DataSource.searchPitches(filters)` and `catalogPitch(id)` replace `pitches()` for the Pitches tab. Production returns real rows (empty until the first reviewed import); demo returns labelled fixtures including not-verified and unknown-attribute samples. Codex decides the presentation.
- Report/correct, claim and "add missing pitch" come after D1 acceptance, with Codex's state spec.

## 8. Retention, export, deletion

- Source records, reviews and verification events are kept for audit, including for closed and duplicate listings.
- OSM attribution ("© OpenStreetMap contributors", ODbL) appears on list and detail views and in any data export. Derived-database obligations go to counsel before launch (roadmap).
- Account deletion (S1-9): community submissions are anonymised (`user_id` null) and their evidence stays; claims are withdrawn; staff links are removed.
- Operator opt-out deletes `facility_contacts` and stops outreach. The listing may stay as not verified if it is publicly accessible (owner to confirm, Q4).

## 9. Tests (pgTAP) and the sample records they use

Fixtures (in the test, not seeds):

- **F1 "ملاعب الريم":** one facility, two fields. Field A is verified with operations and `schedule_active`; field B is not verified.
- **F2:** one field with unknown size and surface (`players_per_side`, `surface`, `indoor` null) and `location_confidence = 'unchecked'`.
- **F3:** a school field (`access = 'school_only'`), candidate.
- **F4:** a published facility later marked `duplicate` of F1.

Negative and positive cases:

1. `search_pitches` returns F1-A and F1-B with their own badges, and F2 with nulls (no defaults) and `location: null`.
2. F3 cannot be published (`access_not_public`) and never appears.
3. F4 does not appear after `mark_duplicate`; candidate, hidden, rejected and closed rows never appear, whether by facility or by pitch state.
4. `pitch_is_bookable`: F1-A true; F1-B, F2 and a verified field with a paused schedule false. `search_pitches` returns F1-A with `bookable: true`, a paused verified field with `bookable: false` and badge `verified`, and F1-B with `operations: null`. The `badge: not_verified` filter returns only F1-B and F2.
   4a. Freshness: a paused field past `pause_days + grace_days` and a field with facts older than `confirm_days + grace_days` are downgraded by the scheduled job, with a system `verification_events` row; a fresh paused field is not. Verification is refused while the schedule is inactive.
   4b. Amenities: `null` and `{}` round-trip distinctly; a non-null value without evidence is refused.
5. `anon` and `authenticated` cannot select any catalog table or call any `admin_*` RPC. A non-admin calling them gets `forbidden`.
6. `admin_set_participation(F1-B, 'verified')` fails while `operator_state <> 'authority_verified'` and while no operations exist. Approving a claim leaves the badge `not_verified`.
7. Staff of F1 cannot edit F2. A non-staff user cannot stage a schedule.
   7a. **Lifecycle (positive):** F1-B goes claimed → `authority_verified` → `owner_confirm_field` → `owner_set_schedule_active(true)` while not verified → `admin_set_participation(verified)`. Afterwards `pitch_is_bookable` is true and search returns its operations with `bookable: true`.
   7b. **Staging stays private (negative):** before that last step, F1-B's staged operations are absent from `search_pitches` and `catalog_pitch` (`operations: null`), `pitch_is_bookable` is false, and booking RPCs refuse it. `admin_set_participation` is refused while the schedule is inactive or the operations are missing.
8. Re-running `admin_upsert_source_record` with the same key updates in place (one row); a changed version flags it for review; no facility or pitch is created.
9. Arabic search: "الريم", "ريم" and "رِيم" all find F1; the English "reem" finds it only if `name_en` is set.
10. `near` returns F1 within 5 km ordered by distance; a bbox excludes out-of-view rows.
11. A community report is visible to its submitter and admins only; the 6th in a day hits `rate_limited`. A youth `claim_facility` is refused.
12. Every state change writes `listing_reviews` / `verification_events` and `audit_log`.

## 10. Open questions

| #   | For   | Question                                                                                      | Proposed default until answered                                                                                                                                                                     |
| --- | ----- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | owner | Do members-only or school fields count as "available"?                                        | Not published (roadmap default)                                                                                                                                                                     |
| Q2  | owner | Can signed-out web visitors search the catalog (SEO), or signed-in app users only?            | Signed-in only; revisit with S1-8 web                                                                                                                                                               |
| Q3  | Codex | Badge copy for a paused verified field; location labels                                       | **Answered** (17:22): badge stays with "Bookings unavailable right now" within the pause SLA (§3.1); labels in §5.3                                                                                 |
| Q4  | owner | An operator who opts out: keep their publicly accessible field as not verified, or remove it? | Keep as not verified, remove contacts                                                                                                                                                               |
| Q5  | owner | Staff a field team (a role beyond admins)?                                                    | Admins only                                                                                                                                                                                         |
| Q6  | Codex | Card vs detail attributes                                                                     | **Answered** (17:22): card shows facility and field label, city/area, badge, and known players-per-side, surface, indoor/outdoor, lights; dimensions, amenities and rights-cleared photos on detail |

## 11. Implementation order after acceptance

1. **D1a** migration: governorates, catalog tables, enums, `normalize_ar`, search and detail RPCs, `pitch_is_bookable`, pgTAP (§9 cases 1–5, 9–10). No data.
2. **D1b:** admin review, outreach, claim and verification RPCs + pgTAP (6–8, 11–12).
3. **D2 import tool** (`tools/catalog-import`): Geofabrik Jordan PBF → football `leisure=pitch` / sports centres → `admin_upsert_source_record`. The tool choice (e.g. `pyosmium` under `uv`, matching the Python worker) gets logged as a dependency when it lands. The first run is counts only, nothing published.
4. **Mobile:** `CatalogListing`, `searchPitches`, production Pitches tab on real (empty, then reviewed) data, per Codex's list/map/card spec.
5. **Review tooling** in the web admin (S1-8 scaffold first).

## Changes

- **2026-09-28 19:55, after Codex's 17:22 review.**
  - `amenities` is nullable: null means unknown and `{}` means checked, none.
  - `operations.bookable` returns the gate's actual result.
  - The badge filter gains `not_verified`.
  - A pause and freshness rule is added (§3.1), with proposed numbers in config and tests 4a and 4b.
  - Codex's location labels are adopted, and Q3 and Q6 are marked answered.
  - Unchanged: not-verified items keep `operations: null` (no price and no slots).
- **2026-09-28 20:30, after Codex's 17:33 review.** Fixed a deadlock: a schedule could only be activated on a verified field, yet verification required an active schedule. Operators now stage and activate the schedule privately while not verified; the badge flip checks it; nothing is public or bookable before the flip. Added lifecycle tests 7a (positive) and 7b (staging stays private).
- **2026-09-28 22:30, D1a implemented (D-045).** Deviations: haversine plus a bbox prefilter instead of `earthdistance` (its functions fail under a pinned empty `search_path`), no `unaccent` yet, an offset cursor, and staff/reviewer references without foreign keys. `catalog_pitch` also returns `dimensions` and `address`; listings include `futsal`.
