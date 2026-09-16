"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import {
  CalendarDaysIcon,
  CircleAlertIcon,
  FileSearchIcon,
} from "lucide-react";

import {
  HearingRecordActions,
  HearingRecordDialog,
  type HearingRecordOpen,
} from "@/components/cases/hearing-record-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  HEARINGS_PAGE_SIZE,
  HEARINGS_PAGE_SIZES,
  HEARING_TYPES,
  hearingDateParts,
  hearingPageWindow,
  hearingPartiesDisplay,
  hearingPartyNames,
  hearingResultCopy,
  hearingStatusLabel,
  hearingStatusVariant,
  hearingTimelineStatus,
  hearingTypeLabel,
  hearingsFile,
  isHearingHeld,
  isHearingTypeId,
  isHearingsPageSize,
  selectHearings,
  type Hearing,
  type HearingPerson,
  type HearingTypeId,
  type HearingsFile,
  type HearingsPageSize,
  type HearingsView,
} from "@/lib/cases/hearings";
import { formatCaseDate, type CaseRecord } from "@/lib/cases/types";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

const headClass =
  "h-10 border-b border-border px-4 py-3 text-caption font-medium text-muted-foreground";
const cellClass =
  "border-b border-border px-4 py-3 align-middle text-left text-body-compact";
const filterBarClass =
  "flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end";
/**
 * The filter region, pinned — but only inside the overlay.
 *
 * In the dialog the whole register is one scroll box, so the filter row rode
 * the list: scroll to the fifth hearing and Type, Clear filters and the
 * timeline/table switch were all a thousand pixels above the reader. That is
 * bad on its own, and it also broke the Type menu outright. The menu is
 * portalled to `<body>`, so the dialog's `overflow-hidden` cannot clip it,
 * while its anchor is inside the scroll box — scrolling 900px with the menu
 * open dragged the anchor to y=-721 and the menu followed to y=-675, leaving
 * an open, clickable listbox floating over the app chrome above the dialog.
 * Pinning the row is the fix at source: the anchor never leaves, so the menu
 * has nowhere to be dragged to.
 *
 * `contents` on the routed page because there the scroll box is the window,
 * and a row pinned to `top-0` there would stick under the 56px app header
 * rather than to anything meaningful. `display: contents` removes the wrapper
 * from layout entirely, so that page keeps the exact box tree it had.
 */
const filterRegionClass =
  "sticky top-0 z-20 flex flex-col gap-6 bg-popover";
const filterFieldClass = "min-w-0 w-full md:w-72";
const detailsButtonClass =
  "min-h-10 rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Set when the register is presented inside an overlay instead of on its own
 * page. Exactly two things change and nothing else does.
 *
 * The overlay is already the panel, so the Card and the heading it carries
 * stand down for the ones the dialog supplies — a Card inside a dialog is a
 * panel inside a panel, and a second "Hearings" heading under the dialog's
 * own is a duplicate name, not a subtitle.
 *
 * And the overlay owns the record, so a request to open one is reported up
 * rather than answered here. Answering it here is what would raise a dialog
 * from inside a dialog, which the DS forbids by name — see
 * `HearingRecordStep` for the rule and the alternative it prescribes.
 */
export type HearingsOverlay = {
  onOpenRecord: (open: HearingRecordOpen) => void;
};

/**
 * Chronological hearing record for one case. Timeline is the default;
 * the table is the denser alternate. Filters and page stay when the view
 * switches. Make filings in the header stays the teal action (Laws).
 */
export function CaseHearings({
  record,
  overlay,
}: {
  record: CaseRecord;
  overlay?: HearingsOverlay;
}) {
  const file = useMemo(() => {
    try {
      return hearingsFile(record);
    } catch {
      return null;
    }
  }, [record]);

  if (!file) return <HearingsError bare={overlay !== undefined} />;
  return <HearingsReady file={file} overlay={overlay} />;
}

