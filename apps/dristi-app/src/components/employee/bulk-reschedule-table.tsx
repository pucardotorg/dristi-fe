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
import {
  type NewDateProblem,
  type ReschedulableHearing,
} from "@/lib/employee/bulk-reschedule";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/** What a row says when the date it would move to is not a move. */
const PROBLEM_NOTE: Record<Exclude<NewDateProblem, "missing">, string> = {
  unchanged: "Already listed on this date",
  past: "This date has passed",
};

/**
 * The matters in range, and where each one would go.
 *
 * The new date is **read** here and set in the selection bar above the table: one picker
 * that writes every selected row. Different rows can still end on different dates — the
 * bench narrows the selection and applies again — so nothing the reference's per-row
 * column could express is lost, and the column stays a column of dates the court can
 * scan against the one beside it. See `BulkRescheduleScreen` for why it is not twenty
 * pickers.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function BulkRescheduleTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  newDates,
  problemFor,
}: {
  rows: ReschedulableHearing[];
  selected: ReadonlySet<string>;
  onToggle: (id: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
  newDates: Readonly<Record<string, string | undefined>>;
  problemFor: (row: ReschedulableHearing) => NewDateProblem | null;
}) {
  const selectedHere = rows.filter((row) => selected.has(row.id)).length;
  const allChecked = selectedHere === rows.length;

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
            Current hearing date
          </TableHead>
          <TableHead
            className={cn(
              TABLE_HEAD,
              "sticky right-0 z-20 min-w-44 bg-surface-sunken whitespace-nowrap",
            )}
          >
            New hearing date
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass({ hover: false })}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={7} className="h-2 p-0" />
        </tr>
        {rows.map((row) => {
          const isSelected = selected.has(row.id);
          const newDate = newDates[row.id];
          const problem = problemFor(row);
          /* Only a date the bench actually chose can be wrong. "No date yet" is the
             resting state of every row on this screen and is answered once in the
             footer, not nineteen times down the column. */
          const note =
            isSelected && newDate && problem && problem !== "missing"
              ? PROBLEM_NOTE[problem]
              : null;

          return (
            <TableRow key={row.id} className={tableRowClass({ hover: false })}>
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
              <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
                <Identifier value={row.caseNumber} label="case number" />
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
              <TableCell
                className={cn(
                  TABLE_CELL,
                  "sticky right-0 z-20 min-w-44 bg-inherit whitespace-nowrap",
                )}
              >
                {newDate ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium tabular-nums">
                      {formatListingDate(newDate)}
                    </span>
                    {note ? (
                      <span className="text-caption text-destructive-ink">
                        {note}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  /* An em dash, not an empty cell: the column has a value for this row
                     and it is "none yet". Spoken so the fact survives without the glyph. */
                  <span className="text-muted-foreground">
                    <span aria-hidden>&mdash;</span>
                    <span className="sr-only">No new date yet</span>
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
