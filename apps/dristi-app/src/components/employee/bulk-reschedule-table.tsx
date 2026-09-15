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
 * **One table, two jobs, told apart by one prop.** The screen shows it twice, once per
 * tab (owner, 2026-09-15), and `selection` is what says which:
 *
 * - **Present — the Unscheduled board.** A checkbox column, and picked rows carry the
 *   design system's own selection band (`tableRowClass({ selectable })`) so a run of them
 *   paints as one block. The date column is *Hearing date*: where the matter stands.
 * - **Absent — the Scheduled record.** Nothing to pick, so no column for picking. The
 *   date column is *Previous hearing date*: where the matter came from. Where it went is
 *   the heading over the group this table sits in, so it is not also a column inside it.
 *
 * That was two columns for a while, Current and New, on a flat list of everything moved.
 * It stopped being right when a session turned out to hold several moves to several days:
 * the day became the thing to group by, and a New hearing date column repeating its own
 * group heading on every row is the same fact printed twice.
 *
 * The row itself stays inert either way — the checkbox is the control, and a hover fill
 * would promise a click the row does not answer.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function BulkRescheduleTable({
  rows,
  selection,
  caption,
}: {
  rows: ReschedulableHearing[];
  /** Omitted where the table is a record of what was done rather than a board to work. */
  selection?: {
    selected: ReadonlySet<string>;
    onToggle: (id: string, next: boolean) => void;
    onToggleAll: (next: boolean) => void;
  };
  /**
   * What this table is, for a reader that cannot see the heading above it.
   *
   * The record is several tables under several date headings, and a screen reader moving
   * by table hears only "table" for each. Sighted readers get the heading; this is the
   * same sentence, in the place the table itself carries it.
   */
  caption?: string;
}) {
  const selectedHere = selection
    ? rows.filter((row) => selection.selected.has(row.id)).length
    : 0;
  const allChecked = selectedHere === rows.length;

  /* Six on the board, five on the record — the checkbox column is the difference. */
  const columns = selection ? 6 : 5;

  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          {selection ? (
            <TableHead className={cn(TABLE_HEAD, "w-12")}>
              <Checkbox
                checked={
                  allChecked ? true : selectedHere > 0 ? "indeterminate" : false
                }
                onCheckedChange={(next) => selection.onToggleAll(next === true)}
                aria-label={
                  allChecked
                    ? "Clear the selection"
                    : "Select every matter in this range"
                }
              />
            </TableHead>
          ) : null}
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
            {selection ? "Hearing date" : "Previous hearing date"}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody
        className={tableBodyClass({ hover: false, selectable: Boolean(selection) })}
      >
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={columns} className="h-2 p-0" />
        </tr>
        {rows.map((row) => {
          const isSelected = selection?.selected.has(row.id) ?? false;

          return (
            <TableRow
              key={row.id}
              data-state={isSelected ? "selected" : undefined}
              className={tableRowClass({
                hover: false,
                selectable: Boolean(selection),
              })}
            >
              {selection ? (
                <TableCell className={cn(TABLE_CELL, "w-12")}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(next) =>
                      selection.onToggle(row.id, next === true)
                    }
                    aria-label={`Select ${row.title}, ${row.caseNumber}`}
                  />
                </TableCell>
              ) : null}
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
              {/* Where the matter is, or where it was — the heading says which, and on
                  the record the day it went to is that heading. Muted either way: it is
                  the settled fact in the row, not the one being decided. */}
              <TableCell
                className={cn(
                  TABLE_CELL,
                  "tabular-nums whitespace-nowrap text-muted-foreground",
                )}
              >
                {formatListingDate(row.date)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
