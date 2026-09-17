"use client";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { causeTitle } from "@/lib/employee/hearings";
import {
  formatRequestDate,
  type ReschedulingRequest,
} from "@/lib/employee/rescheduling-request";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The rescheduling queue as a table: the cause, its number, when the
 * application arrived, and the date it is asking to leave.
 *
 * Four columns, and every absence is deliberate. There is no serial — a
 * serial is a position on a day's list and these applications are not a
 * sitting. There is no status chip: a row in this queue is in exactly one
 * state, pending review. There is no advocates column: the reference did not
 * have one, and search still reaches counsel.
 *
 * The cause title is the opener; the row is not. The row used to take the
 * click, on the reasoning that this queue has no other act — but eight of the
 * nine court queues open from the name, because a row that owns a checkbox or
 * its own buttons cannot also be one big target. That makes the underlined
 * name the shared product here and the row-click the second one, so this table
 * converges rather than keeping the exception.
 *
 * The name keeps the court's quiet dress — `text-foreground`, no teal — and
 * earns its underline on hover and focus, where a pointer or a keyboard has
 * actually asked. The teal link colour is the citizen side's, for an action
 * inline in prose; a court queue is thirty rows of data and rations it.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so
 * the table is one panel rather than a box inside a box.
 */
export function ReschedulingRequestTable({
  rows,
  onOpen,
}: {
  rows: ReschedulingRequest[];
  onOpen: (request: ReschedulingRequest) => void;
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
            Date of application
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Date of next hearing
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        <tr aria-hidden="true">
          <td colSpan={4} className="h-2 p-0" />
        </tr>
        {rows.map((request) => (
          <TableRow key={request.id} {...rowActivation(tableRowClass())}>
            <TableCell
              className={cn(TABLE_CELL, "min-w-64 font-medium whitespace-normal")}
            >
              <button
                type="button"
                onClick={() => onOpen(request)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Review </span>
                {causeTitle(request)}
              </button>
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier value={request.caseNumber} label="case number" />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}>
              {formatRequestDate(request.appliedOn)}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}>
              {formatRequestDate(request.listedOn)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
