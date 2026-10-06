"use client";

import * as React from "react";

import { Identifier } from "@/components/chrome/identifier";
import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import { PANEL_CLASS } from "@/components/shell/panel";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  hearingSlotLabel,
  type ReschedulableHearing,
} from "@/lib/employee/bulk-reschedule";
import {
  courtCaseStageLabel,
  courtHearingPurposeLabel,
  formatListingDate,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";

/**
 * The case, as Pending tasks writes it: the cause title, and the number under it.
 */
function CaseCell({ row }: { row: ReschedulableHearing }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-body-compact font-medium text-foreground">
        {row.title}
      </span>
      <span className="text-caption text-muted-foreground">
        <Identifier value={row.caseNumber} label="case number" />
      </span>
    </div>
  );
}

/**
 * What this sitting is for, and how far the case has got — two facts the court reads
 * together, so they share a cell rather than taking two columns from the case title.
 */
function HearingCell({ row }: { row: ReschedulableHearing }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-body-compact text-foreground">
        {courtHearingPurposeLabel(row.purpose)}
      </span>
      <span className="text-caption text-muted-foreground">
        {courtCaseStageLabel(row.stage)} stage
      </span>
    </div>
  );
}

/** A new date and its slot, read in a column beside other dates. */
export function NewDateText({ day, slot }: { day: string; slot: string }) {
  return (
    <span className="flex flex-col gap-0.5 text-left">
      <span className="text-body-compact font-medium tabular-nums text-foreground">
        {formatListingDate(day)}
      </span>
      <span className="text-caption text-muted-foreground">{slot} slot</span>
    </span>
  );
}

/** A click that landed on a control inside the row belongs to that control. */
function onControl(event: React.MouseEvent) {
  return Boolean(
    (event.target as HTMLElement).closest("button, a, [role=checkbox], label"),
  );
}

type Selection = {
  selected: ReadonlySet<string>;
  onToggle: (id: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
};

/**
 * The hearings still to move, in board order — one list, no day bands: the day each is
 * listed on is a column (owner, 2026-10-06).
 *
 * Every row carries its own New date control (`dateCell`), so a date can be set or
 * changed for one hearing without ticking anything (owner, 2026-10-06).
 */
export function RescheduleTable({
  rows,
  selection,
  dateCell,
}: {
  rows: ReschedulableHearing[];
  selection: Selection;
  dateCell: (row: ReschedulableHearing) => React.ReactNode;
}) {
  const ticked = rows.filter((row) => selection.selected.has(row.id)).length;
  const allTicked = rows.length > 0 && ticked === rows.length;

  function renderRow(row: ReschedulableHearing) {
    const isSelected = selection.selected.has(row.id);
    return (
      <TableRow
        key={row.id}
        data-state={isSelected ? "selected" : undefined}
        className={cn(tableRowClass({ selectable: true }), "cursor-pointer")}
        onClick={(event) => {
          if (onControl(event)) return;
          selection.onToggle(row.id, !isSelected);
        }}
      >
        <TableCell className={cn(TABLE_CELL, "w-10 pr-0")}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(next) => selection.onToggle(row.id, next === true)}
            aria-label={`Select ${row.title}, ${row.caseNumber}`}
          />
        </TableCell>
        <TableCell className={cn(TABLE_CELL, "min-w-56 whitespace-normal")}>
          <CaseCell row={row} />
        </TableCell>
        <TableCell className={cn(TABLE_CELL, "min-w-40 whitespace-normal")}>
          <HearingCell row={row} />
        </TableCell>
        <TableCell
          className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap text-muted-foreground")}
        >
          {formatListingDate(row.date)}
        </TableCell>
        <TableCell className={cn(TABLE_CELL, "w-44 py-1")}>{dateCell(row)}</TableCell>
      </TableRow>
    );
  }

  return (
    <Card className={cn(PANEL_CLASS, "gap-0 overflow-clip py-0")}>
      <div className="p-4">
        <Table className="w-full border-separate border-spacing-0 text-body-compact">
          <caption className="sr-only">Hearings to reschedule</caption>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW}>
              <TableHead className={cn(TABLE_HEAD, "w-10 pr-0")}>
                <Checkbox
                  checked={allTicked ? true : ticked > 0 ? "indeterminate" : false}
                  onCheckedChange={() => selection.onToggleAll(!allTicked)}
                  aria-label={
                    allTicked ? "Clear the selection" : "Select every hearing shown"
                  }
                />
              </TableHead>
              <TableHead className={TABLE_HEAD}>Case</TableHead>
              <TableHead className={TABLE_HEAD}>Hearing</TableHead>
              <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                Listed on
              </TableHead>
              <TableHead className={TABLE_HEAD}>New date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClass({ selectable: true })}>
            {/* The header is a well, not a band welded to the rows (ui-craft §4). */}
            <tr aria-hidden="true">
              <td colSpan={5} className="h-2 p-0" />
            </tr>
            {rows.map(renderRow)}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/** The same list below `md`, as stacked items — four columns do not survive a phone. */
