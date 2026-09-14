import {
  CalendarDaysIcon,
  FileSearchIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  SettingsIcon,
  SignatureIcon,
  type LucideIcon,
} from "lucide-react";

import { APPROVE_COPY_QUEUE_COUNT } from "./approve-copy-application";
import { DELAY_CONDONATION_QUEUE_COUNT } from "./delay-condonation";
import { hearingById, TODAYS_HEARING_COUNT } from "./hearings";
import { OTHER_APPLICATIONS_QUEUE_COUNT } from "./other-applications";
import {
  APPROVE_REGISTRATIONS_TITLE,
  REGISTRATIONS_QUEUE_COUNT,
} from "./approve-registrations";
import { registerCaseById, REGISTER_QUEUE_COUNT } from "./register-cases";
import { findFiling, SCRUTINY_QUEUE_COUNT } from "./scrutiny/queue";
import { RESCHEDULING_QUEUE_COUNT } from "./rescheduling-request";
import { SCHEDULING_QUEUE_COUNT } from "./schedule";
import { A_DIARY_PENDING_COUNT } from "./sign-a-diary";
import { SIGN_BAIL_BOND_QUEUE_COUNT } from "./sign-bail-bonds";
import { SIGN_EVIDENCE_QUEUE_COUNT } from "./sign-evidence";
import { SIGN_FORM_QUEUE_COUNT } from "./sign-forms";
import { SIGN_ORDER_PENDING_COUNT } from "./sign-orders";
import { PROCESS_QUEUE_COUNT } from "./sign-process";
import { WITNESS_DEPOSITION_QUEUE_COUNT } from "./sign-witness-deposition";

/**
 * What the bench navigates between, as data.
 *
 * The shape of the court-side rail — two standalone links, then four groups of work —
 * is transcribed from the magistrate's reference screens. It is deliberately data and
 * not markup: the rail renders whatever is here, so a row's destination, its count or
 * its position is a change to this file rather than to a component.
 *
 * **Most of it is not wired yet.** The three Hearings rows, all four Actions rows —
 * Scrutinise submitted cases, Register cases, Approve copy application and Register
 * advocates — all three Review applications rows —
 * Rescheduling request, Delay condonation and Others — and all seven of the Sign rows —
 * Sign forms, Sign orders, Sign process, Sign bail bonds, Sign witness deposition, Sign
 * evidence and Sign A-Diary — have an `href`, and they point at the court-side routes
 * that exist. Every other row is a real, focusable control that says plainly it goes
 * nowhere — no stub routes, no hrefs that 404. Giving a row its destination later is the
 * one `href` line below.
 *
 * **The counts are demo data, with a few exceptions.** They are the reference's numbers,
 * kept so the rail can be judged at the widths it will really see (`1312` is the one that
 * decides how a row truncates). None of these labels describes an action this build
 * performs. The exceptions are the built rows whose counts are derived from the lists
 * they lead to (`lib/employee/hearings.ts`, `lib/employee/schedule.ts`,
 * `lib/employee/register-cases.ts`, `lib/employee/approve-copy-application.ts`,
 * `lib/employee/approve-registrations.ts`,
 * `lib/employee/rescheduling-request.ts`,
 * `lib/employee/delay-condonation.ts`, `lib/employee/other-applications.ts`,
 * `lib/employee/sign-forms.ts`, `lib/employee/sign-orders.ts`,
 * `lib/employee/sign-process.ts`, `lib/employee/sign-bail-bonds.ts`,
 * `lib/employee/sign-witness-deposition.ts`, `lib/employee/sign-evidence.ts`,
 * `lib/employee/sign-a-diary.ts`) — still demo data
 * underneath, but a real count of it, so the rail cannot claim a different number from
 * the screen it opens. Sign orders counts only what is still pending, because that
 * screen also holds the orders this bench has signed; Sign process counts only the three
 * stages of its line that still need an act, for the same reason.
 *
 * The vocabulary is the court's, taken from the reference — a copy application, a delay
 * condonation, the A-Diary. `docs/product/` does not yet define these for §138, so this
 * module names them and claims nothing more about what they do.
 */

