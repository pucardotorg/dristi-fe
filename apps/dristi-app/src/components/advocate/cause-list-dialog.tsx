"use client";

import * as React from "react";
import "./cause-list.css";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  ChevronDown,
  Download,
  ListFilter,
  Search,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import {
  causeListOn,
  courtLabelsOf,
  courtRooms,
  dayKeyOf,
  type CauseListRow,
  type HearingStatus,
} from "@/lib/advocate/home";
import { groupCauseList, searchCauseList, type CauseListGroupBy } from "@/lib/advocate/cause-list-groups";
import type { World } from "@/lib/tasks/selectors";
import { advHome, fillCopy } from "@/lib/advocate/content";
import type { Locale } from "@/lib/onboarding/content";
import { pick } from "@/lib/onboarding/content";
import { cn } from "@/lib/utils";
import { RefreshIcon, useRefreshPhase } from "@/components/advocate/refresh-button";

/** Court status as a chip: concluded reads "Completed", the live one "Ongoing",
 *  everything still to come "Listed" — one DS status tone each. */
function StatusChip({ status, locale }: { status: HearingStatus; locale: Locale }) {
  if (status === "concluded") {
    return <Badge variant="secondary">{pick(advHome.statusCompleted, locale)}</Badge>;
  }
  if (status === "now") {
    return <Badge variant="success">{pick(advHome.statusOngoing, locale)}</Badge>;
  }
  return <Badge variant="outline">{pick(advHome.statusListed, locale)}</Badge>;
}

/**
 * The court filter — multi-select, since "All courts" (no selection) is one of
 * the choices. Kept short with an internal scroll so it never runs past the
 * modal's edge, and a step smaller than a form control.
 */