export function RescheduleItemList({
  rows,
  selection,
  dateCell,
}: {
  rows: ReschedulableHearing[];
  selection: Selection;
  dateCell: (row: ReschedulableHearing) => React.ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const isSelected = selection.selected.has(row.id);
        return (
          <QueueItemRow
            key={row.id}
            className="flex gap-3"
            onClick={(event) => {
              if (onControl(event)) return;
              selection.onToggle(row.id, !isSelected);
            }}
          >
            <span className="pt-0.5">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(next) => selection.onToggle(row.id, next === true)}
                aria-label={`Select ${row.title}, ${row.caseNumber}`}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-col gap-1">
                <CaseCell row={row} />
                <p className="text-caption text-muted-foreground">
                  {courtHearingPurposeLabel(row.purpose)} ·{" "}
                  {courtCaseStageLabel(row.stage)} stage ·{" "}
                  <span className="tabular-nums">{formatListingDate(row.date)}</span>
                </p>
              </div>
              <div className="w-full sm:w-56">{dateCell(row)}</div>
            </div>
          </QueueItemRow>
        );
      })}
    </ul>
  );
}

/**
 * What this session has rescheduled: from where, to where. Read, not worked — no
 * selection and no hover.
 */
export function RescheduledTable({
  rows,
  caption,
}: {
  rows: ReschedulableHearing[];
  caption: string;
}) {
  return (
    <Card className={cn(PANEL_CLASS, "gap-0 overflow-clip py-0")}>
      <div className="p-4">
        <Table className="w-full border-separate border-spacing-0 text-body-compact">
          <caption className="sr-only">{caption}</caption>
          <TableHeader>
            <TableRow className={TABLE_HEAD_ROW}>
              <TableHead className={TABLE_HEAD}>Case</TableHead>
              <TableHead className={TABLE_HEAD}>Hearing</TableHead>
              <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                Was listed on
              </TableHead>
              <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
                New date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={tableBodyClass({ hover: false })}>
            <tr aria-hidden="true">
              <td colSpan={4} className="h-2 p-0" />
            </tr>
            {rows.map((row) => (
              <TableRow key={row.id} className={tableRowClass({ hover: false })}>
                <TableCell className={cn(TABLE_CELL, "min-w-56 whitespace-normal")}>
                  <CaseCell row={row} />
                </TableCell>
                <TableCell className={cn(TABLE_CELL, "min-w-40 whitespace-normal")}>
                  <HearingCell row={row} />
                </TableCell>
                <TableCell
                  className={cn(
                    TABLE_CELL,
                    "tabular-nums whitespace-nowrap text-muted-foreground",
                  )}
                >
                  {formatListingDate(row.date)}
                </TableCell>
                <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
                  {row.newDate ? (
                    <NewDateText
                      day={row.newDate}
                      slot={hearingSlotLabel(row.newSlot ?? "morning")}
                    />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function RescheduledItemList({ rows }: { rows: ReschedulableHearing[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <QueueItemRow key={row.id} className="flex flex-col gap-2">
          <CaseCell row={row} />
          <p className="text-caption text-muted-foreground">
            {courtHearingPurposeLabel(row.purpose)} · was listed on{" "}
            <span className="tabular-nums">{formatListingDate(row.date)}</span>
          </p>
          {row.newDate ? (
            <NewDateText
              day={row.newDate}
              slot={hearingSlotLabel(row.newSlot ?? "morning")}
            />
          ) : null}
        </QueueItemRow>
      ))}
    </ul>
  );
}
