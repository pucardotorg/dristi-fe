"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  InfoIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { ChromeAlertDialogContent } from "@/components/chrome/app-chrome";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initials } from "@/components/access/access-list";
import { useAccess } from "@/components/access/access-state";
import { RemoveAdvocateDialog } from "@/components/cases/remove-advocate-dialog";
import { pick, type Locale } from "@/lib/onboarding/content";
import {
  ACCESS_CASES,
  fillCopy,
  listCopy,
  peopleCopy,
  shareCopy,
  viewerHoldsVakalat,
  type AccessGrant,
  type AccessPerson,
} from "@/lib/access/content";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The People page — the renamed "Team case access" destination.
 *
 * A FLAT list of everyone on my side (name, number, case count). Opening a
 * person slides in an INLINE side panel that pushes the list left — no
 * overlay, nothing behind it disabled, so clicking another person just
 * repoints the panel. It never covers the top bar on desktop because it lives
 * in the page flow; on phones it becomes a focused full-screen surface.
 *
 * The panel splits their cases in two: "Access through Vakalatnama" (open only —
 * removal is a court application) and "Administrative access" (checkbox
 * select, red remove, invited-by attribution). Bulk removal therefore only
 * ever touches the administrative group. When a person has both kinds, the two
 * sit behind tabs; with only one kind, that section fills the panel on its own.
 */

type PeopleSort = "name-asc" | "name-desc" | "cases-desc" | "cases-asc";
type PanelTab = "vakalat" | "admin";

/**
 * Underline (line) tab — label + count as muted tabular text, the same presentation the
 * Pending Tasks views use. Text seated low (`pb-2.5`) with `-mb-px` + `after:bottom-0` so
 * the active underline lands ON the band's rule rather than a line below it.
 */
const PANEL_TAB_CLASS =
  "-mb-px flex-none items-end gap-1.5 rounded-none px-0 pb-2.5 text-body-compact group-data-horizontal/tabs:h-10 group-data-horizontal/tabs:after:bottom-0 group-data-[variant=line]/tabs-list:data-active:after:bg-brand-accent";

function caseById(caseId: string) {
  return ACCESS_CASES.find((c) => c.id === caseId);
}

/**
 * The list carries the designation as its own column, so the name drops the
 * "Adv." salutation — saying it twice made the rows read as a bar roll
 * rather than a team list. The raw name keeps the prefix (it is how counsel
 * are addressed everywhere else); only this page's display strips it.
 */
function displayName(person: AccessPerson): string {
  return person.name.replace(/^Adv\.\s*/, "");
}

/**
 * A person is an advocate by enrolment (barId) or by holding an advocate
 * grant; clerks are clerks on every case they touch. Someone with neither —
 * a pending invite known only by number — gets no designation rather than a
 * guessed one.
 */
function personDesignation(person: AccessPerson, locale: Locale): string | null {
  if (
    person.barId ||
    person.grants.some((g) => g.role === "vakalat" || g.role === "junior")
  ) {
    return pick(peopleCopy.designationAdvocate, locale);
  }
  if (person.grants.some((g) => g.role === "clerk")) {
    return pick(peopleCopy.designationClerk, locale);
  }
  return null;
}

/**
 * One template shared by the header band and every row, so the columns can
 * never drift: identity, designation (hidden on phones — it folds into the
 * caption line there), case count, and a trailing chevron that says the
 * rows open. Proportional tracks rather than fixed right-edge widths, so on
 * a wide list the designation and count sit around the middle instead of
 * hugging the chevron with dead space after the name (Aug 31 round).
 */
const PEOPLE_GRID =
  "grid-cols-[minmax(0,1fr)_6rem_1.5rem] sm:grid-cols-[minmax(0,3fr)_2fr_2fr_1.5rem]";