function CourtMultiFilter({
  courts,
  selected,
  onChange,
  locale,
}: {
  courts: { court: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  locale: Locale;
}) {
  const labelOf = (c: string) =>
    courts.find((o) => o.court === c)?.label ?? c;
  const toggle = (c: string) =>
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-44 gap-1.5 text-caption">
          <ListFilter aria-hidden="true" className="text-muted-foreground" />
          {selected.length === 0 ? (
            <span className="flex-1 text-left">{pick(advHome.causeListAllCourts, locale)}</span>
          ) : (
            <span className="flex flex-1 items-center gap-1.5 truncate text-left">
              <span className="truncate">{labelOf(selected[0])}</span>
              {selected.length > 1 ? (
                <span className="shrink-0 text-muted-foreground">
                  {fillCopy(advHome.courtFilterMore, locale, {
                    n: String(selected.length - 1),
                  })}
                </span>
              ) : null}
            </span>
          )}
          <ChevronDown aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto text-caption">
        <DropdownMenuCheckboxItem
          checked={selected.length === 0}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onChange([])}
          className="text-caption"
        >
          {pick(advHome.causeListAllCourts, locale)}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {courts.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.court}
            checked={selected.includes(option.court)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(option.court)}
            className="text-caption"
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CauseListDialog({
  open,
  onOpenChange,
  world,
  now,
  day,
  onJoin,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  world: World;
  now: number;
  /** The day the board is on when the list opens; the modal pages from here. */
  day: string;
  onJoin: (row: CauseListRow) => void;
  locale: Locale;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Near full-screen, but inset from the edges so the board behind stays in
          view through the scrim — a workspace over the page, not a new page. The
          body mounts fresh each open, so its date and search start from the
          board's day without an effect resetting them. */}
      <DialogContent className="flex h-[calc(100svh-4rem)] w-full max-w-[calc(100%-4rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100%-4rem)]">
        <CauseListBody
          world={world}
          now={now}
          day={day}
          onJoin={onJoin}
          locale={locale}
        />
      </DialogContent>
    </Dialog>
  );
}

function CauseListBody({
  world,
  now,
  day,
  onJoin,
  locale,
}: {
  world: World;
  now: number;
  day: string;
  onJoin: (row: CauseListRow) => void;
  locale: Locale;
}) {
  const intl = locale === "ml" ? "ml-IN" : "en-IN";
  const [date, setDate] = React.useState(day);
  const [query, setQuery] = React.useState("");
  const [selectedCourts, setSelectedCourts] = React.useState<string[]>([]);
  const [groupBy, setGroupBy] = React.useState<CauseListGroupBy>("item");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const groupRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const jumpTarget = React.useRef<string | null>(null);
  const copy = (en: string, ml: string) => locale === "ml" ? ml : en;
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [refreshedAt, setRefreshedAt] = React.useState(() => Date.now());
  const { phase, trigger } = useRefreshPhase(() => setRefreshedAt(Date.now()));

  // The courts sitting that day, for the filter — no selection means all of them.
  const courtOptions = React.useMemo(() => {
    const rooms = courtRooms(world, date, now).filter((r) => r.count > 0);
    const labels = courtLabelsOf(rooms.map((r) => r.court));
    return rooms.map((r) => ({ court: r.court, label: labels.shortOf(r.court) }));
  }, [world, date, now]);
  // The scope line names the courts, but with many picked it names the first
  // two and counts the rest, so it stays one short line and never wraps the
  // header buttons below it.
  const courtsLabel = React.useMemo(() => {
    if (selectedCourts.length === 0) return null;
    const labels = selectedCourts.map(
      (c) => courtOptions.find((o) => o.court === c)?.label ?? c
    );
    if (labels.length <= 2) return labels.join(", ");
    return fillCopy(advHome.causeListScopeOthers, locale, {
      courts: labels.slice(0, 2).join(", "),
      n: String(labels.length - 2),
    });
  }, [selectedCourts, courtOptions, locale]);

  const rows = React.useMemo(
    () =>
      causeListOn(
        world,
        date,
        now,
        selectedCourts.length ? selectedCourts : undefined
      ),
    [world, date, now, selectedCourts]
  );
  const filtered = React.useMemo(() => searchCauseList(rows, query), [rows, query]);
  const mineCount = React.useMemo(() => filtered.filter((r) => r.mine).length, [filtered]);
  const groups = React.useMemo(() => groupCauseList(filtered, groupBy, intl).map(({ key, rows: items }) => ({
    key,
    label: groupBy === "item" ? `${pick(advHome.colItem, locale)} ${key}` :
      groupBy === "court" ? `${items[0].courtLabel} · ${locale === "ml" ? "കോടതി നമ്പർ" : "Court no."} ${items[0].courtNumber ?? "N/A"}` : key,
    rows: items,
  })), [filtered, groupBy, intl, locale]);
  const groupLabels = {
    item: pick(advHome.colItem, locale),
    court: pick(advHome.colCourt, locale),
    hearingType: pick(advHome.colHearingType, locale),
  };
  const reset = () => {
    setQuery("");
    setSelectedCourts([]);
    setGroupBy("item");
    setCollapsed(new Set());
  };
  const jump = (key: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      next.delete(key);
      return next;
    });
    jumpTarget.current = key;
  };
  const focusJumpTarget = (event: Event) => {
    if (jumpTarget.current === null) return;
    event.preventDefault();
    const target = groupRefs.current.get(jumpTarget.current);
    target?.scrollIntoView({ block: "start", behavior: "instant" });
    target?.focus({ preventScroll: true });
    jumpTarget.current = null;
  };

  const dateLabel = new Intl.DateTimeFormat(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
  const dateShort = new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
  const refreshedLabel = new Intl.DateTimeFormat(intl, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(refreshedAt));

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-hairline px-6 pt-6 pb-4">
        {/* Right padding clears the dialog's own close button in the corner. */}
        <div className="flex flex-wrap items-start justify-between gap-4 pr-12">
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="text-title-s font-semibold">
              {pick(advHome.causeListTitle, locale)}
            </DialogTitle>
            <DialogDescription className="text-body-compact text-muted-foreground">
              {courtsLabel
                ? fillCopy(advHome.causeListScopeCourt, locale, { court: courtsLabel })
                : pick(advHome.causeListScope, locale)}{" "}
              · {dateLabel}
            </DialogDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarDays aria-hidden="true" />
                  {dateShort}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(`${date}T12:00:00`)}
                  onSelect={(next) => {
                    if (!next) return;
                    setPickerOpen(false);
                    setDate(dayKeyOf(next));
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => setRefreshedAt(Date.now())}>
              <Download aria-hidden="true" />
              {pick(advHome.causeListDownload, locale)}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <CourtMultiFilter
              courts={courtOptions}
              selected={selectedCourts}
              onChange={setSelectedCourts}
              locale={locale}
            />
            <label htmlFor="cause-list-search" className="text-caption text-muted-foreground">{copy("Search", "തിരയുക")}</label>
            <div className="relative min-w-56 flex-1 sm:max-w-96">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="cause-list-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={pick(advHome.causeListSearch, locale)}
                className="pl-8"
                aria-label={pick(advHome.causeListSearch, locale)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowDownWideNarrow aria-hidden="true" />
                  {copy("Sort by", "ക്രമീകരണം")}: {groupLabels[groupBy]}
                  <ChevronDown aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuRadioGroup value={groupBy} onValueChange={(value) => {
                  setGroupBy(value as typeof groupBy);
                  setCollapsed(new Set());
                }}>
                  {(["item", "court", "hearingType"] as const).map((value) => (
                    <DropdownMenuRadioItem key={value} value={value}>
                      {groupLabels[value]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={!query && !selectedCourts.length && groupBy === "item" && !collapsed.size}
            >
              {pick(advHome.causeListReset, locale)}
            </Button>
          </div>
          {/* A refresh button to the left of the stamp, running the three-beat
              gesture; the stamp updates when it lands. */}
          <button
            type="button"
            onClick={trigger}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-caption text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <RefreshIcon phase={phase} className="size-3.5" />
            {/* Underlined so the stamp reads as the button it is. */}
            <span className="underline underline-offset-2">
              {fillCopy(advHome.causeListRefreshed, locale, { time: refreshedLabel })}
            </span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4 [&>[data-slot=table-container]]:overflow-visible">
        {filtered.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-4 py-12 text-center">
            <Search aria-hidden="true" className="size-8 text-muted-foreground" />
            <div className="flex flex-col gap-2">
              <h3 className="text-title-s font-semibold">
                {query.trim() ? copy("No matching hearings", "പൊരുത്തപ്പെടുന്ന ഹിയറിംഗുകളില്ല") : pick(advHome.causeListEmpty, locale)}
              </h3>
              <p className="text-body-compact text-muted-foreground">
                {copy("Try a case name, number, advocate or court, or clear your filters.", "കേസിന്റെ പേര്, നമ്പർ, അഭിഭാഷകൻ അല്ലെങ്കിൽ കോടതി തിരയുക, അല്ലെങ്കിൽ ഫിൽട്ടറുകൾ നീക്കുക.")}
              </p>
            </div>
            {(query || selectedCourts.length > 0) && (
              <Button variant="outline" onClick={reset}>{copy("Clear search and filters", "തിരയലും ഫിൽട്ടറുകളും നീക്കുക")}</Button>
            )}
          </div>
        ) : (
          <Table className="w-full min-w-5xl table-fixed border-separate border-spacing-0 text-body-compact">
            <TableHeader>
              <TableRow className={TABLE_HEAD_ROW}>
                <TableHead className={cn(TABLE_HEAD, "w-16 text-right")}>{pick(advHome.colItem, locale)}</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-1/5")}>{pick(advHome.colCase, locale)}</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-32")}>{pick(advHome.colCourt, locale)}</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-20 whitespace-normal")}>{copy("Court no.", "കോടതി നമ്പർ")}</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-1/6")}>{pick(advHome.colAdvocates, locale)}</TableHead>
                <TableHead className={TABLE_HEAD}>{pick(advHome.colCaseNumber, locale)}</TableHead>
                <TableHead className={TABLE_HEAD}>{pick(advHome.colHearingType, locale)}</TableHead>
                <TableHead className={cn(TABLE_HEAD, "w-56")}>{pick(advHome.colStatus, locale)}<span className="sr-only"> / {copy("Actions", "പ്രവർത്തനങ്ങൾ")}</span></TableHead>
              </TableRow>
            </TableHeader>
            {groups.map((group) => (
              <TableBody key={group.key} className={tableBodyClass({ hover: false })}>
                <TableRow className={tableRowClass({ hover: false })}>
                  <td colSpan={8} className="sticky top-0 z-10 bg-background px-0 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1 bg-hairline" />
                      <div className="flex max-w-full items-center rounded-full border border-hairline bg-card shadow-raised">
                        <Button
                          ref={(node) => { if (node) groupRefs.current.set(group.key, node); else groupRefs.current.delete(group.key); }}
                          variant="ghost" size="sm" className="max-w-full rounded-full"
                          aria-expanded={!collapsed.has(group.key)}
                          onClick={() => setCollapsed((previous) => {
                            const next = new Set(previous);
                            if (next.has(group.key)) next.delete(group.key); else next.add(group.key);
                            return next;
                          })}
                        >
                          <ChevronDown aria-hidden="true" className={cn("shrink-0", collapsed.has(group.key) && "-rotate-90")} />
                          <span className="truncate" title={group.label}>{group.label}</span>
                          <span className="tabular-nums text-muted-foreground">({group.rows.length})</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={copy(`Jump to another ${groupLabels[groupBy].toLowerCase()} group`, "മറ്റൊരു ഗ്രൂപ്പിലേക്ക് പോകുക")}>
                              <ChevronDown aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="max-h-72 w-64" onCloseAutoFocus={focusJumpTarget}>
                            <DropdownMenuLabel>{copy("Jump to…", "ഇതിലേക്ക് പോകുക…")}</DropdownMenuLabel>
                            {groups.map((target) => (
                              <DropdownMenuItem key={target.key} onSelect={() => jump(target.key)}>
                                <span className="min-w-0 flex-1 truncate">{target.label}</span>
                                <span className="tabular-nums text-muted-foreground">{target.rows.length}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <span className="h-px flex-1 bg-hairline" />
                    </div>
                  </td>
                </TableRow>
                {!collapsed.has(group.key) && group.rows.map((row) => (
                  <CauseRow key={row.id} row={row} locale={locale} onJoin={onJoin} />
                ))}
              </TableBody>
            ))}
          </Table>
        )}
      </div>

      <div aria-live="polite" className="flex items-center gap-2 border-t border-hairline px-6 py-3 text-caption text-muted-foreground">
        <span aria-hidden="true" className="size-2 rounded-full bg-border" />
        {fillCopy(advHome.causeListMineCount, locale, { n: String(mineCount) })}
      </div>
    </>
  );
}

/** Own matters use the resting warm-neutral fill; the label preserves meaning
 * without relying on colour. Only this row's right-hand content makes room. */
function CauseRow({ row, locale, onJoin }: { row: CauseListRow; locale: Locale; onJoin: (row: CauseListRow) => void }) {
  const cell = cn(TABLE_CELL, "align-middle");
  const joinLabel = locale === "ml" ? "ഹിയറിംഗിൽ ചേരുക" : "Join hearing";
  return (
    // A matter the advocate is on wears a soft warm-neutral fill so it reads out of
    // the whole docket without the pull of a brand colour. Unlike the plate's own
    // states this one is flat (no rounded band) and persistent, marking "yours"
    // across the run rather than the one row under the pointer, so it is a reviewed
    // exception to the plate rather than a new shared state: it goes on the cells
    // via `[&>td]:` (overriding the shared `bg-card`) and never on the <tr>.
    // table-plate-allow
    <TableRow className={cn(tableRowClass({ hover: false }), "cause-row", row.mine && "[&>td]:bg-accent")}>
      <td className={cn(cell, "text-right tabular-nums text-muted-foreground")}>{row.item}</td>
      <td className={cn(cell, "font-medium text-foreground")}>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate" title={row.parties}>{row.parties}</span>
          {row.mine ? (
            <span className="inline-flex w-fit items-center gap-1.5 text-caption font-normal text-muted-foreground">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-border" />
              {pick(advHome.causeListMine, locale)}
            </span>
          ) : null}
        </span>
      </td>
      <td className={cell}><span className="block truncate" title={row.courtLabel}>{row.courtLabel}</span></td>
      <td className={cn(cell, "tabular-nums")}>{row.courtNumber ?? "N/A"}</td>
      <td className={cn(cell, "text-muted-foreground")}><span className="block truncate" title={row.advocates}>{row.advocates}</span></td>
      <td className={cn(cell, "text-muted-foreground")}><span className="block truncate" title={row.caseNumber}>{row.caseNumber}</span></td>
      <td className={cell}><span className="block truncate" title={row.hearingType}>{row.hearingType}</span></td>
      <td className={cell}>
        <div className="flex min-w-0 items-center justify-end">
          <span className="min-w-0 flex-1 overflow-hidden"><StatusChip status={row.status} locale={locale} /></span>
          {row.status !== "concluded" && (
            <span className="cause-join">
              <span className="cause-join-clip">
                <span className="cause-join-inner block">
                  <Button variant="outline" size="sm" onClick={() => onJoin(row)} aria-label={`${joinLabel}: ${row.parties}, ${row.courtLabel}, ${row.courtNumber ?? "N/A"}`}>
                    <Video aria-hidden="true" />{joinLabel}
                  </Button>
                </span>
              </span>
            </span>
          )}
        </div>
      </td>
    </TableRow>
  );
}
