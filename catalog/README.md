# Pitch catalog intake

`intake/` is a research workspace, **not** a production seed, app fixture or approved public directory. Each pitch candidate represents one distinguishable physical field. A venue reporting multiple fields without individual identities stays in `facilityLeads`; do not manufacture numbered fields.

Run `node tools/catalog/validate.mjs catalog/intake/amman-2026-09-28.json` and `node --test tools/catalog/validate.test.mjs` from the repository root. The validator rejects booking/verification claims, unsupported known attributes, duplicate identities and attached image files. It does not approve a listing. The D1 admin review and database gate remain separate.

Before any candidate can be published, a reviewer must confirm current public access, exact field identity, facility entrance/location confidence, operator facts where relevant, and source provenance. Preserve unknown attributes as `null`. The first two Amman candidates have official municipal evidence of a football field and a reservation route, but **have not passed current-access or location review**. The two facility leads are deliberately not field rows.

`photoLeads` are URLs to inspect, not image assets or permission grants. A real field photo requires a documented match to that physical field, reuse rights (including attribution terms), and a review date before it enters `pitch_media`. Until then the app must use its no-photo state. Never use a venue's general image, designed placeholder or generated image as a photograph of a real field.

The prepared catalog can show reviewed, publicly accessible fields as **Not verified by Nujoom** without an operator partnership. A badge of **Verified by Nujoom**, price, live slots, booking, match creation and check-in require the separate operator and schedule gates in D-032. This intake cannot set them.
