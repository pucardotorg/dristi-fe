# Settings (advocate and litigant)

Status: **implemented** (2026-09-30, uncommitted). Templates still open.
Branch: `feature/settings-redesign` from `origin/design`, worktree `dristi-settings`.
Owner brief: redesign Settings from one page into several, grounded in processes the
product already has, built for desktop, tablets (iPad Air, iPad Pro, both orientations)
and phones at the same time, on the pinned DS only.

## Owner decisions (2026-09-30)

1. Settings is split into pages with a side menu.
2. Templates: first agreed as advocate drafting templates, now reopened (decision 9).
3. A Bar registration number can be **corrected**. The correction goes back to the
   scrutiny officer and the advocate keeps working on the current number until approved.
4. "Raising flags" means a **report a problem** form with a placeholder confirmation.
5. Assumptions confirmed: text size scales the whole page; a new mobile number needs
   only an OTP to that number; a litigant name change needs no approval.
6. Appearance becomes **Display and accessibility**: theme, text size, more time before
   sign-out. Reduce motion, higher contrast and sidebar colour are out.
7. **Language**: English stays first in the top-bar toggle; the user picks the second
   from 10 languages. A few pages are translated for the demo.
8. Sign-in and security adds **signed-in devices** and **sign out everywhere**.
   Notifications, signing and courts I practise in are out.
9. Templates are **open** (see Templates below).

## What exists today (design @ 28520d9)

- One centred page (`components/home/profile-settings.tsx`): name, profile switcher,
  address form that saves nothing, ID upload, request an advocate profile, and a
  "Set password" button with no handler. It does not follow `page-frame.ts`
  (it centres itself; every other rail page starts at the gutter).
- Processes a settings change must reuse:
  - OTP: `components/registration/masked-otp.tsx` (sign-in and registration).
  - Password rules: `lib/registration/password-policy.ts` (REG-40 to 44).
  - Advocate approval: scrutiny officer queue, `approve-registrations`, which already
    models an `edited` request (REG-18).
  - Not approved: `components/registration/resubmission-flow.tsx` (officer message,
    fields filled in, same application ID).
  - ID: `components/home/add-id-dialog.tsx`.
  - Address: `components/cases/structured-address.tsx` (the 7-field grammar).
  - Help content: `components/onboarding/help-panel.tsx`, contact line in
    `lib/onboarding/content.ts`.
  - Theme: next-themes is set up with no user switch. The sidebar colour picker
    (`components/shell/rail-theme.tsx`) is marked as waiting for a home in Settings.
    Language lives in `components/shell/locale.tsx` and is not remembered.

## Pages

Routes: `/settings/<page>`. `/settings` is the menu on phones and upright tablets, and
opens Profile on desktop. Grouped menu:

| Group | Page | Who |
|---|---|---|
| Account | Profile | Everyone |
| Account | Advocate details | Advocate profile |
| Account | Account type | Everyone |
| Security | Sign-in and security | Everyone |
| Preferences | Display and accessibility | Everyone |
| Preferences | Language | Everyone |
| Help | Help and support | Everyone |

### Profile

- **Account** card, read only: account ID, registered on, profiles on this account,
  application ID (advocates). The one place for identifiers.
- **Personal details**: name, mobile (links to Sign-in and security, where it changes),
  email, official ID, address.

### Advocate details

- Name (read only, from the Bar Council register), Bar registration number,
  Bar Council ID card, advocate ID, chamber address, verification status.

### Account type

- Profiles on this account, with status: Litigant (active), Advocate (none, pending,
  approved, not approved). Switch profile.
- Litigant with no advocate profile: **Request an advocate profile** (Bar number and
  Bar Council ID, to the scrutiny officer).
- Not approved: the officer's message and **Resubmit request**. This is the "appeal".
- Clerk and PoA holder profiles are out of scope (registration roles only today).

### Sign-in and security

- Mobile number (also the sign-in ID). Password: set if none, change if set.
- Signed-in devices: this device first, then others (device, browser, place, last
  active), each with Sign out. **Sign out of all other devices** asks to confirm.
  Demo data; nothing tracks devices today.

### Display and accessibility

- Theme: Light, Dark, System. Text size: Default, Large, Larger (scales the page root).
- More time before sign-out: extends the session timeout (DS `session-timeout`),
  WCAG 2.2.1, timing adjustable.
- Applies instantly, no Save button.

### Language

- English is always the first half of the top-bar toggle. The user picks the second:
  Hindi, Malayalam, Tamil, Telugu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Odia.
  Each is shown in its own script with a sample line. The toggle then reads
  English | chosen language. The default second language comes from the state
  (Kerala: Malayalam).
- Copy today is English + Malayalam pairs (`lib/onboarding/content.ts`, `pick`). It
  becomes a per-language map with English fallback, so an untranslated line shows English.
- Demo translations: the Settings pages and the litigant Home in Hindi, Tamil and
  Bengali (plus the existing Malayalam), to see how layouts hold up in other scripts.
- Out: right-to-left scripts (Urdu), which need a direction pass of their own.

### Templates (open)

The lead designer asked for "order templates": Word-style documents with placeholders.
In the product, orders are made only on the court side, and the magistrate already has
order templates in Configurations (27 types, short Business of the Day lines). The
catalogue says the magistrate separately defines the longer full order text; nothing
holds that today. Advocate filings are generated from forms, so they have no free
document to template. Waiting on the lead's answer before this is placed.

