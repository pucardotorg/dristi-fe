"use client";

import * as React from "react";
import {
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
} from "@/components/chrome/table-plate";
import {
  causeListOn,
  courtLabelsOf,
  courtRooms,
  dayKeyOf,
  type CauseListRow,
  type HearingStatus,
} from "@/lib/advocate/home";
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
  onJoin: () => void;
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
  onJoin: () => void;
  locale: Locale;
}) {
  const intl = locale === "ml" ? "ml-IN" : "en-IN";
  const [date, setDate] = React.useState(day);
  const [query, setQuery] = React.useState("");
  const [selectedCourts, setSelectedCourts] = React.useState<string[]>([]);
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
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.parties.toLowerCase().includes(q) ||
        r.caseNumber.toLowerCase().includes(q) ||
        r.advocates.toLowerCase().includes(q)
    );
  }, [rows, query]);
  const mineCount = React.useMemo(() => rows.filter((r) => r.mine).length, [rows]);

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
            <Button size="sm" onClick={onJoin}>
              <Video aria-hidden="true" />
              {pick(advHome.causeListJoin, locale)}
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
            <div className="relative min-w-56 flex-1 sm:max-w-96">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={pick(advHome.causeListSearch, locale)}
                className="pl-8"
                aria-label={pick(advHome.causeListSearch, locale)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery("")}
              disabled={query.length === 0}
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

      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-body-compact text-muted-foreground">
            {pick(advHome.causeListEmpty, locale)}
          </p>
        ) : (
          <Table className="w-full border-separate border-spacing-0 text-body-compact">
            <TableHeader>
              <TableRow className={TABLE_HEAD_ROW}>
                <TableHead className={cn(TABLE_HEAD, "w-14 text-right")}>
                  {pick(advHome.colItem, locale)}
                </TableHead>
                <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
                  {pick(advHome.colCase, locale)}
                </TableHead>
                <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                  {pick(advHome.colCourt, locale)}
                </TableHead>
                <TableHead className={cn(TABLE_HEAD, "min-w-48 whitespace-normal")}>
                  {pick(advHome.colAdvocates, locale)}
                </TableHead>
                <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                  {pick(advHome.colCaseNumber, locale)}
                </TableHead>
                <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                  {pick(advHome.colHearingType, locale)}
                </TableHead>
                <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                  {pick(advHome.colStatus, locale)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={tableBodyClass({ hover: false })}>
              {/* The header is a well, not a band welded to the rows; an inert gap
                  row keeps its rounded bottom off the first matter. */}
              <tr aria-hidden="true">
                <td colSpan={7} className="h-2 p-0" />
              </tr>
              {filtered.map((row) => (
                <CauseRow key={row.id} row={row} locale={locale} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="border-t border-hairline px-6 py-3 text-caption text-muted-foreground">
        {fillCopy(advHome.causeListMineCount, locale, { n: String(mineCount) })}
      </div>
    </>
  );
}

/** One matter. A matter the advocate is on carries a brand tint across its cells
 *  and a "You appear" flag, so hers read out of the whole docket at a glance. */
function CauseRow({ row, locale }: { row: CauseListRow; locale: Locale }) {
  const cell = cn(TABLE_CELL, "align-top", row.mine && "bg-brand-muted");
  return (
    <TableRow className="hover:bg-transparent">
      <td className={cn(cell, "text-right tabular-nums text-muted-foreground")}>
        {row.item}
      </td>
      <td className={cn(cell, "font-medium text-foreground")}>
        <span className="flex flex-col gap-1">
          <span className="text-balance">{row.parties}</span>
          {row.mine ? (
            // A light brand chip, the same teal family as the ongoing slot — the
            // row's own tint already carries the emphasis, so the tag stays soft
            // rather than a heavy solid pill.
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-accent bg-card px-2 py-0.5 text-caption font-medium text-brand-muted-foreground">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
              {pick(advHome.causeListMine, locale)}
            </span>
          ) : null}
        </span>
      </td>
      <td className={cell}>{row.courtLabel}</td>
      <td className={cn(cell, "text-muted-foreground")}>{row.advocates}</td>
      <td className={cn(cell, "font-mono whitespace-nowrap text-muted-foreground")}>
        {row.caseNumber}
      </td>
      <td className={cell}>{row.hearingType}</td>
      <td className={cn(cell, "whitespace-nowrap")}>
        <StatusChip status={row.status} locale={locale} />
      </td>
    </TableRow>
  );
}