export type CourtNavItem = {
  id: string;
  /** Sentence case, per the DS Laws — the reference's Title Case does not survive them. */
  label: string;
  /**
   * Where the row goes. Absent means the destination is not built: the row still renders
   * and still takes focus, and says so rather than pretending. Wiring it is this line.
   */
  href?: string;
  /**
   * A leading mark. Only the two standalone links above the groups carry one — they are
   * destinations in their own right, not items in a list of work.
   */
  icon?: LucideIcon;
  /** The destination lives outside DRISTI. Spoken, not marked — see `RowContents`. */
  external?: boolean;
  /** How much of this kind of work is waiting on the bench. Demo data; see above. */
  count?: number;
};

export type CourtNavGroup = {
  id: string;
  label: string;
  /**
   * The section's mark, beside its label in the disclosure header.
   *
   * An addition to the reference, which left the headers bare — asked for so the four
   * kinds of work are findable without reading.
   *
   * The rows inside a group stay unmarked: giving every row a glyph would flatten the
   * header back into the list. The two standalone links above the groups are the
   * exception — they are destinations, not work items.
   */
  icon: LucideIcon;
  items: CourtNavItem[];
};

/**
 * The rows that stand on their own, above the grouped work.
 *
 * Configurations is the one internal destination here — it opens the order-template
 * configuration screen for the magistrate. The other two leave the app.
 */
export const COURT_NAV_LINKS: CourtNavItem[] = [
  {
    id: "configurations",
    label: "Configurations",
    icon: SettingsIcon,
    href: "/employee/configurations",
  },
  {
    id: "dashboards",
    label: "Dashboards",
    icon: LayoutDashboardIcon,
    external: true,
  },
  {
    id: "all-cases",
    label: "All cases",
    icon: FolderIcon,
    external: true,
  },
];

