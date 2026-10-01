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
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  delayCondonationStageLabel,
  type DelayCondonationCase,
} from "@/lib/employee/delay-condonation";
import { causeTitle, counselFor } from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The delay-condonation queue as a table: the cause, its number, where the
 * case has reached, and who appears.
 *
 * Four columns, and every absence is deliberate. There is no serial — a
 * serial is a position on a day's list and these applications have no day.
 * Stage is plain text rather than a chip for the reason the craft rules
 * ration colour — seven tinted stages down a column is decoration.
 *
 * And there is still no actions column. The review overlay the cause title
 * opens is where the bench answers, so a row does not also need buttons: the
 * underlined name is the one target, the way the rescheduling queue and seven
 * other court queues already work.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so
 * the table is one panel rather than a box inside a box.
 */
export function DelayCondonationTable({
  rows,
  onOpen,
}: {
  rows: DelayCondonationCase[];
  onOpen: (matter: DelayCondonationCase) => void;
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
        {/* The header is a well, not a band welded to the rows — it needs the
            panel's fill under it or its rounded bottom corners read as cut
            off (ui-craft §4). `border-separate` has no per-edge row gap, so
            the gap is one inert row held out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={4} className="h-2 p-0" />
        </tr>
        {rows.map((matter) => (
          <TableRow key={matter.id} {...rowActivation(tableRowClass())}>
            {/* The row's one emphasised cell, and its opener. The name keeps
                the court's quiet dress — no teal — and earns its underline on
                hover and focus, where a pointer or a keyboard has actually
                asked. The teal link colour is the citizen side's, for an
                action inline in prose; a court queue is thirty rows of data
                and rations it. */}
            <TableCell
              className={cn(
                TABLE_CELL,
                "min-w-64 font-medium whitespace-normal",
              )}
            >
              <button
                type="button"
                onClick={() => onOpen(matter)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Review </span>
                {causeTitle(matter)}
              </button>
            </TableCell>
            <TableCell
              className={cn(TABLE_CELL, "whitespace-nowrap")}
            >
              <Identifier value={matter.caseNumber} label="case number" />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              {delayCondonationStageLabel(matter.stage)}
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
