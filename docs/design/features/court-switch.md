# Court switch
Updated: 2026-10-08
Status: implemented on `feature/court-switch`, review fixes verified by full re-capture (see Verification)

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

| 2026-10-08 | Owner review: "too many places where things are not updated." A full capture review found Kerala still on 385 of 798 Gujarat captures and 51 of 100 in Punjab and Haryana: places, "Kerala", Bar numbers, PINs, Malayalam-script names, numbers in prose. | Owner, review | Fixed, see below |
| 2026-10-08 | Kerala's sample geography moves with the court: each Kerala town maps to a real town in the state (Kollam → Ahmedabad / Ludhiana / Panchkula), as do PINs, Bar Council prefixes, "Kerala" and "Malayalam". People's names stay. | Implementation choice under the owner's "Gujarat instead of Kollam" | Built |
| 2026-10-08 | For any state but Kerala, a render layer (`court-text-layer.tsx`) re-voices all shown text and labels; switching courts reloads the page. Replaces chasing render sites one at a time. Inputs, editors and Settings' court cards are left alone. | Implementation choice after the review | Built |

## Changes and tradeoffs

- **Display transform, not per-state fixtures.** Forking about 1,000 fixtures per state was
  rejected. The cost is that stored data, URLs and lookups stay Kerala, so a few
  server-rendered strings follow the court only after `router.refresh()`.
- **Cookie, not `localStorage`.** This lets the server render the right court with no flash.
  The cost is that the root layout is now dynamic.
- **Gujarat's type from the sequence.** No classification field exists. `seq % 5` gives
  eCR EN on 3, eCR MA on 4, and eCC otherwise. It is stable per case and mostly eCC.
- **Render layer over per-site wrappers.** The first build re-voiced chosen render
  sites and missed the long tail; the review proved it. The layer is one mechanism for
  every screen. Costs: it is a demo seam (a live build reads state data from MDMS), a
  non-Kerala page is hidden until the layer's first pass (2s safety reveal), and
  switching courts reloads. Text typed into inputs is not rewritten; filing drafts are
  re-voiced as they load instead, and order text is filled from re-voiced facts.
- **Assumptions to confirm:**
  - Talwana ₹50 is billed per process.
  - The Punjab CNR prefix `PBXX03` is a placeholder.
  - Gujarat's "Application fee ₹3" is not billed at filing, since condonation has its own line.
  - Gujarat's e-filing number keeps the platform shape (`GJ-000049-2025`).
  - Process delivery (e-post ₹100) stays for every state.

## Verification and open work

- **Review, 2026-10-08.** Every route on both sides captured with Playwright against
  :3001 on this branch: Gujarat explored through tabs, menus and dialogs (about 800
  states), Punjab and Haryana screen by screen (100 each). Each capture was checked for
  Kerala places (127, from `places.ts`), house names, "Kerala", "Malayalam", Malayalam
  script, Kerala case, filing and CNR numbers, Bar numbers, PINs, "24×7 ON Court", Kerala
  fee heads and, in Punjab, "Sign and oath". Checks covered visible text, aria-labels,
  titles, placeholders, form values and the tab title.
  - Before the fix: 481 of 998 captures still showed Kerala. This is an undercount: that
    pass did not yet know Kollam's villages or house names.
  - After the fix: 0 of 984, with no console or hydration errors.
  - Annotated before/after review: https://claude.ai/artifact/J2xNRip6MxeHXbPmYnfz8J
- **Kerala.** Unchanged: smoke-checked on Settings, hearings, a case, registrations and
  cognizance, with no errors.
- **Automated.** `lib/court/*.test.ts` (19) pass. App suite: 1129 pass, 3 fail. The 3
  failures are the oath tests, which also fail on `origin/main`. DS gates pass except the
  pre-existing `companion-rail.tsx` spacing finding.
- **Open.**
  - Real logos and court names.
  - Punjab's CNR district code.
  - Talwana unit.
  - People's names stay Malayali (owner to decide).
  - Malayalam second-language copy needs state translations.
  - Download filenames still carry Kerala numbers.
  - Sample geography is town-by-town, not district-consistent.
