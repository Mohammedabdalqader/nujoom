# Contract: reviewed catalog records → import (D2)

Status: **proposal** by Claude, 2026-09-29 (D-051). Answers Codex's request (21:14) for a reviewed-record handoff format. The database side is live: `import_start_run`, `import_catalog_record`, `import_finish_run`. The command-line tool is live too: `pnpm --filter @nujoom/tools-catalog-import load <batch.json> [--dry-run]` (D-052).

## What gets imported

Only **reviewed field records**. An intake record (`catalog/intake/*.json`, Codex's schema v1) becomes importable once a reviewer adds a `review` block that confirms current public access and the exact field identity. The import:

- creates an **unpublished candidate** facility and field. An admin publishes it later through `admin_review_listing`, which also records that decision.
- records the source record verbatim (source, key = the record `id`, version = content hash, licence) and turns each cited fact into evidence pointing at it.
- **never** imports `photoLeads` (they aren't permissions) or `facilityLeads` (they aren't fields).
- **refuses** any record claiming `publication` other than `unpublished`, `participation` other than `not_verified`, or non-null `operations`.
- is **idempotent**. Re-importing an unchanged record changes nothing. A changed record is flagged `needs_review` and never overwrites the reviewed catalog.

## Record format (per field)

The intake pitch object as validated by `tools/catalog/validate.mjs`, plus:

```json
"review": {
  "reviewedAt": "2026-10-01",
  "reviewer": "field-team",
  "accessConfirmed": true,
  "access": "public_rental",
  "identityConfirmed": true,
  "locationConfidence": "map_checked",
  "lat": 31.98,
  "lng": 35.88
}
```

| Field                | Rule                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `reviewedAt`         | ISO date of the review. Also the evidence date when the record has no `checkedAt`.                                                       |
| `reviewer`           | Who reviewed: a team or role label, not a private person's contact.                                                                      |
| `accessConfirmed`    | `true` only when current public access was confirmed; otherwise the record is refused (`not_reviewed`).                                  |
| `access`             | The reviewer's classification: `public_rental` or `public_free`. School and members-only fields are never importable (owner Q1 default). |
| `identityConfirmed`  | `true` only when this is one distinguishable physical field, not a guess from a multi-field venue.                                       |
| `locationConfidence` | `unchecked`, `approximate`, `map_checked` or `site_checked`. Anything but `unchecked` needs `lat`/`lng` of the **entrance**.             |
| `lat`, `lng`         | Entrance coordinates, inside Jordan.                                                                                                     |

Other mappings:

- `city` matches a city's English or Arabic name; `areaAr` matches a neighbourhood in that city when one exists.
- `surface` must be `artificial_turf`, `natural_grass`, `hard_court`, `sand` or `other`, or `null`.
- Unknown attributes stay `null`.

## Batch file and licence

A reviewed batch is the intake batch shape (`schemaVersion`, `batchId`, `checkedAt`, `pitches`) with `review` on each pitch meant for import. Pitches without a completed review are skipped and reported. The tool passes a licence label per batch, e.g. `research-notes` for desk research citing official pages, or `ODbL-1.0` for an OSM extract. Source URLs and summaries stay internal evidence and are never shown to players.

## Results

`import_catalog_record` returns `created`, `unchanged`, `changed` or `rejected` (with `reason`: `claims_not_allowed`, `not_reviewed`, `invalid_location`, `unknown_city`, `invalid_value`, `invalid_id`). `import_finish_run` returns `seen` / `new` / `needs_review` / `gone` counts. Only full-snapshot sources, such as an OSM extract, mark missing records as gone.