function PersonListRow({
  person,
  locale,
  active,
  onOpen,
}: {
  person: AccessPerson;
  locale: Locale;
  active: boolean;
  onOpen: () => void;
}) {
  const count = person.grants.length;
  const designation = personDesignation(person, locale);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active || undefined}
      className={cn(
        "grid w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        PEOPLE_GRID,
        active && "bg-muted",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="text-caption font-medium">
            {person.pending ? "#" : initials(person.name)}
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body-compact font-medium">
            {displayName(person)}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {person.pending ? (
              pick(listCopy.invitedPending, locale)
            ) : (
              <span className="tabular-nums">{person.phone}</span>
            )}
            {/* Phones have no designation column — it rides the caption line. */}
            {designation ? (
              <span className="sm:hidden">
                <span aria-hidden> · </span>
                {designation}
              </span>
            ) : null}
          </span>
        </span>
      </span>
      <span className="hidden truncate text-body-compact text-muted-foreground sm:block">
        {designation ?? "—"}
      </span>
      <span className="text-body-compact text-muted-foreground tabular-nums">
        {count === 1
          ? pick(peopleCopy.caseCountOne, locale)
          : fillCopy(peopleCopy.caseCount, locale, { count: String(count) })}
      </span>
      <ChevronRightIcon
        className="size-4 justify-self-end text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

/** One case entry — spacious: title, number, joined date, attribution. */
function CaseEntry({
  grant,
  person,
  locale,
  selectable,
  checked,
  onCheck,
  onOpenCase,
  onRemove,
  removeLocked = false,
  removalPending = false,
}: {
  grant: AccessGrant;
  person: AccessPerson;
  locale: Locale;
  selectable: boolean;
  checked: boolean;
  onCheck?: (value: boolean) => void;
  onOpenCase: () => void;
  /** Absent where a remove affordance makes no sense at all; on
      office-access cases pass `removeLocked` instead so the button stays
      visible but disabled — an absent button reads as a bug. */
  onRemove?: () => void;
  /** Office access: Remove renders disabled with the why in a tooltip. */
  removeLocked?: boolean;
  /** A vakalat removal already requested — the row waits, Remove retires. */
  removalPending?: boolean;
}) {
  const grantCase = caseById(grant.caseId);
  if (!grantCase) return null;
  const isVakalat = grant.role === "vakalat";
  const isPending = person.pending || grant.status === "invited";
  const grantInviter = grant.addedBy ?? person.addedBy;
  const invitedBy =
    grantInviter === "self"
      ? pick(peopleCopy.invitedByYou, locale)
      : grantInviter
        ? fillCopy(peopleCopy.invitedBy, locale, { name: grantInviter })
        : null;

  return (
    <div className="@container/case-entry flex items-start gap-3 py-4">
      {selectable ? (
        <Checkbox
          checked={checked}
          data-preserve-admin-selection={selectable || undefined}
          aria-label={fillCopy(peopleCopy.selectCaseAria, locale, {
            caseNumber: grantCase.caseNumber,
          })}
          className="mt-0.5"
          onCheckedChange={(value) => onCheck?.(value === true)}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2 @xs/case-entry:flex-row @xs/case-entry:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-compact font-medium text-pretty">{grantCase.title}</p>
            {isPending ? (
              <Badge variant="warning">{pick(shareCopy.statusInvited, locale)}</Badge>
            ) : null}
          </div>
          <Identifier
            value={grantCase.caseNumber}
            label="case number"
            className="self-start text-caption text-muted-foreground"
          />
          <p className="text-caption text-muted-foreground">
            {fillCopy(
              isPending ? peopleCopy.invitedOn : peopleCopy.joinedOn,
              locale,
              { date: grant.since },
            )}
            {!isVakalat && invitedBy ? <> · {invitedBy}</> : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-1 @xs/case-entry:self-center @xs/case-entry:pt-0">
          {removalPending ? (
            <span className="px-2 text-caption text-muted-foreground">
              {pick(peopleCopy.removalPending, locale)}
            </span>
          ) : removeLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Disabled buttons swallow pointer events — the span
                    carries the hover (LockedRemove's own trick). */}
                <span tabIndex={0} className="inline-flex">
                  <Button type="button" variant="ghost" size="sm" disabled>
                    {pick(peopleCopy.removeFromCase, locale)}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-pretty">
                {pick(peopleCopy.officeLockedTooltip, locale)}
              </TooltipContent>
            </Tooltip>
          ) : onRemove ? (
            <Button type="button" variant="destructive-ghost" size="sm" onClick={onRemove}>
              {pick(peopleCopy.removeFromCase, locale)}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onOpenCase}>
            {pick(peopleCopy.openCase, locale)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PeoplePage({
  locale,
  onOpenCase,
}: {
  locale: Locale;
  /** Jump to a case's file (the wireframe) — wired by the parent screen. */
  onOpenCase: (caseId: string) => void;
}) {
  const { people, removeGrant, removeAll } = useAccess();
  const [query, setQuery] = React.useState("");
  const [caseQuery, setCaseQuery] = React.useState("");
  const [peopleSort, setPeopleSort] = React.useState<PeopleSort>("name-asc");
  const [openPersonId, setOpenPersonId] = React.useState<string | null>(null);
  const [panelTab, setPanelTab] = React.useState<PanelTab>("vakalat");
  const [checkedCases, setCheckedCases] = React.useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [removedNote, setRemovedNote] = React.useState<string | null>(null);
  /* Removing from the vakalatnama is the Parties tab's court-application
     flow, entered from here too (owner, Sept 3). The dialog rides the open
     person; a sent request retires that row's Remove for the session —
     the real record of a pending request is the tasks service. */
  const [removeVakalatCaseId, setRemoveVakalatCaseId] = React.useState<
    string | null
  >(null);
  const [pendingRemovals, setPendingRemovals] = React.useState<
    ReadonlySet<string>
  >(new Set());

  // People with no grants left have no access anywhere — they drop off the page.
  const active = people.filter((person) => person.grants.length > 0);
  const q = query.trim().toLowerCase();
  const searched = q
    ? active.filter(
        (person) =>
          person.name.toLowerCase().includes(q) || person.phone.replace(/\D/g, "").includes(q),
      )
    : active;
  const matches = [...searched].sort((a, b) => {
    const aName = a.name.replace(/^Adv\.\s*/, "");
    const bName = b.name.replace(/^Adv\.\s*/, "");
    if (peopleSort === "name-desc") return bName.localeCompare(aName);
    if (peopleSort === "cases-desc") return b.grants.length - a.grants.length;
    if (peopleSort === "cases-asc") return a.grants.length - b.grants.length;
    return aName.localeCompare(bName);
  });

  const openPerson = people.find((person) => person.id === openPersonId) ?? null;
  const vakalatGrants = openPerson ? openPerson.grants.filter((g) => g.role === "vakalat") : [];
  const staffGrants = openPerson ? openPerson.grants.filter((g) => g.role !== "vakalat") : [];
  const caseQ = caseQuery.trim().toLowerCase();
  const matchesCaseQuery = (grant: AccessGrant) => {
    if (!caseQ) return true;
    const grantCase = caseById(grant.caseId);
    return Boolean(
      grantCase &&
        (grantCase.title.toLowerCase().includes(caseQ) ||
          grantCase.caseNumber.toLowerCase().includes(caseQ)),
    );
  };
  const visibleVakalatGrants = vakalatGrants.filter(matchesCaseQuery);
  const visibleStaffGrants = staffGrants.filter(matchesCaseQuery);
  // Removal is a vakalatnama holder's act, case by case. Office-access
  // cases drop out of every removal surface here: no per-row Remove, no
  // checkbox, and the bulk action counts only the cases the viewer may
  // actually touch (owner, Sept 3).
  const removableStaffGrants = staffGrants.filter((g) =>
    viewerHoldsVakalat(g.caseId),
  );
  // Bulk removal only ever touches the administrative group — nama grants are
  // court applications, so "all cases" honestly means "all administrative ones".
  const removingAll = checkedCases.length === 0;
  const removeCount = checkedCases.length || removableStaffGrants.length;

  function openPanel(personId: string) {
    setOpenPersonId(personId);
    // Open on the tab the person actually has — Vakalatnama when present, since it is
    // the primary form of access; a person with only administrative access lands there.
    const person = people.find((entry) => entry.id === personId);
    const hasVakalat = person?.grants.some((g) => g.role === "vakalat");
    setPanelTab(hasVakalat ? "vakalat" : "admin");
    setCheckedCases([]);
    setCaseQuery("");
    setRemovedNote(null);
  }

  function closePanel() {
    setOpenPersonId(null);
    setCheckedCases([]);
    setCaseQuery("");
    setRemovedNote(null);
  }

  function confirmBulkRemove() {
    if (!openPerson) return;
    const targets = removingAll
      ? removableStaffGrants.map((g) => g.caseId)
      : checkedCases;
    if (
      removingAll &&
      vakalatGrants.length === 0 &&
      removableStaffGrants.length === staffGrants.length
    ) {
      removeAll(openPerson.id);
      setRemovedNote(fillCopy(peopleCopy.removedAllNote, locale, { name: openPerson.name }));
    } else {
      targets.forEach((caseId) => removeGrant(openPerson.id, caseId));
      const numbers = targets
        .map((caseId) => caseById(caseId)?.caseNumber)
        .filter(Boolean)
        .join(", ");
      setRemovedNote(
        fillCopy(peopleCopy.removedNote, locale, { name: openPerson.name, case: numbers }),
      );
    }
    setCheckedCases([]);
  }

  function renderVakalatnamaSection() {
    if (!openPerson || vakalatGrants.length === 0) return null;

    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
          {visibleVakalatGrants.length ? (
            <div className="flex flex-col divide-y divide-hairline">
              {visibleVakalatGrants.map((grant) => (
                <CaseEntry
                  key={grant.caseId}
                  grant={grant}
                  person={openPerson}
                  locale={locale}
                  selectable={false}
                  checked={false}
                  onOpenCase={() => {
                    closePanel();
                    onOpenCase(grant.caseId);
                  }}
                  /* Remove here is the Parties tab's removal application,
                     one case at a time — never bulk — and only where the
                     viewer holds that case's vakalatnama themself. On
                     office-access cases it renders locked, with the why. */
                  onRemove={
                    viewerHoldsVakalat(grant.caseId)
                      ? () => setRemoveVakalatCaseId(grant.caseId)
                      : undefined
                  }
                  removeLocked={!viewerHoldsVakalat(grant.caseId)}
                  removalPending={pendingRemovals.has(
                    `${openPerson.id}:${grant.caseId}`,
                  )}
                />
              ))}
            </div>
          ) : (
            <p className="py-4 text-caption text-muted-foreground">
              {pick(peopleCopy.noCaseMatches, locale)}
            </p>
          )}
        </div>
      </section>
    );
  }

  function renderAdministrativeSection() {
    if (!openPerson || staffGrants.length === 0) return null;

    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
          {visibleStaffGrants.length ? (
            <div className="flex flex-col divide-y divide-hairline">
              {visibleStaffGrants.map((grant) => {
                const canRemove = viewerHoldsVakalat(grant.caseId);
                return (
                  <CaseEntry
                    key={grant.caseId}
                    grant={grant}
                    person={openPerson}
                    locale={locale}
                    selectable={canRemove && removableStaffGrants.length > 1}
                    checked={checkedCases.includes(grant.caseId)}
                    onCheck={(value) =>
                      setCheckedCases((current) =>
                        value
                          ? [...current, grant.caseId]
                          : current.filter((id) => id !== grant.caseId),
                      )
                    }
                    onOpenCase={() => {
                      closePanel();
                      onOpenCase(grant.caseId);
                    }}
                    removeLocked={!canRemove}
                    onRemove={
                      canRemove
                        ? () => {
                            removeGrant(openPerson.id, grant.caseId);
                            setCheckedCases((current) =>
                              current.filter((id) => id !== grant.caseId),
                            );
                            setRemovedNote(
                              fillCopy(peopleCopy.removedNote, locale, {
                                name: openPerson.name,
                                case: caseById(grant.caseId)?.caseNumber ?? "",
                              }),
                            );
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-caption text-muted-foreground">
              {pick(peopleCopy.noCaseMatches, locale)}
            </p>
          )}
        </div>
        {removableStaffGrants.length > 0 ? (
          <div className="shrink-0 px-1 pt-2 pb-1">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              data-preserve-admin-selection
              onClick={() => setConfirmRemove(true)}
            >
              {checkedCases.length
                ? pick(peopleCopy.removeFromThese, locale)
                : pick(peopleCopy.removeFromAll, locale)}
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  // The panel's two access kinds render as line tabs — one tab when the person has only
  // one kind, two when they have both. Building them from a list keeps the single- and
  // both-section cases visually identical (same underline chrome, same muted count),
  // rather than the old split where a lone section wore a different bold-heading header.
  const panelSections = [
    vakalatGrants.length && {
      key: "vakalat" as PanelTab,
      label: pick(peopleCopy.vakalatCasesHeading, locale),
      count: vakalatGrants.length,
      tooltipLabel: pick(peopleCopy.vakalatTooltipLabel, locale),
      tooltip: pick(listCopy.vakalatLocked, locale),
      body: renderVakalatnamaSection(),
    },
    staffGrants.length && {
      key: "admin" as PanelTab,
      label: pick(peopleCopy.staffCasesHeading, locale),
      count: staffGrants.length,
      tooltipLabel: pick(peopleCopy.staffTooltipLabel, locale),
      tooltip: pick(peopleCopy.staffTooltip, locale),
      body: renderAdministrativeSection(),
    },
  ].filter(Boolean) as Array<{
    key: PanelTab;
    label: string;
    count: number;
    tooltipLabel: string;
    tooltip: string;
    body: React.ReactNode;
  }>;
  // Removing every grant of the open tab's kind can leave it pointing at a tab that no
  // longer exists — fall back to whichever section remains.
  const activeTab = panelSections.some((s) => s.key === panelTab)
    ? panelTab
    : panelSections[0]?.key;
  const activeSection = panelSections.find((s) => s.key === activeTab);

  return (
    // The portal shell is page-scroll (its column is `min-h-svh`, growing with content).
    // The People panel scrolls its lists internally instead, so it needs a real height to
    // bound against — the viewport minus the sticky `h-14` top bar. (The old draggable
    // layout got this height from react-resizable-panels' JS measurement; tabs don't, so
    // the bound is stated here.) On phones the panel is `fixed inset-0`, so this only
    // shapes the desktop split.
    <div className="flex h-[calc(100svh---spacing(14))] min-h-0 w-full flex-1 items-stretch overflow-hidden">
      <ResizablePanelGroup
        key={openPerson ? "detail-open" : "detail-closed"}
        orientation="horizontal"
      >
      <ResizablePanel
        defaultSize={openPerson ? "48%" : "100%"}
        minSize={openPerson ? "35%" : "100%"}
      >
      {/* ------------------------------------------------------ list column */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden px-4 py-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-title text-balance font-semibold sm:text-title-l">
            {pick(peopleCopy.title, locale)}
          </h1>
          <p className="text-body-compact text-pretty text-muted-foreground">
            {pick(peopleCopy.subtitle, locale)}
          </p>
        </header>

        {active.length ? (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex w-full flex-col gap-2 sm:min-w-0 sm:flex-1">
                <Label htmlFor="people-search">{pick(peopleCopy.searchLabel, locale)}</Label>
                <div className="relative">
                  <SearchIcon
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="people-search"
                    type="search"
                    className="pl-9"
                    placeholder={pick(peopleCopy.searchPlaceholder, locale)}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-48">
                <Label htmlFor="people-sort">{pick(peopleCopy.sortLabel, locale)}</Label>
                <Select value={peopleSort} onValueChange={(value) => setPeopleSort(value as PeopleSort)}>
                  <SelectTrigger id="people-sort" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">{pick(peopleCopy.sortNameAsc, locale)}</SelectItem>
                    <SelectItem value="name-desc">{pick(peopleCopy.sortNameDesc, locale)}</SelectItem>
                    <SelectItem value="cases-desc">{pick(peopleCopy.sortCasesDesc, locale)}</SelectItem>
                    <SelectItem value="cases-asc">{pick(peopleCopy.sortCasesAsc, locale)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {matches.length === 0 ? (
              <p className="py-8 text-center text-body-compact text-muted-foreground">
                {pick(peopleCopy.noMatches, locale)}
              </p>
            ) : (
              <>
                {/* Column band — same grid template and gutter as the rows,
                    so the labels sit exactly over their columns. */}
                <div
                  aria-hidden
                  className={cn(
                    "grid items-center gap-3 border-b border-hairline px-2 pb-2",
                    PEOPLE_GRID,
                  )}
                >
                  <span className="text-caption font-medium text-muted-foreground">
                    {pick(peopleCopy.columnPerson, locale)}
                  </span>
                  <span className="hidden text-caption font-medium text-muted-foreground sm:block">
                    {pick(peopleCopy.columnDesignation, locale)}
                  </span>
                  <span className="text-caption font-medium text-muted-foreground">
                    {pick(peopleCopy.columnCases, locale)}
                  </span>
                  <span />
                </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col divide-y divide-hairline">
                  {matches.map((person) => (
                    <PersonListRow
                      key={person.id}
                      person={person}
                      locale={locale}
                      active={person.id === openPersonId}
                      onOpen={() => openPanel(person.id)}
                    />
                  ))}
                </div>
              </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UsersIcon className="size-5" aria-hidden />
            </span>
            <p className="text-body-compact font-semibold">{pick(peopleCopy.emptyTitle, locale)}</p>
            <p className="max-w-sm text-caption text-pretty text-muted-foreground">
              {pick(peopleCopy.emptyBody, locale)}
            </p>
          </div>
        )}
      </main>
      </ResizablePanel>

      {/* -------------------------------------------------- inline side panel */}
      {openPerson ? (
        <>
          <ResizableHandle withHandle className="hidden md:flex" />
          <ResizablePanel defaultSize="52%" minSize="30%" maxSize="65%">
          <aside
            className="@container/panel fixed inset-0 z-40 flex h-full w-full shrink-0 flex-col bg-surface md:static md:z-auto"
            aria-label={openPerson.name}
            onPointerDown={(event) => {
              if (!checkedCases.length) return;
              const target = event.target as HTMLElement;
              if (!target.closest("[data-preserve-admin-selection]")) setCheckedCases([]);
            }}
          >
            <div className="relative flex items-start gap-3 border-b border-hairline p-4">
              <Avatar className="size-11 shrink-0">
                <AvatarFallback className="bg-brand-muted text-body-compact font-medium text-brand-muted-foreground">
                  {openPerson.pending ? "#" : initials(openPerson.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pr-10">
                <h2 className="truncate text-body font-semibold">
                  {displayName(openPerson)}
                </h2>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-caption text-muted-foreground tabular-nums">
                    {openPerson.pending ? pick(listCopy.invitedPending, locale) : openPerson.phone}
                  </p>
                  {openPerson.barId ? (
                    <p className="flex items-baseline gap-1.5 text-caption tabular-nums">
                      <span className="text-muted-foreground">
                        {pick(peopleCopy.barIdLabel, locale)}
                      </span>
                      <Identifier
                        value={openPerson.barId}
                        label="bar id"
                        className="font-medium"
                      />
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={pick(peopleCopy.closePanel, locale)}
                className="absolute top-3 right-3"
                onClick={closePanel}
              >
                <XIcon aria-hidden />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
              {removedNote ? (
                <p className="flex items-start gap-1.5 rounded-lg border border-success bg-success-muted px-3 py-2 text-body-compact font-medium text-success-muted-foreground">
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{removedNote}</span>
                </p>
              ) : null}

              <div className="flex shrink-0 flex-col gap-3 border-b border-hairline pb-4 @sm/panel:flex-row @sm/panel:items-center">
                <h3
                  id="case-access-heading"
                  className="min-w-0 flex-1 text-body-compact font-semibold"
                >
                  {pick(peopleCopy.detailCases, locale)}
                </h3>
                <div className="relative w-full @sm/panel:w-56">
                  <SearchIcon
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="case-access-search"
                    type="search"
                    aria-labelledby="case-access-heading"
                    className="h-9 pl-9"
                    placeholder={pick(peopleCopy.caseSearchPlaceholder, locale)}
                    value={caseQuery}
                    onChange={(event) => setCaseQuery(event.target.value)}
                  />
                </div>
              </div>

              {panelSections.length ? (
                // One line-tab per access kind — a single tab when the person has one
                // kind, two when both. The active tab's info button beside the list
                // explains that kind. (Removal still only ever touches the admin tab.)
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setPanelTab(value as PanelTab)}
                  className="min-h-0 flex-1 gap-4"
                >
                  <div
                    className="flex items-end justify-between gap-2 border-b border-hairline"
                    data-preserve-admin-selection
                  >
                    <TabsList
                      variant="line"
                      className="min-w-0 justify-start gap-6 overflow-x-auto p-0 pb-0 group-data-horizontal/tabs:h-auto"
                    >
                      {panelSections.map((section) => (
                        <TabsTrigger
                          key={section.key}
                          value={section.key}
                          className={PANEL_TAB_CLASS}
                        >
                          {section.label}
                          {/* The active tab's count picks up the brand tint so the pill
                              reads as part of the selected tab; inactive tabs stay neutral. */}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "tabular-nums",
                              section.key === activeTab &&
                                "bg-brand-muted text-brand-muted-foreground",
                            )}
                          >
                            {section.count}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {activeSection ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="mb-1 shrink-0"
                            aria-label={activeSection.tooltipLabel}
                          >
                            <InfoIcon aria-hidden />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64 text-pretty">
                          {activeSection.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                  {panelSections.map((section) => (
                    <TabsContent
                      key={section.key}
                      value={section.key}
                      className="min-h-0 flex flex-col"
                    >
                      {section.body}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : null}
            </div>
          </aside>
          </ResizablePanel>
        </>
      ) : null}
      </ResizablePanelGroup>

      {/* --------------------------------------------- bulk-remove confirm */}
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <ChromeAlertDialogContent>
          {openPerson ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {fillCopy(
                    removingAll ? peopleCopy.removeAllTitle : peopleCopy.removeTheseTitle,
                    locale,
                    { name: openPerson.name },
                  )}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {removeCount === 1
                    ? pick(peopleCopy.removeBodyOne, locale)
                    : fillCopy(peopleCopy.removeAllBody, locale, { count: String(removeCount) })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{pick(peopleCopy.removeAllCancel, locale)}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={confirmBulkRemove}>
                  {removingAll
                    ? pick(peopleCopy.removeAllConfirm, locale)
                    : pick(peopleCopy.removeFromThese, locale)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </ChromeAlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------- vakalat removal (court flow) */}
      {/* The Parties tab's own removal dialog, unchanged: grounds, then who
          approves (their consent or the magistrate), then sign. English like
          every application flow. */}
      {openPerson && removeVakalatCaseId ? (
        <RemoveAdvocateDialog
          open
          onOpenChange={(next) => {
            if (!next) setRemoveVakalatCaseId(null);
          }}
          advocateName={openPerson.name}
          partyName={
            caseById(removeVakalatCaseId)?.title.split(" vs ")[0] ??
            "the party"
          }
          caseRef={{
            title: caseById(removeVakalatCaseId)?.title ?? "",
            caseNumber: caseById(removeVakalatCaseId)?.caseNumber ?? "",
            court: caseById(removeVakalatCaseId)?.court ?? "",
          }}
          onRequested={() =>
            setPendingRemovals(
              (current) =>
                new Set([
                  ...current,
                  `${openPerson.id}:${removeVakalatCaseId}`,
                ]),
            )
          }
        />
      ) : null}
    </div>
  );
}