### Help and support

- FAQs (reused from onboarding help), contact (court, e-Sewa Kendra, legal aid 15100),
  **Report a problem**: what went wrong (select), case (optional), details, screenshot
  (optional). Submitting shows a reference number. Nothing is sent (placeholder).

## What can change, and how

Every change reuses an existing process. Nothing new is invented.

| Field | Change? | How |
|---|---|---|
| Account ID, registered on, application ID | No | Shown only |
| Name (litigant) | Yes | Plain edit. Note: cases already filed keep the name they were filed with |
| Name (advocate) | No | From the Bar Council register |
| Mobile | Yes | New number, then OTP to it (`MaskedOtp`). Old number stops working for sign-in |
| Email | Yes | Plain edit, same validation as registration. Nothing verifies email today |
| Password | Yes | Set: new password against REG-40 to 44. Change: current password, or OTP to mobile if forgotten, then new |
| Official ID | Replace | Same upload form as today |
| Address, chamber address | Yes | `StructuredAddress`, no approval |
| Bar registration number | Correction | New number and a fresh Bar Council ID go to the scrutiny officer as an `edited` request. Current number stays active until approved. Banner shows pending |
| Bar Council ID card | Replace | Goes with a correction, or alone, same approval |
| Advocate profile | Request | Existing elevation flow, to the scrutiny officer |
| Not approved request | Resubmit | Existing resubmission flow |

Demo: approval lands after a few seconds, as today. A demo parameter shows the pending
and not approved states. Demo actions reset on refresh. **Display and language
choices are remembered** (they are preferences, not demo actions).

## Layout by device

Grounded in the product's own touch rules (`components/cases/cases-layout.ts`,
`register-layout.ts`, `components/chrome/flow-window.ts`, `PageBackButton`).

| | Desktop, landscape tablets | Phones, upright tablets |
|---|---|---|
| Condition | `md:pointer-fine:` or `md:landscape:` (the Cases table rule) | Base classes |
| Menu | Left column beside the page, current page marked | `/settings` is the menu: outlined rows with a chevron, grouped |
| Page | Right column, white Cards on the page ground | Full width, `PageBackButton` back to the menu |
| Values | `DescriptionList` rows, action at the row end | Label over value, action under or at the end, 40px targets |
| Change flows (mobile, password, Bar correction, ID, advocate request, report a problem) | Dialog in the join/share grammar | Flow window (`FlowDialogContent`), phone Back works |
| Confirmations (discard, delete template) | Alert dialog | Bottom sheet |

Rules kept: page starts at the gutter (`PAGE_GUTTER`, `PAGE_TITLE`), dialogs never
change the page under them, anything that opens something shows an edge and a chevron,
toasts clear the bottom bar, no em dashes in copy, tokens and DS primitives only, custom
components only where the DS has no part.

## Build order

1. Page frame, menu, routes, phone index.
2. Profile, Advocate details, Account type (moves today's content).
3. Sign-in and security (OTP, password, devices).
4. Display and accessibility.
5. Language: multi-language copy map, top-bar toggle, demo translations.
6. Help and support.
7. Templates, once placed.
8. Check every page on desktop, iPad Air and iPad Pro both ways, and a 412px phone,
   at the top and scrolled, in English and in each demo language.

## Build notes (2026-09-30)

Implemented on `feature/settings-redesign`, not committed. Checked on the worktree's own
server (port 3400) at 1280 and 1440 desktop, 1180x820 and 1024x1366 with a mouse,
820x1180 upright, and a 412px phone; light and dark; English, Tamil, Hindi, Bengali.
Gates (`npm run verify:ui`) and 1058 app tests pass. Review was not independent.

Where it lives: routes `app/(portal)/settings/{layout,page,[page]/page}.tsx`; screens in
`components/settings/`; data and copy in `lib/settings/`; languages in
`lib/i18n/languages.ts`; text size in `components/shell/text-size.tsx`.

Deviations from the spec, and why:
- Menu beside the page from `lg`, not `md` (`settings-layout.ts`). At 820px with the
  rail open the page was left about 300px wide.
- Theme choices are icon cards, not light/dark previews. The DS scopes only dark
  tokens (`.dark`), so a light preview would render dark in dark mode.
- Dialog bodies are English and Malayalam; the pages are also in Hindi, Tamil and
  Bengali. Other lines fall back to English (`pick`), as every screen now does.
- Indic web fonts (DS ACCESSIBILITY 13) not added: nothing in the app uses
  `next/font` yet, and a build-time Google fetch could break the static build.
  Scripts render with system fonts, as Malayalam already did.

Language plumbing: `Locale` widened to 11 codes; `Copy` is English plus optional
others; `pick` and `fill` fall back to English. Every language toggle (top bar,
sign-in, bond signing, onboarding) shows English plus the chosen language
(`useLanguagePair`). Language and display choices are remembered; demo edits reset on
refresh.

Demo: `?advocate=pending` or `?advocate=not-approved` on any Settings page shows those
states. A request made in the visit is approved after 4 seconds.

Left over: `components/home/profile-settings.tsx` is no longer used (still listed in
`app/ds-audit/audit-data.ts`). The top bar, rail and breadcrumb are English only.
