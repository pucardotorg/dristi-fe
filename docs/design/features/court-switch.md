# Court switch
Updated: 2026-10-08
Status: implemented (uncommitted on `feature/court-switch`; render-checked on :3001)

## Current outcome

Settings → Court picks which state's court the whole app runs as: **Kerala** (the
designed baseline, unchanged), **Gujarat**, **Punjab** or **Haryana**. The choice re-voices
the existing screens. No screen, step or field is added.

- **Where it is set.** A Court section at the foot of `/settings`
  ([court-setting.tsx](../../../apps/dristi-app/src/components/court/court-setting.tsx)), and a
  Court group in the court side's settings menu
  ([employee-nav.tsx](../../../apps/dristi-app/src/components/employee/employee-nav.tsx)). Both
  use one provider
  ([court-provider.tsx](../../../apps/dristi-app/src/components/court/court-provider.tsx)) and
  store the choice in the `dristi-court` cookie. The root layout reads the cookie, so the
  first paint is already in the chosen state.
- **What changes.** All of it is defined in
  [profiles.ts](../../../apps/dristi-app/src/lib/court/profiles.ts),
  [fees.ts](../../../apps/dristi-app/src/lib/court/fees.ts) and
  [localize.ts](../../../apps/dristi-app/src/lib/court/localize.ts):
  - **Logo and name.** A dashed placeholder mark plus the state's name ("Gujarat"). Court
    names become "Gujarat Court", and a bench becomes "JMFC Court 1, Gujarat".
  - **Case numbers.**
    - Gujarat: CMP → `eCC`, `eCR EN` or `eCR MA` (the type is picked from the sequence),
      ST → `eCC`, filing number `GJ-…`, CNR `GJAH01…`.
    - Punjab and Haryana: everything → `NACT/n/yyyy`. CNR is `HRPK03…` for Haryana and
      `PBXX03…` for Punjab.
  - **Documents.** Every court document facsimile, the filing complaint, the scrutiny
    packet and the text downloads use the state's court and numbers.
  - **Fees.** Gujarat uses schedule 2 and Punjab/Haryana use schedule 3, both for the filing
    bill and for the vakalatnama join fees.
  - **Punjab's filing step.** Labelled "Sign" instead of "Sign and oath".
  - **Search.** A number typed the way the selected state shows it (for example
    `NACT/241/2026`) still finds the case (`caseSearchKey`).
- **How it is wired.** Fixtures stay in Kerala's terms; this is a display transform only.
  It is applied at a few shared points: `Identifier`, the brand marks, the document
  components (`useCourtLocalized`), court-name cells (`useCourtText`), `feeBill(draft,
  schedule)` and the downloads (`localizeForDownload`).

## Decisions

| Date | Decision and reason | Source | Status |
|---|---|---|---|
| 2026-10-05 | Court name and logo must be swappable from the UI. | Stakeholder, relayed by owner | Superseded by the next row |
| 2026-10-08 | The swap lives in Settings and covers logo, case numbers, documents and so on, not just branding. | Owner | Built |
| 2026-10-08 | Kerala is already designed and stays as it is. The switch adds the other states; the interface stays the same and only what the stakeholder docs list changes. | Owner | Built |
| 2026-10-08 | Use a placeholder logo or the plain state name until the states send assets. Documents show the state in place of Kollam and similar. | Owner | Built |
| 2026-10-08 | Punjab and Haryana are separate states, so they get separate options. | Owner | Built. Both use schedule 3, since the doc has one schedule for P&H. |
| 2026-10-08 | Payment Logic schedule 1 is Kerala, 2 is Gujarat, 3 is Punjab and Haryana. | Owner | Built |
| 2026-10-08 | Leave Kerala's current fees alone, even though they differ from schedule 1. | Owner | Built |
| 2026-10-08 | Punjab only: the step is "Sign", not "Sign and oath". | Owner | Built. Label only; `ADVOCATE_OATH` is already off for everyone. |
| 2026-10-08 | Gujarat's case type is carried by the sample case; no new type picker at scrutiny. | Proposed by Claude, not explicitly confirmed | Built as proposed |
| 2026-10-08 | Branch `feature/court-switch` from `origin/main`. The owner wrote "feature-court-switch"; the repo convention `feature/<kebab>` was used. | Owner request / CLAUDE.md | Done |

## Changes and tradeoffs

- **Display transform, not per-state fixtures.** Forking about 1,000 fixtures per state was
  rejected. The cost is that stored data, URLs and lookups stay Kerala, so a few
  server-rendered strings follow the court only after `router.refresh()`.
- **Cookie, not `localStorage`.** This lets the server render the right court with no flash.
  The cost is that the root layout is now dynamic.
- **Gujarat's type from the sequence.** No classification field exists. `seq % 5` gives
  eCR EN on 3, eCR MA on 4, and eCC otherwise. It is stable per case and mostly eCC.
- **Assumptions to confirm:**
  - Talwana ₹50 is billed per process.
  - The Punjab CNR prefix `PBXX03` is a placeholder.
  - Gujarat's "Application fee ₹3" is not billed at filing, since condonation has its own line.
  - Gujarat's e-filing number keeps the platform shape (`GJ-000049-2025`).
  - Process delivery (e-post ₹100) stays for every state.

## Verification and open work

- **Automated.** `lib/court/*.test.ts`: 12 tests pass. App suite: 1122 pass, 3 fail. The 3
  failures are the oath tests in `queue.test.ts` and `sample-drafts.test.ts`, which fail
  identically on `origin/main`.
- **DS gates.** tokens, typography, ui-sync and table-rows pass. Spacing fails only on the
  pre-existing `companion-rail.tsx:226 gap-3.5`, which is also on `origin/main`. ESLint is
  clean on changed files.
- **Render.** Playwright against `localhost:3001` (this checkout, `feature/court-switch`):
  - `/settings` checked at desktop (light) and 375px (dark).
  - In-place switch and persistence across navigation.
  - Court rail, court sign-in, signing document dialog, filing Sign step, and the Punjab
    fee bill (₹62 + ₹100 + ₹100).
  - 20 routes swept in Haryana: 0 Kerala-format numbers or "ON Court" left on the 17 that
    resolved. The other 3 were guessed URLs that don't exist (404).
- **Not checked.** Screen readers, every dialog and peek, download filenames (these still
  carry the Kerala number).
- **Open.**
  - Real logos, court names and Punjab CNR codes.
  - Confirm the Talwana unit.
  - The vakalatnama court list still offers Kerala stub courts (Ernakulam, Kochi).
  - The landing page placeholder copy still says "24×7 ON Courts".
  - Not committed or PR'd.
