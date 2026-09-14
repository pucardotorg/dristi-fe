"use client";

import Link from "next/link";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { CounselCell } from "@/components/employee/counsel-cell";
import { markArrival } from "@/components/employee/use-arrival";
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
import { causeTitle, counselFor } from "@/lib/employee/hearings";
import { delayDays, type CognizanceCase } from "@/lib/employee/cognizance";
import { cn } from "@/lib/utils";

/** Where the queue's rows open. */
export const COGNIZANCE_PATH = "/employee/cognizance";

/**
 * A complaint's cause title, as the way into the file the magistrate decides on.
 *
 * The same quiet-name dress as Register cases and the cause list: the name itself is the
 * control, underlined on hover and focus rather than painted, so a column of twenty-four
 * of them is not a column of links shouting. An anchor, because this navigates and a
 * destination has to survive a middle click, a new tab and the back button.
 */
export function CognizanceCaseLink({
  matter,
  className,
}: {
  matter: CognizanceCase;
  className?: string;
}) {
  return (
    <Link
      href={`${COGNIZANCE_PATH}/${matter.id}`}
      onClick={() => markArrival("next")}
      {...rowOpener}
      className={cn(rowOpenerClass, className)}
    >
      <span className="sr-only">Complaint from </span>
      {causeTitle(matter)}
    </Link>
  );
}

/**
 * Whether the complaint came in time, as the column says it.
 *
 * The number is the encoding and the words carry the unit, so the fact survives without
 * colour. Being late is the notable answer of the two, so it takes the page's own
 * foreground and being in time steps back to muted — hierarchy from weight of colour
 * rather than from a paint that would read as a defect. It is not one: a late complaint
 * arrives with an application to condone the delay, and deciding that is ordinary work.
 */
export function DelayCell({ matter }: { matter: CognizanceCase }) {
  const late = delayDays(matter);
  if (late === null) {
    return <span className="text-muted-foreground">In time</span>;
  }
  return (
    <span className="text-foreground">
      <span className="tabular-nums">{late}</span>{" "}
      {late === 1 ? "day late" : "days late"}
    </span>
  );
}

/**
 * The cognizance queue as a table: the cause, its number, who appears, and whether the
 * complaint was filed within the month §142(b) allows.
 *
 * Four columns, the PRD's four. There is no serial — these complaints have no day yet.
 * There is no status chip: every row is in one state, waiting for this act, so a column
 * repeating it on every row would carry nothing. And there is no actions column, because
 * the decision lives at the foot of the complaint's own file, where the magistrate has
 * just read the thing they are deciding about.
 *
 * The panel shell lives on the screen around this, so the table is one panel rather than
 * a box inside a box.
 */
export function CognizanceTable({ rows }: { rows: CognizanceCase[] }) {
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
          <TableHead className={cn(TABLE_HEAD, "min-w-48 whitespace-normal")}>
            Advocates
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap text-right")}>
            Delay
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well and needs the panel's fill under it, or its rounded
            bottom corners read as cut off. `border-separate` has no per-edge row gap, so
            the gap is one inert row held out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={4} className="h-2 p-0" />
        </tr>
        {rows.map((matter) => (
          <TableRow key={matter.id} {...rowActivation(tableRowClass())}>
            <TableCell className={cn(TABLE_CELL, "min-w-64 whitespace-normal")}>
              {/* Fills the cell, so the target is the row's height rather than the line
                  box the text happens to occupy. */}
              <CognizanceCaseLink
                matter={matter}
                className="flex min-h-10 w-full items-center"
              />
            </TableCell>
            <TableCell
              className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}
            >
              {matter.caseNumber}
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
            <TableCell
              className={cn(TABLE_CELL, "text-right whitespace-nowrap")}
            >
              <DelayCell matter={matter} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
