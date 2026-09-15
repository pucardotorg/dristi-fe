"use client";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
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
  courtCaseStageLabel,
  courtHearingPurposeLabel,
  formatListingDate,
} from "@/lib/employee/hearings";
import { type ReschedulableHearing } from "@/lib/employee/bulk-reschedule";
import { cn } from "@/lib/utils";

/**
 * The matters in range, and which of them the bench has picked.
 *
 * **The New hearing date column appears when there is a new hearing date, and not
 * before.** It used to stand there permanently, reading back what a date picker above the
 * table had written into it: an em dash on every row until something was applied, and an
 * em dash again the moment the range moved. That column went out with the picker. The
 * date is asked for once, inside the overlay the act opens — and then the answer has to
 * land somewhere the bench can see it, because a move whose only trace is the dialog that
 * closed is a move the board never admits to. So the pair comes back the other way round:
 * the moment any matter on screen has been moved, the board carries both ends of the
 * change — the day it was listed on, and the day it now goes to (owner, 2026-09-15).
 *
 * The two dates are not the same kind of fact and are not drawn as though they were. The
 * day the matter was listed on is settled and muted; the day it moves to is what changed,
 * so it carries the foreground and the weight. A row nobody has moved has no new date,
 * and says so rather than borrowing its old one.
 *
 * Picking is the one thing that happens here, so a picked row carries the design system's
 * own selection band (`tableRowClass({ selectable })`) and a run of them paints as one
 * block. The row itself stays inert — the checkbox is the control, and a hover fill would
 * promise a click the row does not answer.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function BulkRescheduleTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
}: {
  rows: ReschedulableHearing[];
  selected: ReadonlySet<string>;
  onToggle: (id: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
}) {
  const selectedHere = rows.filter((row) => selected.has(row.id)).length;
  const allChecked = selectedHere === rows.length;

  /* Asked of what is on screen, not of the session: a column belongs to the board the
     bench is looking at. Narrow the range past every matter this session moved and the
     column goes with them, which is right — there is no change left to show. */
  const showsNewDate = rows.some((row) => row.newDate !== undefined);
  const columns = showsNewDate ? 7 : 6;

  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "w-12")}>
            <Checkbox
              checked={
                allChecked ? true : selectedHere > 0 ? "indeterminate" : false
              }
              onCheckedChange={(next) => onToggleAll(next === true)}
              aria-label={
                allChecked
                  ? "Clear the selection"
                  : "Select every matter in this range"
              }
            />
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
            Case title
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Stage
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-40 whitespace-normal")}>
            Hearing type
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            {showsNewDate ? "Current hearing date" : "Hearing date"}
          </TableHead>
          {showsNewDate ? (
            <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
              New hearing date
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass({ hover: false, selectable: true })}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={columns} className="h-2 p-0" />
        </tr>
        {rows.map((row) => {
          const isSelected = selected.has(row.id);

          return (
            <TableRow
              key={row.id}
              data-state={isSelected ? "selected" : undefined}
              className={tableRowClass({ hover: false, selectable: true })}
            >
              <TableCell className={cn(TABLE_CELL, "w-12")}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(next) => onToggle(row.id, next === true)}
                  aria-label={`Select ${row.title}, ${row.caseNumber}`}
                />
              </TableCell>
              {/* The row's one emphasised cell. Not a link: there is no court-side case
                  file yet, and the citizen side's is not the bench's to point at. */}
              <TableCell
                className={cn(TABLE_CELL, "min-w-64 font-medium whitespace-normal")}
              >
                {row.title}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}>
                {row.caseNumber}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
                {courtCaseStageLabel(row.stage)}
              </TableCell>
              <TableCell className={cn(TABLE_CELL, "min-w-40 whitespace-normal")}>
                {courtHearingPurposeLabel(row.purpose)}
              </TableCell>
              <TableCell
                className={cn(
                  TABLE_CELL,
                  "tabular-nums whitespace-nowrap text-muted-foreground",
                )}
              >
                {formatListingDate(row.date)}
              </TableCell>
              {showsNewDate ? (
                <TableCell
                  className={cn(
                    TABLE_CELL,
                    "font-medium tabular-nums whitespace-nowrap",
                  )}
                >
                  {row.newDate ? (
                    formatListingDate(row.newDate)
                  ) : (
                    /* A row in a range where others moved. The rule is drawn for the
                       eye, which reads a gap in a column of dates as a loading cell;
                       the reader that cannot see it is told the fact instead. */
                    <>
                      <span aria-hidden="true" className="text-muted-foreground">
                        —
                      </span>
                      <span className="sr-only">Not rescheduled</span>
                    </>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