/** The bench's work, in the four groups the reference names. The rail opens one. */
export const COURT_NAV_GROUPS: CourtNavGroup[] = [
  {
    id: "hearings",
    label: "Hearings",
    icon: CalendarDaysIcon,
    items: [
      /* The built destinations on the court side. Where a row carries a count it is one
         of the only numbers in this rail that is not demo data: it is the length of the
         list behind it, so the rail and the screen cannot disagree about the size of the
         work. Bulk reschedule carries none — what it opens on is a range the bench
         chooses, not a queue with a size. */
      {
        id: "todays-hearings",
        label: "Today’s hearings",
        href: "/employee/hearings",
        count: TODAYS_HEARING_COUNT,
      },
      {
        id: "schedule-hearing",
        label: "Schedule hearing",
        href: "/employee/hearings/schedule",
        count: SCHEDULING_QUEUE_COUNT,
      },
      {
        id: "bulk-reschedule",
        label: "Bulk reschedule hearings",
        href: "/employee/hearings/bulk-reschedule",
      },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    icon: ListChecksIcon,
    items: [
      /* Scrutiny comes first because it comes first: a complaint an advocate files
         lands here, and only what survives scrutiny reaches the register below it.
         The row's count is the registry's own half of the queue — see
         `lib/employee/scrutiny/queue.ts`. */
      {
        id: "scrutiny",
        label: "Scrutinise submitted cases",
        href: "/employee/scrutiny",
        count: SCRUTINY_QUEUE_COUNT,
      },
      {
        id: "register-cases",
        label: "Register cases",
        href: "/employee/register-cases",
        count: REGISTER_QUEUE_COUNT,
      },
      {
        id: "approve-copy",
        label: "Approve copy application",
        href: "/employee/approve-copy-application",
        count: APPROVE_COPY_QUEUE_COUNT,
      },
      /* Last in the group, and deliberately so. The three rows above it are a complaint's
         own progression — scrutiny, then the register, then what the office does for a
         party afterwards. An advocate's registration is not part of any case's life at
         all, so putting it at the head would break that reading for the three rows that
         share the group with it. */
      {
        id: "approve-registrations",
        label: APPROVE_REGISTRATIONS_TITLE,
        href: "/employee/approve-registrations",
        count: REGISTRATIONS_QUEUE_COUNT,
      },
    ],
  },
  {
    id: "review-applications",
    label: "Review applications",
    icon: FileSearchIcon,
    items: [
      {
        id: "rescheduling-request",
        label: "Rescheduling request",
        href: "/employee/rescheduling-request",
        count: RESCHEDULING_QUEUE_COUNT,
      },
      {
        id: "delay-condonation",
        label: "Delay condonation",
        href: "/employee/delay-condonation",
        count: DELAY_CONDONATION_QUEUE_COUNT,
      },
      {
        id: "other-applications",
        label: "Others",
        href: "/employee/other-applications",
        count: OTHER_APPLICATIONS_QUEUE_COUNT,
      },
    ],
  },
  {
    id: "sign",
    label: "Sign",
    icon: SignatureIcon,
    items: [
      {
        id: "sign-forms",
        label: "Sign forms",
        href: "/employee/sign-forms",
        count: SIGN_FORM_QUEUE_COUNT,
      },
      {
        id: "sign-orders",
        label: "Sign orders",
        href: "/employee/sign-orders",
        /* The pending rows, not the whole queue: the screen also holds the orders
           this bench has already signed, and a badge that counted those would send
           the magistrate to less work than the number promised. */
        count: SIGN_ORDER_PENDING_COUNT,
      },
      {
        id: "sign-process",
        label: "Sign process",
        href: "/employee/sign-process",
        /* The three stages of the line that still need an act, not its whole length:
           that screen also holds what has been sent and what has come back, and a badge
           counting those would send the bench to less work than the number promised. */
        count: PROCESS_QUEUE_COUNT,
      },
      {
        id: "sign-bail-bonds",
        label: "Sign bail bonds",
        href: "/employee/sign-bail-bonds",
        count: SIGN_BAIL_BOND_QUEUE_COUNT,
      },
      {
        id: "sign-deposition",
        label: "Sign witness deposition",
        href: "/employee/sign-witness-deposition",
        count: WITNESS_DEPOSITION_QUEUE_COUNT,
      },
      {
        id: "sign-evidence",
        label: "Sign evidence",
        href: "/employee/sign-evidence",
        count: SIGN_EVIDENCE_QUEUE_COUNT,
      },
      {
        // The A-Diary is the court's own register — a proper name, so it keeps its case.
        id: "sign-a-diary",
        label: "Sign A-Diary",
        href: "/employee/sign-a-diary",
        /* The whole unsigned register, every day of it, not just the day the screen
           opens on: a bench a day behind should be able to see that from the rail. The
           page's own count line is the one that agrees with this number. */
        count: A_DIARY_PENDING_COUNT,
      },
    ],
  },
];

/**
 * The court's home, and the head of every trail.
 *
 * It is not a rail row and cannot be one — the two rows that stand above the groups both
 * leave DRISTI — so the top bar's trail is the only path back to it anywhere in the
 * court's chrome. `app/employee/page.tsx` takes its heading from here rather than
 * spelling it again, so a crumb and the screen it leads to cannot end up calling one
 * destination two things.
 */
export const COURT_HOME = { href: "/employee", label: "Court home" } as const;

/**
 * The queues that own routes nested under them, and how each one tells a real child
 * from a sibling that merely looks like one.
 *
 * Today's hearings owns a listing's case overview (`/employee/hearings/<id>`) and the
 * order composer under it (`/employee/hearings/<id>/order`). Scrutiny owns one filing's
 * workbench (`/employee/scrutiny/<filing no.>`). Register cases owns one waiting
 * complaint's file (`/employee/register-cases/<id>`). None of them is a new destination
 * — each is its queue seen closer up.
 *
 * The nested segment is resolved against the queue's own data rather than matched as a
 * bare `[^/]+`, which would steal `/employee/hearings/schedule` and
 * `/employee/hearings/bulk-reschedule` — siblings, not children. Asking the queue is
 * the one test that cannot go stale on the next route: a sibling added tomorrow will
 * not be a listing id or a complaint id either, so it will not be captured either, and
 * nobody has to remember to add it to a list of exceptions here. An id no queue holds
 * gets no section, which is the truth about it and the same answer the screens behind
 * these routes give.
 *
 * It sits with the data rather than in the rail because the rail is no longer the only
 * thing that asks. The top bar's trail works out which section it is standing in from
 * the same answer, and two implementations of "which row is this page" would eventually
 * disagree — about these routes first, since they are the ones whose answer is not
 * simply their own href.
 */
/**
 * What the scrutiny queue calls the filing a path names, or nothing.
 *
 * A filing number carries slashes (`F/AHM/2026/00341`), so the segment is percent-encoded
 * in the path and has to be decoded before the queue is asked about it. Every other
 * nested segment is an id that survives a path intact, which is why this is the one row
 * below that names a function rather than asking its queue in a line.
 */
function scrutinyFilingNumber(segment: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // A malformed escape is not a filing number.
    return undefined;
  }
  return findFiling(decoded)?.no;
}

