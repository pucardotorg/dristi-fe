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
import { causeTitle, counselFor } from "@/lib/employee/hearings";
import {
  otherApplicationStageLabel,
  otherApplicationTypeLabel,
  type OtherApplication,
} from "@/lib/employee/other-applications";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The whole application queue as a table: the cause, its number, where the case has
 * reached, who appears, and what is being asked for.
 *
 * Delay condonation's four columns plus the one this screen exists for. Every absence is
 * the same absence as there. There is no serial — a serial is a position on a day's list
 * and these applications have no day. There is no actions column either: the cause title
 * opens the review overlay where the bench answers, so a row does not also need buttons.
 *
 * Application type is plain text, like stage beside it. Fourteen tinted heads down a
 * column is exactly the decoration the craft rules ration colour to prevent — and unlike
 * a status, a type is not something the bench needs to spot at a glance across the page.
 * It is the widest column by some distance, so it takes a floor width and wraps: the two
 * longest heads in the vocabulary run to five words and must not push the table sideways.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function OtherApplicationsTable({
  rows,
  onOpen,
}: {
  rows: OtherApplication[];
  onOpen: (application: OtherApplication) => void;
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
          <TableHead className={cn(TABLE_HEAD, "min-w-56 whitespace-normal")}>
            Application type
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's fill
            under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held out
            of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={5} className="h-2 p-0" />
        </tr>
        {rows.map((application) => (
          <TableRow key={application.id} {...rowActivation(tableRowClass())}>
            {/* The row's one emphasised cell, and its opener. The name keeps the
                court's quiet dress — no teal — and earns its underline on hover and
                focus, where a pointer or a keyboard has actually asked. The teal link
                colour is the citizen side's, for an action inline in prose; a court queue
                is thirty rows of data and rations it. */}
            <TableCell
              className={cn(TABLE_CELL, "min-w-64 font-medium whitespace-normal")}
            >
              <button
                type="button"
                onClick={() => onOpen(application)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Review </span>
                {causeTitle(application)}
              </button>
            </TableCell>
            <TableCell
              className={cn(TABLE_CELL, "whitespace-nowrap")}
            >
              <Identifier value={application.caseNumber} label="case number" />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              {otherApplicationStageLabel(application.stage)}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-48 whitespace-normal")}>
              <CounselCell
                complainant={counselFor(application, "complainant").map(
                  (counsel) => counsel.name,
                )}
                accused={counselFor(application, "accused").map(
                  (counsel) => counsel.name,
                )}
                dense
              />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-56 whitespace-normal")}>
              {otherApplicationTypeLabel(application.type)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
