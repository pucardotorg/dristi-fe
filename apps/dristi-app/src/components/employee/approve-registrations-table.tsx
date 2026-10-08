"use client";

import {
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  tableBodyClass,
  tableRowClass,
} from "@/components/chrome/table-plate";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  decisionDay,
  formatDaysWaiting,
  registrationWaitTone,
  accountTypeVariant,
  roleLabel,
  type DecidedRegistration,
  type RegistrationOutcome,
  type RegistrationRequest,
  type WaitTone,
} from "@/lib/employee/approve-registrations";
import { formatListingDate } from "@/lib/employee/hearings";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/** Plain at rest; the exception gets the ink. See `registrationWaitTone`. */
export const waitClass: Record<WaitTone, string> = {
  plain: "",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
};

/** "Approved on" / "Rejected on" — the date column's header, and its phone-row prefix. */
export function decidedOnLabel(outcome: RegistrationOutcome): string {
  return outcome === "approved" ? "Approved on" : "Rejected on";
}

/**
 * The registration queue as a table: who is asking, what they are registering as, the
 * registration they claim, and how long the office has kept them waiting.
 *
 * **The name is the row's identifier and its opener** (owner, 2026-10-07). The
 * application number used to lead the row; it is a backend reference the court never
 * reads or quotes, so it is gone from the list and the overlay alike. **Request type is
 * gone too** — it survives as a filter, and in the overlay where a single request is read.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function RegistrationsTable({
  rows,
  onOpen,
}: {
  rows: RegistrationRequest[];
  onOpen: (request: RegistrationRequest) => void;
}) {
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "min-w-48 whitespace-normal")}>
            Full name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Account type
          </TableHead>
          {/* "Registration number", not "Bar registration ID" — the column holds clerks'
              numbers too, and the Account type beside it says which register it is. */}
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Registration number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap text-right")}>
            Days waiting
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well, not a band welded to the rows (ui-craft §4). */}
        <tr aria-hidden="true">
          <td colSpan={4} className="h-2 p-0" />
        </tr>
        {rows.map((request) => (
          <TableRow key={request.id} {...rowActivation(tableRowClass())}>
            {/* The row's only opener — a click anywhere in the row presses it. The name
                wraps and never truncates: a Malayalam name is taller as well as longer.
                `lang` rides the name for screen readers (ACCESSIBILITY §13). */}
            <TableCell className={cn(TABLE_CELL, "min-w-48 whitespace-normal")}>
              <button
                type="button"
                onClick={() => onOpen(request)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Review </span>
                <span lang={request.fullNameLang}>{request.fullName}</span>
              </button>
            </TableCell>
            {/* The one coloured pill in the row — colour on this screen answers one
                question: which kind of account. */}
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Badge variant={accountTypeVariant(request.registrantKind)}>
                {roleLabel(request.registrantKind)}
              </Badge>
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier
                value={request.registrationNumber}
                label="registration number"
              />
            </TableCell>
            {/* The number is the encoding; the colour only agrees with it (ACCESSIBILITY §3). */}
            <TableCell
              className={cn(
                TABLE_CELL,
                "text-right tabular-nums whitespace-nowrap",
                waitClass[registrationWaitTone(request.daysWaiting)],
              )}
            >
              {formatDaysWaiting(request.daysWaiting)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Approved or rejected requests — read, not worked: no opener and no hover, because
 * nothing on these tabs can be decided again. A rejection carries the reason the
 * registrant was given, in full; it is the one thing anyone comes to this tab to read.
 */
export function DecidedRegistrationsTable({
  rows,
  outcome,
}: {
  rows: DecidedRegistration[];
  outcome: RegistrationOutcome;
}) {
  const rejected = outcome === "rejected";
  const columns = rejected ? 5 : 4;
  /* Widths on the headers so the slack is shared out. Left to auto layout, the reason
     took every spare pixel and packed the four short columns against the left edge
     (owner, 2026-10-07: "looks a little cramped"). On Approved there is no reason, so
     the three facts before the date take the room instead. */
  const width = rejected
    ? { name: "w-1/5", type: "w-1/8", number: "w-1/6", date: "w-1/8" }
    : { name: "w-1/3", type: "w-1/5", number: "w-1/4", date: "" };
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, width.name, "min-w-48 whitespace-normal")}>
            Full name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, width.type, "whitespace-nowrap")}>
            Account type
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, width.number, "whitespace-nowrap")}>
            Registration number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, width.date, "whitespace-nowrap")}>
            {decidedOnLabel(outcome)}
          </TableHead>
          {rejected ? (
            <TableHead className={cn(TABLE_HEAD, "min-w-72 whitespace-normal")}>
              Reason
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass({ hover: false })}>
        <tr aria-hidden="true">
          <td colSpan={columns} className="h-2 p-0" />
        </tr>
        {rows.map(({ request, ...decided }) => (
          <TableRow key={request.id} className={tableRowClass({ hover: false })}>
            <TableCell
              className={cn(TABLE_CELL, "min-w-48 font-medium whitespace-normal")}
              lang={request.fullNameLang}
            >
              {request.fullName}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Badge variant={accountTypeVariant(request.registrantKind)}>
                {roleLabel(request.registrantKind)}
              </Badge>
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier
                value={request.registrationNumber}
                label="registration number"
              />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "tabular-nums whitespace-nowrap")}>
              {formatListingDate(decisionDay({ request, ...decided }))}
            </TableCell>
            {rejected ? (
              <TableCell
                className={cn(TABLE_CELL, "min-w-72 whitespace-normal text-muted-foreground")}
              >
                {decided.reason}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
