"use client";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { CounselCell } from "@/components/employee/counsel-cell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { causeTitle, counselFor } from "@/lib/employee/hearings";
import { caseStageLabel, type SchedulingCase } from "@/lib/employee/schedule";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The scheduling queue as a table: the cause, its number, where the case has reached, and
 * who appears.
 *
 * Four columns rather than the cause list's seven, and every absence is deliberate. There
 * is no serial — a serial is a position on a day's list and these matters have no day yet.
 * There is no status chip: a case in this queue is in exactly one state, waiting, so a
 * column repeating that on every row would carry no information. Stage is plain text
 * rather than a chip for the reason the craft rules ration colour — six tinted stages down
 * a column is decoration.
 *
 * And there is no actions column. The day's cause list keeps its row menu because the acts
 * it holds (start a hearing, pass a matter over) are things a bench does to a listed
 * matter, and showing them disabled says what the screen will one day do. Here there is
 * nothing to put in one: this build performs no listing act, so a menu would be an empty
 * affordance — a control whose only content is the news that it has no content. Better to
 * leave the column out until scheduling is real than to draw furniture around a hole.
 *
 * **The cause opens the scheduling flow — which is not built yet, so it lands on a plain
 * "not built" end state** (owner, 2026-09-15). The row is the same clickable row every
 * other queue has: it is no longer left inert, which read as a dead line; it is honest
 * instead about where it goes.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function ScheduleTable({
  rows,
  onOpen,
}: {
  rows: SchedulingCase[];
  onOpen: (matter: SchedulingCase) => void;
}) {
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
            Case name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Stage
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-48 whitespace-normal")}>
            Advocates
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={4} className="h-2 p-0" />
        </tr>
        {rows.map((matter) => (
          <TableRow key={matter.id} {...rowActivation(tableRowClass())}>
            {/* The row's one emphasised cell, and its opener — the same clickable cause
                title every court queue carries. It opens the scheduling flow, which is not
                built yet (see the screen's `NotBuiltDialog`). */}
            <TableCell
              className={cn(TABLE_CELL, "min-w-64 font-medium whitespace-normal")}
            >
              <button
                type="button"
                onClick={() => onOpen(matter)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Open </span>
                {causeTitle(matter)}
              </button>
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier value={matter.caseNumber} label="case number" />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              {caseStageLabel(matter.stage)}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-48 whitespace-normal")}>
              <CounselCell
                complainant={counselFor(matter, "complainant").map(
                  (counsel) => counsel.name,
                )}
                accused={counselFor(matter, "accused").map(
                  (counsel) => counsel.name,
                )}
                dense
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
