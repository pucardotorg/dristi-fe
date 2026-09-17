import { FEATURE_NAME as NOTICE_PROCESS_STATUS } from "./service";

/**
 * Every destination inside a case file — the ones the section strip offers,
 * and the ones reached only by link.
 *
 * This is a routing registry first and a nav list second, and the difference
 * matters because four things read it. `parseCaseSection` validates
 * `?section=` against it, `CaseSectionTabs` renders a panel per member, and
 * two callers take a label off it: the page's `SectionPending` fallback and
 * the case-history row labels. So deleting a member is not how a destination
 * leaves the strip. Delete one and `isCaseSection` starts rejecting the slug,
 * `parseCaseSection` silently falls back to Overview, and every link into
 * that screen lands on the wrong page with no error and nothing to debug.
 *
 * `UNLISTED_SECTIONS` is the removal instead: the member keeps its route and
 * its label, and only leaves the strip. Two today — Hearings, where product
 * took the tab out and kept the screen (still reached from Overview's "View
 * hearing details", the pending-task rows, the case-peek drawer, and four
 * case-history entries), and Complaint, dropped from the strip on the Aug 31
 * design-correction round (its content belongs to the Case File; links into
 * it keep working).
 *
 * Labels are sentence case per Laws except where the product names the tab in
 * title case (`Case File`, `Orders & Notifications`) or names the feature
 * outright. `Notice/Process Status` is the registry's own label, so it is
 * imported from the module that owns the string rather than copied — a second
 * copy is a second thing to keep in step.
 *
 * Slugs mirror their label rather than the code behind them (`case-file`,
 * `orders-and-notifications`), because a `?section=` value is a URL a person
 * reads and shares. `notice-process-status` follows that rule; the internal
 * "service of process" naming stays in the code, as `service.ts` sets out.
 */
export const CASE_SECTIONS = [
  { value: "overview", label: "Overview" },
  { value: "case-file", label: "Case File" },
  { value: "complaint", label: "Complaint" },
  /* Between the complaint and the orders it produced. Process is what issues
     once the court takes cognizance, and whether it reached the accused is
     the question that gates everything after it (journey.md §5-6). */
  { value: "notice-process-status", label: NOTICE_PROCESS_STATUS },
  { value: "orders-and-notifications", label: "Orders & Notifications" },
  { value: "applications", label: "Applications" },
  { value: "documents", label: "Documents" },
  { value: "parties", label: "Parties" },
  { value: "case-history", label: "Case History" },
  /* Routable, not in the strip — see UNLISTED_SECTIONS. Last, so the strip's
     own order is the unbroken run of members above this line. */
  { value: "hearings", label: "Hearings" },
] as const;

export type CaseSection = (typeof CASE_SECTIONS)[number]["value"];

/**
 * Sections that keep their route and their label but are not offered in the
 * strip. Named here rather than flagged on each entry, so the registry stays
 * one uniform list and the exception sits in the one place a reader looking
 * for it would look.
 */
const UNLISTED_SECTIONS: readonly CaseSection[] = ["hearings", "complaint"];

/** What the strip renders, in strip order. */
export const CASE_NAV_SECTIONS = CASE_SECTIONS.filter(
  (section) => !UNLISTED_SECTIONS.includes(section.value)
);

/**
 * Whether the strip offers this section. False means the reader arrived by
 * link and the strip has no tab to mark — `CaseSectionTabs` renders the row
 * as links rather than as a tablist there, because a tablist with nothing
 * selected is an invalid widget, not a cosmetic gap (WAI-ARIA 1.2, tabs).
 */
export function isNavSection(section: CaseSection): boolean {
  return !UNLISTED_SECTIONS.includes(section);
}

export const DEFAULT_CASE_SECTION: CaseSection = "overview";

export function isCaseSection(value: string): value is CaseSection {
  return CASE_SECTIONS.some((section) => section.value === value);
}

export function parseCaseSection(
  value: string | string[] | undefined
): CaseSection {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && isCaseSection(raw) ? raw : DEFAULT_CASE_SECTION;
}

export function caseSectionHref(
  caseId: string,
  section: CaseSection
): string {
  if (section === DEFAULT_CASE_SECTION) return `/cases/${caseId}`;
  return `/cases/${caseId}?section=${section}`;
}

/** Opens one hearing in the hearings pop-up, over Overview (OVW-08). */
export function hearingHref(caseId: string, hearingId: string): string {
  return `/cases/${caseId}?hearing=${hearingId}`;
}

/** Opens one application's record over the Applications tab (OVW-08). */
export function applicationHref(caseId: string, applicationId: string): string {
  return `${caseSectionHref(caseId, "applications")}&application=${applicationId}`;
}

/** Opens one order over the Orders tab (ORD-03). */
export function orderHref(caseId: string, orderId: string): string {
  return `${caseSectionHref(caseId, "orders-and-notifications")}&order=${orderId}`;
}

/**
 * Where a case detail link was reached from — today just the long pending
 * register, so the header doesn't repeat a badge the register already
 * established. Extend this union if another register gains the same need.
 */
export type CaseOrigin = "long-pending";

export function caseDetailHref(caseId: string, origin?: CaseOrigin): string {
  return origin ? `/cases/${caseId}?from=${origin}` : `/cases/${caseId}`;
}

export function parseCaseOrigin(
  value: string | string[] | undefined
): CaseOrigin | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "long-pending" ? raw : undefined;
}