/**
 * `identify` answers both questions this file asks about a nested segment, and it has to
 * be one function to answer them consistently: *is this a real child of that queue* (the
 * rail's active row) and *what is the record called* (the last crumb). Two functions
 * would eventually disagree — a route the rail lit up and the trail could not name, or
 * the reverse.
 *
 * It returns the record's **identifier**, never its cause title. The title is the page's
 * own `h1`, several sizes down and a few pixels below; a crumb repeating it would restate
 * the loudest type on the screen in the quietest, which is the defect the old
 * omit-the-page convention was written to avoid. A case number does not restate anything.
 */
/*
 * **There is no `leaf` any more** (`register-cases` brief D25). Register cases was the
 * one queue with a step *past* the record: its complaint split in two, the glance at
 * `/<id>` and the whole file at `/<id>/file`, and a trail ending at the case number on
 * both could not say which of the two a magistrate was on. The file is now a disclosure
 * of the complaint's own route rather than a second page, so there is one view again and
 * the trail ends at the case number. The field's own comment said *a leaf is added when a
 * route earns one*; the route stopped earning it, so it goes rather than sitting here
 * with nobody to answer for it.
 */
const NESTED_ROUTES: {
  queue: string;
  pattern: RegExp;
  identify: (segment: string) => string | undefined;
}[] = [
  {
    queue: "/employee/hearings",
    pattern: /^\/employee\/hearings\/([^/]+)(?:\/order)?\/?$/,
    identify: (id) => hearingById(id)?.caseNumber,
  },
  {
    queue: "/employee/scrutiny",
    pattern: /^\/employee\/scrutiny\/([^/]+)\/?$/,
    identify: scrutinyFilingNumber,
  },
  {
    queue: "/employee/register-cases",
    pattern: /^\/employee\/register-cases\/([^/]+)\/?$/,
    identify: (id) => registerCaseById(id)?.caseNumber,
  },
];

/** What this path is a nested view *of*, when it is one. */
function nestedRecordOf(pathname: string, queue: string): string | undefined {
  const nested = NESTED_ROUTES.find((entry) => entry.queue === queue);
  if (!nested) return undefined;
  const segment = nested.pattern.exec(pathname);
  return segment ? nested.identify(segment[1]) : undefined;
}

export function isCourtNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return nestedRecordOf(pathname, href) !== undefined;
}

