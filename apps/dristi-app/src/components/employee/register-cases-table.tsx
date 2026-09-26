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
  formatDaysWaiting,
  type RegisterCase,
} from "@/lib/employee/register-cases";
import { markArrival } from "@/components/employee/use-arrival";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * A complaint's cause title, as the way into its file.
 *
 * The exact sibling of the cause list's `HearingCaseLink`, and it wears the same
 * quiet-name dress: the name itself is the control, underlined on hover and focus
 * rather than painted, so a column of thirty-five of them is not a column of links
 * shouting. An anchor and not a button — this navigates, and a destination has to
 * survive a middle click, a new tab and the back button (`ACCESSIBILITY.md` §2).
 *
 * The caller supplies the box, because the table wants the cell filled as a 40×40
 * target and the phone list wants it inline. Only the box is theirs.
 */
export function RegisterCaseLink({
  matter,
  className,
}: {
  matter: RegisterCase;
  className?: string;
}) {
  return (
    <Link
      href={`${REGISTER_CASES_PATH}/${matter.id}`}
      /* The complaint rises into place, the same way the next one does from inside it. */
      onClick={() => markArrival("next")}
      {...rowOpener}
      className={cn(rowOpenerClass, className)}
    >
      {/* Under a column headed "Case name" the cause title is the whole of what a
          sighted reader needs; out of that column it is a link named after two
          parties and nothing else. */}
      <span className="sr-only">Complaint from </span>
      {causeTitle(matter)}
    </Link>
  );
}

/**
 * The register queue as a table: the cause, its number, who appears, and how long
 * the complaint has been waiting.
 *
 * Four columns, and every absence is deliberate. There is no serial — a serial is a
 * position on a day's list and these complaints have no day yet. There is no status
 * chip: a row in this queue is in exactly one state, waiting, so a column repeating
 * that on every row would carry no information.
 *
 * And there is still no actions column. The day's cause list keeps its row menu because
 * the acts it holds are things a bench does to a listed matter. Here there is nothing to
 * put in one: this build performs no registration act, so a menu would be an empty
 * affordance. Better to leave the column out until registering is real than to draw
 * furniture around a hole. The *decisions* on a complaint live at the foot of its own
 * file, where the clerk has just read the thing they are deciding about — see
 * `register-case-screen.tsx`.
 *
 * The cause title, though, is now a link. It stopped being one of the reference's
 * broken promises the moment the file behind it existed
 * (`/employee/register-cases/<id>`), and a queue whose rows cannot be opened is a
 * queue that can only be counted.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the
 * table is one panel rather than a box inside a box.
 */
/** Where the queue's rows open. */
export const REGISTER_CASES_PATH = "/employee/register-cases";

export function RegisterCasesTable({ rows }: { rows: RegisterCase[] }) {
  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "min-w-64 whitespace-normal")}>
            Case name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Filing number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-48 whitespace-normal")}>
            Advocates
          </TableHead>
          <TableHead
            className={cn(TABLE_HEAD, "whitespace-nowrap text-right")}
          >
            Days since submitted
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
        {/* The row's hover is kept, and `accent` is the transient-hover role — a fill
            that says the thing under the pointer is live. Something is: the cause title
            opens the complaint's file. It used to be cancelled back to `bg-card`
            precisely because this queue had no opener. */}
        {rows.map((matter) => (
          <TableRow key={matter.id} {...rowActivation(tableRowClass())}>
            <TableCell
              className={cn(TABLE_CELL, "min-w-64 whitespace-normal")}
            >
              {/* Fills the cell so the target is the row's height rather than the
                  20px line box the text happens to occupy (`ACCESSIBILITY.md` §8).
                  `flex`, not `inline-flex`: an inline box would shrink-wrap and
                  fight the cell's `whitespace-normal` wrapping. */}
              <RegisterCaseLink
                matter={matter}
                className="flex min-h-10 w-full items-center"
              />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier value={matter.filingNumber} label="filing number" />
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
            {/* The wait is the column's fact. `warning-ink` is the DS token for that
                rust the reference painted — status text on a neutral ground, never a
                fill. The number is the encoding; the colour agrees with it
                (ACCESSIBILITY §3). Right-aligned because it is a compared number. */}
            <TableCell
              className={cn(
                TABLE_CELL,
                "text-right tabular-nums whitespace-nowrap text-warning-ink",
              )}
            >
              {formatDaysWaiting(matter.daysSinceSubmitted)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
