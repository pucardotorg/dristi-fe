# Advocate home on phones
Updated: 2026-09-18
Status: implemented; final reference render verification pending

## Current outcome
The advocate home phone composition follows the owner's two iPhone reference screens supplied in this task. Desktop composition and the pinned design system remain in place. Changes are on `feature/advocate-home-redesign`.

## Decisions
- The owner's reference superseded the initial mobile cleanup: centred two-digit statistics, a seven-day strip with paging arrows, a separate calendar button on an inset rule, and two deliberate toolbar rows.
- Phone hearing cards show item, parties, case number, stage and court. A warning symbol identifies pending work. Tapping a card reveals a tray (a soft teal tint on an ongoing matter, beige otherwise) containing the cause-list jump, View case, and a pending-task action when work exists.
- The ongoing group is expanded initially and collapsible, identified by a pulsing live dot instead of the desktop status tag.
- View case uses the shared case content in a phone bottom drawer, matching the pending-task drawer. The desktop side peek remains.
- “Blocking task” is now “Pending task” in the advocate-home copy; underlying task eligibility and counts are unchanged.
- At widths below 360px, week arrows move to the calendar row to preserve 40px day targets. This is an implementation adaptation to the DS touch-target floor.

## Touch interaction patterns
| Pattern | Phone behaviour |
| --- | --- |
| Reveal hearing actions | Tap the card; explicit chevron and expanded state. Keyboard activation works without decorative motion. |
| Ongoing group | Tap the live-count heading to collapse or expand. |
| View case / pending tasks | Bottom drawer with close control and scrolling; desktop rail preference does not force the phone drawer open. |
| Cause list | Full-screen phone dialog, readable matter cards, search/filter/grouping, explicit Join action. |
| Secondary task action | Archive remains visible on touch; task title opens its action. |
| Feedback | Brief measured-height reveal, press states, existing refresh feedback, reduced-motion alternative. |
| Touchscreen tablet | Cause-list status and Join stay visible together without hover. |

## Verification and limitations
- Pinned DS verified: `e0cadea6b9d4`.
- `npm run lint`: passed, including token, typography, primitive sync, spacing and table-row gates; 13 existing warnings outside this change.
- Existing application suite: 693 tests passed (before the final reference composition; task/data algorithms unchanged).
- Independent source review caught and prompted fixes for touch status specificity, 320px calendar target overlap, and mobile changes to the saved desktop rail preference.
- Initial mobile pass was rendered at 375px: full-screen cause list, search/no-results recovery, hearing-to-cause-list jump and pending-task drawer checked. That evidence does not validate the later reference-based card layout.
- Final reference render checks are pending: localhost began refusing connections after the user's follow-up. The owner was asked to start the preview under the repository's server policy.
- `verify:ui` passes UI checks but is blocked by a pre-existing untracked `pick-ui-library` skill metadata error in `check:rails`.
- In-place TypeScript verification is blocked by stale generated `.next/types` references to a removed `/join-case/layout`. Build verification is being attempted in an isolated temporary snapshot; the owner's server/output is untouched.
- Physical-device gestures, screen-reader testing, both themes and 200% text zoom remain unverified.
- Existing hearing-link and download placeholders remain existing product limitations.

## 2026-09-18 — responsive polish
User-requested refinements implemented on the existing branch, preserving earlier uncommitted work:
- Calendar days flex evenly so Sunday fits at 375/390px. Pointer week paging travels directionally with eased motion; keyboard paging and reduced motion skip travel.
- Header rhythm is tighter: greeting-to-week and week-to-divider gaps reduced, with 16px removed below the calendar before statistics.
- Ongoing home cards use a single teal border without the raised shadow. Desktop ongoing matters now have individual cards and gaps; existing desktop actions remain.
- Live action trays are teal with neutral/white buttons; upcoming/concluded trays use the DS dark beige accent-strong fill. Actions wrap for Malayalam.
- Disclosures open and close over 280ms at all widths; action trays have a subtle settling bounce. Keyboard activation and reduced-motion preferences skip it.
- Mobile cause-list group headers share one containing block and overlap instead of pushing each other out. Live cards disclose Join hearing on tap; their item/party/case-number identity matches home while court, hearing type and advocates stay intact.
- Locate-hearing uses a docket/crosshair icon; opening the full cause list retains its original icon.
- Tablet verification found the existing expanded pending-task rail squeezing the board. Below 1280px it now overlays the board and retains its close control; desktop remains in flow.

Verification on the working tree:
- Pinned DS e0cadea6b9d4 confirmed; lint and token/typography/sync/spacing/table-row gates pass (13 existing warnings).
- 693 application tests pass. Application TypeScript with current dev-generated route types passes using a temporary config; default project tsc still encounters stale production-generated /join-case layout types. Generated build output was not deleted.
- verify:ui remains blocked only at check:rails by the pre-existing untracked pick-ui-library skill metadata.
- Browser checks: 375/390px calendar and trays, week forward/back, selected-hearing cause-list jump, mobile Join disclosure, group-header overlap (both headers measured at y=161, newer header on top), 1440px cards and concluded pointer/keyboard toggles, 820px tablet rail open/close, Malayalam expanded actions without page overflow.
- Independent source review completed; keyboard modality gap repaired. No merge, commit, or deployment performed.
- Physical-device, dark-theme, enlarged-text, and screen-reader verification remain pending. Motion timing was source-checked and exercised, not frame-by-frame recorded.