/** One step of the trail. */
export type CourtCrumb = {
  label: string;
  /**
   * Where the crumb goes. Absent on three kinds of step, all of which are a place you
   * cannot navigate to: the **current page**, which is where you already are; a
   * **section** when this page is one of its queues, because a section is a disclosure
   * in the rail and there is no page called "Sign"; and nothing else. Present on that
   * same section when the page is nested under a queue — the section then borrows the
   * queue's href, because that is the way back and a trail step that cannot be taken is
   * a crumb that does not work.
   */
  href?: string;
};

/**
 * Where this page sits, as the steps above it — and, last, the page itself.
 *
 * **Every trail ends with the current page** (owner, 2026-09-11), rendered through the
 * DS `BreadcrumbPage` slot: a non-link step, `aria-current="page"`, in full ink. The
 * convention until then was the opposite — the page was never a step — on the argument
 * that each queue screen opens with a heading that is its rail label word for word, so a
 * last crumb would restate the loudest type on the screen in the quietest. That argument
 * is still true of the *queue* screens and is now overruled for the whole area, because
 * it was never true of the nested ones and because a trail whose last step is somewhere
 * else is a trail that reads as unfinished. The nested pages are where it earns itself:
 * their heading is a cause title, and the crumb carries the case number instead — an
 * identifier no heading on the page repeats.
 *
 * It reads the rail's own data, so a section renamed in `COURT_NAV_GROUPS` is renamed in
 * the trail by the same edit. Nothing below names a section, a queue or a record.
 *
 * Three shapes come out of it:
 *
 * - `/employee` — still empty, and this is the one place the old argument survives
 *   intact. There is nothing above the court home, so a trail there could only be the
 *   single crumb `Court home`, restating the heading 40-odd pixels below it and offering
 *   no way anywhere. The bar keeps its fill and its seam and carries no trail, which is
 *   what chrome looks like at the origin.
 * - `/employee/sign-orders` — root, `Sign`, then **`Sign orders`** as the current page.
 *   The section between them is still text: it has no page of its own.
 * - `/employee/hearings/<id>`, `/employee/hearings/<id>/order`,
 *   `/employee/scrutiny/<filing no.>`, `/employee/register-cases/<id>` — root, the
 *   section, the queue, then the record: `ST/241/2026`, `F/AHM/2026/00341`,
 *   `CMP/1840/2025`. Both of the middle steps link back to the queue, which is where the
 *   record came from and, on a complaint's file, the whole of the way back — which is why
 *   that screen carries no back control of its own.
 *
 * A route this file does not know gets the root as a link and stops. That is the whole of
 * what can be said honestly about it, and it is still the way home — the current step is
 * omitted rather than guessed, because a crumb naming a page this file cannot identify
 * would be an invented label. The two standalone links are absent from every trail
 * because both leave DRISTI; a route nested under one of them would need its own step, on
 * the day one exists.
 */
export function courtTrail(pathname: string): CourtCrumb[] {
  if (pathname === COURT_HOME.href) return [];

  const home: CourtCrumb = { label: COURT_HOME.label, href: COURT_HOME.href };

  /* Standalone links above the groups — the ones with an href and no group. A standalone
     link that owns this path ends the trail with its own label as the current page. */
  for (const link of COURT_NAV_LINKS) {
    if (link.href && pathname.startsWith(link.href)) {
      return [home, { label: link.label }];
    }
  }

  for (const group of COURT_NAV_GROUPS) {
    for (const item of group.items) {
      if (!item.href || !isCourtNavActive(pathname, item.href)) continue;
      // Nested exactly when the path is not the row's own href — which is also when the
      // row is above this page rather than being it, and so becomes a link.
      const record = nestedRecordOf(pathname, item.href);
      if (record === undefined) {
        return [home, { label: group.label }, { label: item.label }];
      }
      return [
        home,
        { label: group.label, href: item.href },
        { label: item.label, href: item.href },
        { label: record },
      ];
    }
  }

  return [home];
}
