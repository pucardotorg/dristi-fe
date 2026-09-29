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
import {
  delayDays,
  type CognizanceCase,
  type CognizanceTab,
} from "@/lib/employee/cognizance";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

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
 * How late the complaint was, in days.
 *
 * Two dresses, because the column and the phone say it in different company. In the
 * table the header already names the fact, so the cell is the bare number and nothing
 * else — twenty rows of "12 days late" under a column called *Days of delay* is the unit
 * written twice, and the numbers no longer line up to be compared. Stacked on a phone
 * there is no header, so the words come back and carry it.
 *
 * `tabular-nums` either way: these are numbers a bench reads down a column.
 */
export function DelayCell({
  matter,
  standalone = false,
}: {
  matter: CognizanceCase;
  standalone?: boolean;
}) {
  const late = delayDays(matter);
  if (late === null) {
    /* Only reachable standalone: the column exists on the With delay tab alone. */
    return <span className="text-muted-foreground">In time</span>;
  }
  if (!standalone) return <span className="tabular-nums">{late}</span>;
  return (
    <span>
      <span className="tabular-nums">{late}</span>{" "}
      {late === 1 ? "day late" : "days late"}
    </span>
  );
}

/**
 * One tab's complaints as a table: the cause, its number, who appears — and, on the With
 * delay tab, how many days late the complaint was.
 *
 * The PRD's columns, per tab: three without delay, four with it. *Days of delay* exists
 * only where there is delay to show; on the other tab every row would say the same
 * thing, and a column with one value in it is a column carrying nothing. There is no
 * serial — these complaints have no day yet — no status chip, because every row on this
 * screen is in the one state, and no actions column, because the decision lives at the
 * foot of the complaint's own file where the magistrate has just read the thing they are
 * deciding about.
 *
 * The panel shell lives on the screen around this, so the table is one panel rather than
 * a box inside a box.
 */
export function CognizanceTable({
  rows,
  tab,
}: {
  rows: CognizanceCase[];
  tab: CognizanceTab;
}) {
  const showDelay = tab === "with-delay";
  const columns = showDelay ? 4 : 3;
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
          {showDelay ? (
            <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap text-right")}>
              Days of delay
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well and needs the panel's fill under it, or its rounded
            bottom corners read as cut off. `border-separate` has no per-edge row gap, so
            the gap is one inert row held out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={columns} className="h-2 p-0" />
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
              className={cn(TABLE_CELL, "whitespace-nowrap")}
            >
              <Identifier value={matter.caseNumber} label="case number" />
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
            {showDelay ? (
              <TableCell
                className={cn(TABLE_CELL, "text-right whitespace-nowrap")}
              >
                <DelayCell matter={matter} />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
