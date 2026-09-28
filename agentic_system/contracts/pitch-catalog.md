# Contract: prepared Jordan pitch catalog (D1)

Status: **proposal** by Claude, 2026-09-28. Codex reviews presentation-facing parts; the owner decides the open questions (§10). Nothing here is built yet. Premise: D-032, `docs/PRODUCT_SPEC.md` §6.4, `docs/PRODUCTION_ROADMAP.md` G1/D1–D6.

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

| Column                 | Type / rule                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                   | uuid pk                                                                                                                                    |
| `facility_id`          | FK not null                                                                                                                                |
| `label_ar`, `label_en` | text null ("ملعب 2"); null when the facility has one field                                                                                 |
| `players_per_side`     | smallint null, check 3–11 (5/6/7 are the pilot's sizes; 8 and 11 exist in Jordan)                                                          |
| `futsal`               | boolean null (hard court with futsal goals)                                                                                                |
| `length_m`, `width_m`  | numeric(5,1) null, sane ranges                                                                                                             |
| `surface`              | enum null `artificial_turf` \| `natural_grass` \| `hard_court` \| `sand` \| `other`                                                        |
| `indoor`, `lights`     | boolean null                                                                                                                               |
| `amenities`            | text[] not null default `{}`: only evidenced items from a closed list (`changing_rooms`, `parking`, `water`, `seating`, `toilets`, `cafe`) |
| `listing_state`        | same enum as facilities                                                                                                                    |
| `participation`        | enum `not_verified` \| `verified`, default `not_verified`; changed only by `admin_set_participation` (§6)                                  |
| `pitch_level`          | existing concept (`listed` \| `dock` \| `verified`): recording trust weight (§6.10), admin-set, independent of the badge                   |
| `verified_at`          | timestamptz null                                                                                                                           |

Checks: a pitch is searchable only when it and its facility are both `published`. `participation = 'verified'` requires the facility's `operator_state = 'authority_verified'`, enforced in the RPC and by a trigger.

**`pitch_operations`**: exists only for participating fields; owner-confirmed.

`pitch_id` pk FK, `price_per_hour` numeric(6,2) (JOD), `price_note_ar/en`, `slot_minutes` (60 | 90), `opening_hours` jsonb (validated shape, Amman local times), `schedule_active` boolean default false, `confirmed_by` uuid (the staff member), `confirmed_at`. A trigger refuses `schedule_active = true` unless the pitch is `verified`.

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

A verified field without `schedule_active` shows the badge but no slots or Book button. The badge promises that the operator participates, not that it is open now (Codex to confirm copy, §10).

## 4. The booking gate

`private.pitch_is_bookable(p_pitch uuid) returns boolean`: pitch and facility `published`, `participation = 'verified'`, `pitch_operations.schedule_active`. Every R2 RPC calls it and fails closed with `pitch_not_bookable`: create booking, busy ranges, match creation, check-in and the QR poster. pgTAP proves an unverified pitch is refused by each of them as they land.

## 5. Read API (authenticated; anon pending Q2)

### 5.1 `search_pitches(p jsonb) returns jsonb`

Input (all optional): `city_id`, `neighborhood_id`, `q` (name text), `players_per_side[]`, `surface[]`, `indoor`, `lights`, `badge` (`all` \| `verified`), `near` {`lat`, `lng`, `km` ≤ 25}, `bbox` {`s`, `w`, `n`, `e`} for the map viewport, `limit` ≤ 50, `cursor`.

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
  "amenities": [],
  "location": { "lat": 31.99, "lng": 35.84, "confidence": "map_checked" },
  "distance_km": 2.4,
  "access": "public_rental",
  "sources": ["osm"],
  "last_reviewed_at": "2026-10-02T10:00:00+03:00",
  "photo": null,
  "operations": null
}
```

A `verified` item adds `"operations": { "price_per_hour": 25, "price_note": {…}, "slot_minutes": 60, "bookable": true }`, plus its rating once ratings exist. A `not_verified` item always has `operations: null`, so there is nothing the app could render as a price or slot.

### 5.2 `catalog_pitch(p_pitch_id uuid) returns jsonb`

The same item, plus `siblings` (the facility's other searchable fields with their own badges), `attribution` (e.g. "© OpenStreetMap contributors"), and `can_report: true`. Null if not searchable.

### 5.3 Location precision

`unchecked` → `location: null` (city and neighbourhood only; no pin, no directions). `approximate` → pin, "approximate" label, no turn-by-turn. `map_checked` / `site_checked` → pin and directions. Codex specifies the labels.

### 5.4 Search implementation (no PostGIS in D1)

- **Name search:** `private.normalize_ar(text)`, immutable. It strips tashkeel and tatweel, unifies أ/إ/آ → ا, ة → ه and ى → ي, lower-cases, and applies `unaccent` for Latin. It feeds a generated `search_text` over facility names, labels, neighbourhood and city names, with a `pg_trgm` GIN index. Similarity plus `ilike`, so "ريم" finds "الرّيم".
- **Near me and viewport:** `earthdistance` (`ll_to_earth`, GiST on `cube`), plus a btree on (`lat`, `lng`) for the bbox. Both extensions are in Supabase and in the Docker-free test Postgres (checked in `@embedded-postgres` 18.4). PostGIS is **not** in the test Postgres. Points, radius and bbox are all D1 needs, so PostGIS waits until polygon work is justified. The original GeoJSON stays in `source_records.geometry`.
- **Ordering:** distance when `near` is given, else verified first then name. The badge filter is explicit, so not-verified results are never silently hidden.

## 6. Write API

| RPC                                                                             | Who                   | Notes                                                                        |
| ------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `admin_upsert_source_record(source, key, version, licence, raw, geometry, run)` | service role (import) | Idempotent; never touches the catalog                                        |
| `admin_create_listing(source_record_ids[], facility jsonb, pitches jsonb[])`    | admin                 | Creates a candidate facility + fields from reviewed sources; writes evidence |
| `admin_review_listing(target, action, patch, reason)`                           | admin                 | All `listing_state` and fact changes; writes `listing_reviews` + `audit_log` |
| `admin_log_outreach(facility, channel, outcome, note, follow_up)`               | admin / field team    | Moves `operator_state` forward per §3                                        |
| `admin_decide_claim(claim, decision, reason)`                                   | admin                 | Approval → `pitch_staff` owner + `operator_state = claimed`                  |
| `admin_verify_authority(facility, evidence)`                                    | admin                 | → `authority_verified`                                                       |
| `owner_confirm_field(pitch, facts jsonb, operations jsonb)`                     | pitch staff (owner)   | Operator-sourced evidence + `pitch_operations`; no badge change              |
| `admin_set_participation(pitch, to, evidence)`                                  | admin                 | The only badge writer; checks §3 preconditions                               |
| `owner_set_schedule_active(pitch, active)`                                      | pitch staff           | Refused unless verified                                                      |
| `claim_facility(facility, evidence_paths)`                                      | authenticated adult   | One open claim per user per facility; youth refused                          |
| `submit_catalog_report(kind, target, payload)`                                  | authenticated         | Rate-limited (e.g. 5/day); structured payload validated per kind             |

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
4. `pitch_is_bookable`: F1-A true; F1-B, F2 and a verified field with an inactive schedule false.
5. `anon` and `authenticated` cannot select any catalog table or call any `admin_*` RPC. A non-admin calling them gets `forbidden`.
6. `admin_set_participation(F1-B, 'verified')` fails while `operator_state <> 'authority_verified'` and while no operations exist. Approving a claim leaves the badge `not_verified`.
7. `owner_set_schedule_active` on a not-verified field fails. Staff of F1 cannot edit F2.
8. Re-running `admin_upsert_source_record` with the same key updates in place (one row); a changed version flags it for review; no facility or pitch is created.
9. Arabic search: "الريم", "ريم" and "رِيم" all find F1; the English "reem" finds it only if `name_en` is set.
10. `near` returns F1 within 5 km ordered by distance; a bbox excludes out-of-view rows.
11. A community report is visible to its submitter and admins only; the 6th in a day hits `rate_limited`. A youth `claim_facility` is refused.
12. Every state change writes `listing_reviews` / `verification_events` and `audit_log`.

## 10. Open questions

| #   | For   | Question                                                                                                                  | Proposed default until answered                       |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Q1  | owner | Do members-only or school fields count as "available"?                                                                    | Not published (roadmap default)                       |
| Q2  | owner | Can signed-out web visitors search the catalog (SEO), or signed-in app users only?                                        | Signed-in only; revisit with S1-8 web                 |
| Q3  | Codex | Badge copy for a verified field whose schedule isn't active yet, and the labels for `approximate` / `unchecked` locations | Badge shown, no slots; "approximate location" label   |
| Q4  | owner | An operator who opts out: keep their publicly accessible field as not verified, or remove it?                             | Keep as not verified, remove contacts                 |
| Q5  | owner | Staff a field team (a role beyond admins)?                                                                                | Admins only                                           |
| Q6  | Codex | Which design attributes appear on the card and which only on the detail view (dimensions, amenities)                      | Card: size, surface, indoor, lights; detail: the rest |

## 11. Implementation order after acceptance

1. **D1a** migration: governorates, catalog tables, enums, `normalize_ar`, search and detail RPCs, `pitch_is_bookable`, pgTAP (§9 cases 1–5, 9–10). No data.
2. **D1b:** admin review, outreach, claim and verification RPCs + pgTAP (6–8, 11–12).
3. **D2 import tool** (`tools/catalog-import`): Geofabrik Jordan PBF → football `leisure=pitch` / sports centres → `admin_upsert_source_record`. The tool choice (e.g. `pyosmium` under `uv`, matching the Python worker) gets logged as a dependency when it lands. The first run is counts only, nothing published.
4. **Mobile:** `CatalogListing`, `searchPitches`, production Pitches tab on real (empty, then reviewed) data, per Codex's list/map/card spec.
5. **Review tooling** in the web admin (S1-8 scaffold first).