export function HearingsLoading() {
  return (
    <HearingsPanel busy>
      <span className="sr-only" role="status">
        Loading hearings
      </span>
      <div className={filterBarClass}>
        <Skeleton className={cn("h-10 w-full", filterFieldClass)} />
        <Skeleton className="h-10 w-56 shrink-0 md:ml-auto" />
      </div>
      <Separator />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex w-16 shrink-0 flex-col gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-2 size-3 rounded-full" />
            <Skeleton className="h-32 min-w-0 flex-1 rounded-xl" />
          </div>
        ))}
      </div>
    </HearingsPanel>
  );
}

function HearingsError({ bare = false }: { bare?: boolean }) {
  return (
    <HearingsPanel bare={bare}>
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden />
        <AlertTitle className="text-body">
          Hearings could not be loaded
        </AlertTitle>
        <AlertDescription className="text-body">
          Refresh the page to try again.
        </AlertDescription>
      </Alert>
    </HearingsPanel>
  );
}

function HearingsReady({
  file,
  overlay,
}: {
  file: HearingsFile;
  overlay?: HearingsOverlay;
}) {
  const [typeId, setTypeId] = useState<HearingTypeId | null>(null);
  const [pageSize, setPageSize] = useState<HearingsPageSize>(HEARINGS_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<HearingsView>("timeline");
  const [recordOpen, setRecordOpen] = useState<HearingRecordOpen | null>(null);

  /* Presented in an overlay the record is the overlay's second step, so the
     request goes up and the dialog below never mounts. On the routed page
     nothing is above to take it, and the state and the dialog are both this
     component's own — which is what they have always been. */
  const bare = overlay !== undefined;
  const openRecord = overlay ? overlay.onOpenRecord : setRecordOpen;

  const typeOptions: Option[] = HEARING_TYPES.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  const selection = selectHearings({
    hearings: file.hearings,
    typeId,
    pageSize,
    page,
  });

  const filtered = typeId !== null;
  const peopleById = new Map(file.people.map((person) => [person.id, person]));
  const currentIndex = selection.all.findIndex(isHearingHeld);

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setTypeId(null);
    resetPage();
  }

  function pageLink(nextPage: number) {
    return {
      href: "#",
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setPage(nextPage);
      },
    };
  }

  const listProps = {
    file,
    rows: selection.rows,
    all: selection.all,
    peopleById,
    currentIndex,
    onOpenRecord: openRecord,
  };

  if (file.hearings.length === 0) {
    return (
      <HearingsPanel bare={bare}>
        <HearingsEmpty
          icon={CalendarDaysIcon}
          title="No hearings recorded"
          description="No hearings have been recorded for this case."
        />
      </HearingsPanel>
    );
  }

  return (
    <>
    <HearingsPanel bare={bare}>
      <div className={bare ? filterRegionClass : "contents"}>
        <div className={filterBarClass}>
          <Field className={filterFieldClass}>
            <FieldLabel
              htmlFor="hearings-type"
              className="text-body-compact font-medium"
            >
              Type
            </FieldLabel>
            <FilterCombobox
              id="hearings-type"
              items={typeOptions}
              value={typeId}
              placeholder="All types"
              empty="No type found."
              onChange={(next) => {
                setTypeId(next && isHearingTypeId(next) ? next : null);
                resetPage();
              }}
            />
          </Field>

          <Button
            type="button"
            variant="ghost"
            className="shrink-0"
            disabled={!filtered}
            onClick={clearFilters}
          >
            Clear filters
          </Button>

          <div className="shrink-0 md:ml-auto">
            <HearingsViewSwitch view={view} onViewChange={setView} />
          </div>
        </div>
        <Separator />
      </div>

      {selection.total === 0 ? (
        <HearingsEmpty
          icon={FileSearchIcon}
          title="No hearings matching filters"
          description="No hearings match the selected filters."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" aria-live="polite">
              {matchingCountLabel(selection.total, filtered)}
            </Badge>
          </div>

          {view === "timeline" ? (
            <HearingsTimeline {...listProps} />
          ) : (
            <div className="overflow-x-auto">
              <div className="hidden md:block">
                <HearingsTable {...listProps} />
              </div>
              <div className="p-4 md:hidden">
                <HearingsItemList {...listProps} />
              </div>
            </div>
          )}

          {view === "table" ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              {selection.pageCount > 1 ? (
                <p className="text-body-compact text-muted-foreground">
                  Showing {selection.from}–{selection.to}
                </p>
              ) : null}
              <HearingsPageSizeSelect
                value={pageSize}
                onChange={(size) => {
                  setPageSize(size);
                  resetPage();
                }}
              />
            </div>
            {selection.pageCount > 1 ? (
              <Pagination className="mx-0 w-auto justify-start md:justify-end">
                <PaginationContent>
                  {selection.page > 1 ? (
                    <PaginationItem>
                      <PaginationPrevious {...pageLink(selection.page - 1)} />
                    </PaginationItem>
                  ) : null}
                  {hearingPageWindow(selection.page, selection.pageCount).map(
                    (entry, index) => (
                      <PaginationItem key={`${entry}-${index}`}>
                        {entry === "gap" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            {...pageLink(entry)}
                            isActive={entry === selection.page}
                            aria-label={`Go to page ${entry}`}
                          >
                            {entry}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    )
                  )}
                  {selection.page < selection.pageCount ? (
                    <PaginationItem>
                      <PaginationNext {...pageLink(selection.page + 1)} />
                    </PaginationItem>
                  ) : null}
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>
          ) : null}
        </div>
      )}
    </HearingsPanel>
    {overlay ? null : (
      <HearingRecordDialog
        file={file}
        peopleById={peopleById}
        open={recordOpen}
        onOpenChange={setRecordOpen}
      />
    )}
    </>
  );
}

function matchingCountLabel(total: number, filtered: boolean): string {
  const noun = total === 1 ? "hearing" : "hearings";
  if (!filtered) return `${total} ${noun}`;
  return total === 1
    ? "1 hearing matches the filters"
    : `${total} hearings match the filters`;
}

function hearingDetailsLabel(hearing: Hearing): string {
  return `View details for ${hearingTypeLabel(hearing.type)} hearing on ${formatCaseDate(hearing.on)}`;
}

function HearingsViewSwitch({
  view,
  onViewChange,
}: {
  view: HearingsView;
  onViewChange: (view: HearingsView) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={view}
      onValueChange={(next) => {
        if (next === "timeline" || next === "table") onViewChange(next);
      }}
      className="shrink-0"
      aria-label="Hearings view"
    >
      <ToggleGroupItem value="timeline" className="h-10 px-3 text-body">
        Timeline
      </ToggleGroupItem>
      <ToggleGroupItem value="table" className="h-10 px-3 text-body">
        Table
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/**
 * One bounded hearings region. Hover fill is cancelled — this panel is
 * not the action (Laws; same resting Card as Overview). Timeline/Table
 * lives in the filter row, not the header — it is a view of the filtered
 * rows, not a page-level switch.
 */
function HearingsPanel({
  children,
  busy = false,
  bare = false,
}: {
  children: ReactNode;
  busy?: boolean;
  bare?: boolean;
}) {
  /* Bare is the overlay's panel, not a second one inside it — same gap the
     CardContent below sets, so the region reads identically either way. The
     dialog supplies the edge, the padding and the heading. */
  if (bare) {
    return (
      <section
        className="flex min-w-0 flex-col gap-6"
        aria-busy={busy || undefined}
      >
        {children}
      </section>
    );
  }

  return (
    <section className="min-w-0" aria-busy={busy || undefined}>
      <Card className="hover:bg-card">
        <CardHeader>
          <h2 className="text-title-s font-semibold">Hearings</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">{children}</CardContent>
      </Card>
    </section>
  );
}

function HearingsPageSizeSelect({
  value,
  onChange,
}: {
  value: HearingsPageSize;
  onChange: (pageSize: HearingsPageSize) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="hearings-page-size"
        className="text-body-compact font-normal text-muted-foreground"
      >
        Per page
      </Label>
      <Select
        value={String(value)}
        onValueChange={(next) => {
          const size = Number.parseInt(next, 10);
          if (isHearingsPageSize(size)) onChange(size);
        }}
      >
        <SelectTrigger id="hearings-page-size" className="text-body">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HEARINGS_PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterCombobox({
  id,
  items,
  value,
  placeholder,
  empty,
  onChange,
}: {
  id: string;
  items: Option[];
  value: string | null;
  placeholder: string;
  empty: string;
  onChange: (value: string | null) => void;
}) {
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(next) => onChange(next?.value ?? null)}
      isItemEqualToValue={(a, b) => a.value === b.value}
      autoComplete="off"
    >
      <ComboboxInput id={id} placeholder={placeholder} className="w-full" />
      {/* `pointer-events-auto` is what makes the menu clickable inside the
          hearings overlay, and it is not decoration. Radix's modal Dialog
          parks `pointer-events: none` on `<body>` and re-enables it on
          `DialogContent` alone, so the whole page behind the panel stops
          taking clicks. This menu is a Base UI portal that lands on `<body>`,
          outside `DialogContent` — so it inherits the `none` and every option
          goes transparent to hit-testing: `elementFromPoint` over "Admission"
          returns the dialog section behind it, and the filter looks dead
          while looking perfectly normal. Re-enabling it on the popup is legal
          CSS (a descendant may take pointer events back from an ancestor that
          gave them up) and is scoped to the menu, so the scrim keeps
          swallowing clicks everywhere else.

          Portalling into `DialogContent` instead would fix the inheritance
          but trade it for clipping: the panel is `overflow-hidden` and the
          register scrolls inside it, so the menu would be cut off by both.

          Upstream DS feedback: every Combobox raised inside a Dialog has
          this, not just this one. It belongs in the primitive.

          `ring-border` for the second reason the menu looked wrong — "cut
          out", like a hole punched in the panel rather than a card over it.
          `--popover`, `--card` and `--background` are all `#ffffff`, so this
          is a white surface on a white surface, and the DS holds them apart
          with `ring-foreground/10` (1px at 10%) plus `--shadow-overlay`,
          whose two layers are `0 4px 8px -2px` and `0 2px 4px -2px` — both
          offset downward with negative spread, so there is no shadow above
          the menu at all. Its top edge was resting on a 10% hairline and
          nothing else. Widening or insetting the menu does not help: a
          narrower white box on white still has the same invisible edge.
          `border` is the DS's panel-edge role, which is what this is.

          Same escalation: the ring opacity and the missing upward component
          in `--shadow-overlay` are token values, so the real fix is in the DS
          and would lift all 24 popup surfaces at once. This override is the
          stopgap for one menu. */}
      <ComboboxContent className="pointer-events-auto ring-border">
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        {/* The DS caps the list at 252px, which is not a multiple of the 44px
            item pitch: 6px of padding plus five whole rows is 226, so the
            sixth row is sliced at 26 of its 44 pixels — straight through the
            label. A row cut through its own text reads as a rendering fault
            rather than as "more below", which is what makes an 18-type filter
            look broken before anyone tries to scroll it.

            20rem lands the cut in the padding instead: the seven 44px rows
            that open the list total 308, so 6 + 308 leaves the eighth row
            showing a 6px sliver at the padding edge — a peek that says "more
            below" rather than a severed label. Rows are not all one height
            (labels that wrap run to 68px), so this is the common case made
            clean, not a guarantee; only the primitive can measure. The
            `--available-height` arm is the DS's own and is kept, so a short
            viewport still wins over the preferred height.

            Upstream DS feedback: the 252px cap in `ComboboxList` mis-aligns
            with the item pitch for every combobox in the app, not just this
            one. The durable fix is for the primitive to land on a row
            boundary; this override only rescues the hearings filter. */}
        <ComboboxList className="max-h-[min(--spacing(80),calc(var(--available-height)---spacing(9)))]">
          {(item: Option) => (
            <ComboboxItem key={item.value} value={item}>
              <span className="text-body">{item.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type HearingsListProps = {
  file: HearingsFile;
  rows: Hearing[];
  all: Hearing[];
  peopleById: Map<string, HearingPerson>;
  currentIndex: number;
  onOpenRecord: (open: HearingRecordOpen) => void;
};

function HearingsTimeline({
  file,
  all,
  peopleById,
  currentIndex,
  onOpenRecord,
}: HearingsListProps) {
  return (
    <ol className="flex flex-col" aria-label="Hearings, newest first">
      {all.map((hearing, index) => (
        <li
          key={hearing.id}
          className="flex gap-4 pb-8 last:pb-0"
        >
          <HearingRailDate hearing={hearing} />
          <HearingRailMark
            hearing={hearing}
            status={hearingTimelineStatus(hearing, index, currentIndex)}
            last={index === all.length - 1}
          />
          <div className="min-w-0 flex-1">
            <HearingTimelineCard
              file={file}
              hearing={hearing}
              peopleById={peopleById}
              onOpenRecord={onOpenRecord}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function HearingRailDate({ hearing }: { hearing: Hearing }) {
  const { day, monthYear } = hearingDateParts(hearing.on);
  return (
    <time
      dateTime={hearing.on}
      className="flex w-16 shrink-0 flex-col gap-2 pt-6 text-right"
    >
      <span className="text-title font-semibold tabular-nums leading-none">
        {day}
      </span>
      <span className="text-caption font-medium text-muted-foreground">
        {monthYear}
      </span>
    </time>
  );
}

function HearingRailMark({
  hearing,
  status,
  last,
}: {
  hearing: Hearing;
  status: "past" | "current" | "future";
  last: boolean;
}) {
  const held = isHearingHeld(hearing);
  const irregular =
    hearing.status === "abandoned" || hearing.status === "rescheduled";

  return (
    <div className="relative flex w-4 shrink-0 flex-col items-center" aria-hidden>
      <div
        className={cn(
          "relative z-10 mt-6 size-3 shrink-0 rounded-full border",
          held && irregular && "border-warning bg-warning",
          held && !irregular && "border-primary bg-primary",
          held && status === "current" && "ring-4 ring-halo",
          !held && "border-input bg-background"
        )}
      />
      {last ? null : (
        <div className="absolute top-8 bottom-0 w-px bg-primary" />
      )}
    </div>
  );
}

function HearingTimelineCard({
  file,
  hearing,
  peopleById,
  onOpenRecord,
}: {
  file: HearingsFile;
  hearing: Hearing;
  peopleById: Map<string, HearingPerson>;
  onOpenRecord: (open: HearingRecordOpen) => void;
}) {
  const result = hearingResultCopy(hearing, file);
  const present = hearingPartyNames(hearing, peopleById);
  const headingId = `${hearing.id}-title`;

  return (
    <Card
      className="cursor-pointer bg-muted hover:bg-muted"
      aria-labelledby={headingId}
      onClick={() => onOpenRecord({ hearing })}
    >
      <CardContent className="flex flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 id={headingId} className="min-w-0">
            <button
              type="button"
              className={cn(
                detailsButtonClass,
                "text-title-s font-semibold text-foreground"
              )}
              aria-label={hearingDetailsLabel(hearing)}
              onClick={(event) => {
                event.stopPropagation();
                onOpenRecord({ hearing });
              }}
            >
              {hearingTypeLabel(hearing.type)}
            </button>
          </h3>
          <HearingStatusBadge hearing={hearing} />
        </div>

        {hearing.migrated ? (
          <Banner variant="neutral">
            This hearing was migrated from a previous record. Some details are
            not available.
          </Banner>
        ) : null}

        {hearing.summary ? (
          <p className="text-body text-muted-foreground">{hearing.summary}</p>
        ) : null}

        {present ? (
          <p className="text-body">
            <span className="font-medium text-foreground">
              Present/associated
            </span>{" "}
            <span className="text-muted-foreground">{present}</span>
          </p>
        ) : hearing.migrated ? (
          <p className="text-body text-muted-foreground">
            Parties, advocates and witnesses were not migrated.
          </p>
        ) : null}

        {result ? (
          <div className="border-s-2 border-border ps-4">
            <p className="text-body">
              <span className="font-medium text-foreground">
                Result or next direction:{" "}
              </span>
              <span className="text-muted-foreground">{result}</span>
            </p>
          </div>
        ) : null}

        <HearingRecordActions
          file={file}
          hearing={hearing}
          onOpenRecord={onOpenRecord}
        />
      </CardContent>
    </Card>
  );
}

function HearingsTable({
  rows,
  peopleById,
  onOpenRecord,
}: HearingsListProps) {
  return (
    <Table>
      <TableCaption className="sr-only">Hearings</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(headClass, "whitespace-nowrap")}>
            Date
          </TableHead>
          <TableHead className={cn(headClass, "min-w-48")}>
            Hearing type
          </TableHead>
          <TableHead className={cn(headClass, "min-w-56")}>Parties</TableHead>
          <TableHead className={headClass}>Status</TableHead>
          <TableHead className={cn(headClass, "w-40")}>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((hearing) => (
          <TableRow
            key={hearing.id}
            className="cursor-pointer"
            onClick={() => onOpenRecord({ hearing })}
          >
            <TableCell className={cn(cellClass, "whitespace-nowrap")}>
              {formatCaseDate(hearing.on)}
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-48 whitespace-normal")}>
              {hearingTypeLabel(hearing.type)}
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-56 whitespace-normal")}>
              <HearingParties hearing={hearing} peopleById={peopleById} />
            </TableCell>
            <TableCell className={cn(cellClass, "min-w-40 whitespace-normal")}>
              <HearingStatusBadge hearing={hearing} />
            </TableCell>
            <TableCell className={cellClass}>
              <Button
                type="button"
                variant="outline"
                aria-label={hearingDetailsLabel(hearing)}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenRecord({ hearing });
                }}
              >
                View details
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HearingsItemList({
  rows,
  peopleById,
  onOpenRecord,
}: HearingsListProps) {
  return (
    <ItemGroup className="flex flex-col gap-3">
      {rows.map((hearing) => (
        <Item
          key={hearing.id}
          variant="outline"
          asChild
          className="h-full items-start gap-3 p-4"
        >
          <button
            type="button"
            aria-label={hearingDetailsLabel(hearing)}
            onClick={() => onOpenRecord({ hearing })}
          >
            <ItemContent className="min-w-0 flex-1 gap-2 text-left">
              <ItemTitle className="line-clamp-none text-body font-medium text-foreground">
                {hearingTypeLabel(hearing.type)}
              </ItemTitle>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body-compact text-muted-foreground">
                  {formatCaseDate(hearing.on)}
                </p>
                <HearingStatusBadge hearing={hearing} />
              </div>
              <HearingParties hearing={hearing} peopleById={peopleById} />
            </ItemContent>
          </button>
        </Item>
      ))}
    </ItemGroup>
  );
}

function HearingStatusBadge({ hearing }: { hearing: Hearing }) {
  if (!hearing.status) return null;
  return (
    <Badge variant={hearingStatusVariant(hearing.status)} className="w-fit">
      {hearingStatusLabel(hearing.status)}
    </Badge>
  );
}

function HearingParties({
  hearing,
  peopleById,
}: {
  hearing: Hearing;
  peopleById: Map<string, HearingPerson>;
}) {
  const display = hearingPartiesDisplay(hearing, peopleById);
  const names = hearingPartyNames(hearing, peopleById);
  if (!display) {
    return hearing.migrated ? (
      <p className="text-body-compact text-muted-foreground">Not migrated</p>
    ) : null;
  }
  return (
    <p className="text-body-compact" aria-label={names || undefined}>
      {display}
    </p>
  );
}

function HearingsEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof CalendarDaysIcon;
  title: string;
  description?: string;
}) {
  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">{title}</EmptyTitle>
        {description ? (
          <EmptyDescription className="text-body">{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
    </Empty>
  );
}
