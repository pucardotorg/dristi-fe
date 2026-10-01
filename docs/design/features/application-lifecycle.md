# Application lifecycle
Updated: 2026-10-01
Status: implemented (render-checked on desktop light and 375px; dark pending)

## Current outcome
The prototype runs the application lifecycle from `handovers/application-lifecycle.md`
(v26, PUCAR working folder) end to end, filer to magistrate, on one shared record in the
browser (`apps/dristi-app/src/lib/applications/store.ts`). Change list it implements:
`docs/application-prototype-changes.md` (`ACH-1`–`ACH-30`, PUCAR working folder).

- Rules: `src/lib/applications/lifecycle.ts` (pure, unit-tested in `lifecycle.test.ts`).
- Citizen side: case Applications tab (`components/cases/case-applications.tsx`), raise
  flow (`raise-application-form.tsx`, `add-signature-dialog.tsx`), record dialog.
- Court side: rail items **Onboard applications** and **Decide on applications** (`components/employee/application-tasks-screen.tsx`,
  `application-task-dialog.tsx`).
- Sandbox seat control ("acting as" role + side) on the Applications tab.

## Decisions
| Date | Decision and reason | Source | Status |
|---|---|---|---|
| 2026-10-01 | Build the change list against the lifecycle PRD | Owner ("make prototype changes") | Done |
| 2026-10-01 | Court queue split into two tabs, Onboard applications / Decide on applications | Owner, mid-build | Superseded |
| 2026-10-01 | The two queues are two rail items under Review applications, each its own route (`/employee/onboard-applications`, `/employee/decide-applications`) | Owner | Done |
| 2026-10-01 | Six sample applications (three per queue, one with an objection) seeded once per browser through the real lifecycle steps (`lib/applications/seed.ts`) | Owner ("add data to view") | Done |
| 2026-10-01 | Onboarding is magistrate-only (`ALC-22`), not "any of the three" (`order-generation.md` `APL-02`) | Implementation choice — follows the lifecycle PRD; conflict open | Open |
| 2026-10-01 | Numbers named per the lifecycle PRD: temporary identifier at filing, application number (CMP/…) at onboarding | Implementation choice; `Q-5` still open | Open |
| 2026-10-01 | Orders (dismiss / accept / reject) drafted and signed inside the task dialog, not the hearing composer | Implementation choice — composer is per hearing and has no link to citizen cases | Open |
| 2026-10-01 | Bail files through the inline form so it enters the lifecycle; the staged bail dialog is no longer opened from the raise flow | Implementation choice | Review |
| 2026-10-01 | Document submissions dropped from the Applications register (View Case `CHG-28`) | Change list | Done |

## Changes and tradeoffs
- The seeded pack keeps its legacy statuses; the register maps them (Completed + "Allowed…"
  → Accepted, else Pending review / Pending decision). Seeded rows' steps are held for the
  visit only; live rows persist.
- Attachments are kept in memory only; a reloaded draft says so.
- Advance/Postpone are offered when the case has a next hearing on record; the date
  pre-fill uses it only if it is still ahead (every fixture hearing is past, so nothing
  pre-fills today).
- The Objection form (grounds + document) is a placeholder: the PRD leaves its fields
  unspecified.

## Verification and open work
- `npm run test:app` 1074/1074; `npm run verify:ui` all gates pass (lint warnings
  pre-existing only). Checked on `feature/application-lifecycle` worktree, DS pin
  `e0cadea6b9d4`.
- Browser (:3002): raise → save draft → sign (advocate) → pay later → litigant pays →
  Pending review + temporary id → hidden from other side → bench clerk sees only Dismiss →
  magistrate onboards on a date with objections → other side files objection (Submitted,
  linked) → magistrate accepts and signs → Accepted with linked order on the citizen record.
- Not render-checked: dark mode, dismissal path, set-a-date-once, move date, clerk signing
  block (all covered by unit tests).
- Not built: applications on the hearing screen (awaiting owner decision); expiry window;
  party actions (witness, PoA, edit litigant) filing as applications; Certified Copy without
  login; Warrant recall's fate; the three old fixture queues still show Approve/Reject.
