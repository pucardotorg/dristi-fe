"use client";

import Link from "next/link";
import { EllipsisVerticalIcon, FilePlusIcon } from "lucide-react";

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
} from "@/lib/employee/row-activation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CourtRole } from "@/lib/employee/content";
import { seatHasBenchControls } from "@/lib/employee/court-role";
import {
  canDraftOrder,
  canEndHearing,
  canPassOver,
  canStartHearing,
  canTypeOrder,
  causeTitle,
  counselFor,
  courtHearingPurposeLabel,
  courtHearingStatusLabel,
  courtHearingStatusVariant,
  type CourtHearing,
} from "@/lib/employee/hearings";
import { cn } from "@/lib/utils";
import { Identifier } from "@/components/chrome/identifier";

/**
 * Start hearing and End hearing live in the Action column, as one labelled outline
 * control — not teal (Join VC is the screen's one primary). Both are buttons: Start
 * marks the listing ongoing and opens that matter over the list; End marks it
 * completed. Neither leaves the day.
 *
 * It is the only bordered action on a callable row (ui-craft §2). Scheduled listings
 * start; the same slot ends the one that is ongoing. Completed listings have nothing
 * left to call, so the control stops taking a press — the same outline slot now
 * reads *Hearing ended*, disabled. A dash would read as missing data; the words say
 * the call is done. It stays the outline dress (not a second status chip) so the
 * Completed chip remains the one status mark (ui-craft §1.4). Passed-over listings
 * also have nothing left to call today; the slot empties rather than showing that
 * report, because the call was not finished — the Passed over chip is the mark.
 *
 * Pass over is the other sitting outcome, not a second session verb: it lives
 * in a row overflow beside this control, on scheduled and ongoing rows only.
 *
 * **All of it belongs to the seat that runs the sitting.** A seat that does not gets no
 * slot at all, not a quieter one: this used to hand the typist a one-control version
 * that reported the sitting in three words, and three words for what the Status chip
 * two cells away already said is a column of nothing (owner, 2026-09-09). That seat's
 * cause list ends at Orders, and the trip into the order is what moves the matter
 * (`canTypeOrder`).
 *
 * `min-w-32` is a floor, not a fit: "Start hearing" measures 83px of ink and "End
 * hearing" / "Hearing ended" sit inside the same width, so 128px holds any of those
 * labels with room and neither the control nor the column jumps when the word
 * changes. It was `min-w-40`, which spent 45px per row on nothing and pushed the
 * table past the width of its own panel — see below.
 */
const SESSION_SLOT_CLASS = "min-w-32";
/**
 * The two right-hand columns are ordinary columns. They used to be pinned, and the pin
 * is what the bench read as a rendering fault.
 *
 * `sticky right-0` does not mean "hold still until scrolled past". It clamps the cell's
 * right edge to the scrollport's, so the moment the table is wider than the port the
 * cell is pulled *left*, over its neighbours, at scroll position zero — before anyone
 * has scrolled anything. Action covered Orders. Pinning Orders as well moved the same
 * collision one column left onto Status, where an opaque cell sliced the status chip
 * mid-word; pinning Status would have moved it onto Purpose. The pin was the bug, and
 * no pinning order was going to fix it.
 *
 * Measured on the render, and the numbers are the point. The panel is the viewport less
 * 385px with the rail open and less 193px folded. The table wanted 1182px, against
 * 1127px of panel at a 1512 viewport and 1055px at 1440 — past the threshold at every
 * laptop width this court has, which is why a chip that was in fact always clipped read
 * as an intermittent fault. Trimming the session control to its label (above) and the
 * action cell to its contents brings the table to 1086px, which fits outright from
 * about a 1471 viewport with the rail open, and from 1280 with it folded. Narrower than
 * that it scrolls, and the last column is cut at the port's own edge — which reads as
 * more to the right, where the same content covered mid-table read as broken. No cell
 * overlaps another at any width now, so the class of bug is gone rather than moved.
 *
 * `w-52` is the action group at the control metric — the session control's `min-w-32`,
 * the overflow trigger's `size-10`, one `gap-2` between them, and the cell's `px-4`.
 * `w-18` is the orders icon button plus that same padding.
 *
 * In a seat with no session controls the Action column is not rendered at all, so the
 * same table asks 878px and Orders is the last column. That fits inside the panel at
 * every laptop width this court has, rail open or folded — the scroll, and the last
 * column's cut edge with it, is the bench's case only.
 */
const ACTION_COLUMN_CLASS = "w-52 min-w-52";
const ORDERS_COLUMN_CLASS = "w-18";

/**
 * The cause title, as the way into that matter's case overview.
 *
 * It used to open a floating peek over the list, which was retired for the overview
 * page. So the row's one emphasised cell is what it always read as — a link to the
 * case — and it is now the only way to that page: Start hearing opens the same
 * sections in an overlay instead (`hearing-overview-dialog.tsx`). The two surfaces
 * render one composition, so the peek's real fault — the same facts said twice — does
 * not come back with it.
 *
 * Reading the case and calling it are still two different acts. This one only reads:
 * it does not mark the listing ongoing, and it is the one that has to survive a middle
 * click, a new tab and the back button, which is why it stays an anchor while the call
 * beside it is a button.
 *
 * It wears the same quiet-name dress as the queues' dialog openers, but stays an
 * anchor: this one navigates, and a destination has to be middle-clickable
 * (`ACCESSIBILITY.md` §2 — prefer the semantic element for the act).
 *
 * The caller supplies the box because the two call sites need different ones: in the
 * table it fills the cell as a 40×40 target, and in the phone list it sits inline
 * after the item number. Only the box is theirs — the dress is fixed here.
 */
export function HearingCaseLink({
  hearing,
  className,
}: {
  hearing: CourtHearing;
  className?: string;
}) {
  return (
    <Link
      href={`/employee/hearings/${hearing.id}`}
      {...rowOpener}
      className={cn(
        "rounded-sm text-body-compact font-medium text-foreground underline-offset-4 outline-none group-hover/row:underline focus-visible:underline focus-visible:ring-3 focus-visible:ring-focus-ring",
        className
      )}
    >
      {/* The cause title alone is the whole of what a sighted reader needs under a
          column headed "Case name"; out of that column it is a link named after two
          parties and nothing else. */}
      <span className="sr-only">Case overview for </span>
      {causeTitle(hearing)}
    </Link>
  );
}

export function HearingSessionButton({
  hearing,
  seat,
  onStartHearing,
  onEndHearing,
  className,
}: {
  hearing: CourtHearing;
  seat: CourtRole;
  onStartHearing: (hearing: CourtHearing) => void;
  onEndHearing: (hearing: CourtHearing) => void;
  className?: string;
}) {
  /* No slot in a seat that does not run the sitting — see above. The row still says
     where the matter stands; that is the Status chip's job and it was never this
     control's. */
  if (!seatHasBenchControls(seat)) return null;

  if (canStartHearing(hearing.status)) {
    return (
      /* A button, and no longer a link. Calling the matter used to navigate to that
         case's overview; it now marks the listing ongoing and opens the same overview
         over this list (`hearing-overview-dialog.tsx`), so the day the bench is working
         stays on the screen and the next item is one dismissal away. Reading a case
         without calling it is still a destination — that is the cause title on this
         row, which stays an anchor. */
      <Button
        type="button"
        variant="outline"
        className={cn(SESSION_SLOT_CLASS, className)}
        onClick={() => onStartHearing(hearing)}
      >
        Start hearing
      </Button>
    );
  }
  if (canEndHearing(hearing.status)) {
    return (
      <Button
        type="button"
        variant="outline"
        className={cn(SESSION_SLOT_CLASS, className)}
        onClick={() => onEndHearing(hearing)}
      >
        End hearing
      </Button>
    );
  }
  if (hearing.status === "passed-over") {
    return (
      <span className={cn("inline-flex h-10 items-center", className)}>
        <span className="sr-only">Passed over</span>
      </span>
    );
  }
  return (
    /* The sitting is done and there is nothing left to call: outline dress,
       disabled, the words *Hearing ended*. `disabled` rather than
       `aria-disabled` — a live precondition, not an unbuilt promise; the
       Completed chip on the row still carries the fact for a reader who
       cannot tab onto it. */
    <Button
      type="button"
      disabled
      variant="outline"
      className={cn(SESSION_SLOT_CLASS, className)}
    >
      Hearing ended
    </Button>
  );
}

/**
 * Pass over — skip this listing without completing it, to hear it on a later
 * date. Secondary to Start/End: ghost icon, one menu item, never a second
 * labelled button (ui-craft §2).
 *
 * The menu is overlay elevation via the DS primitive. Width is `w-auto
 * min-w-40` so a 40px trigger does not pinch the words (the primitive otherwise
 * inherits trigger width).
 */
export function HearingPassOverMenu({
  hearing,
  seat,
  onPassOver,
}: {
  hearing: CourtHearing;
  seat: CourtRole;
  onPassOver: (hearing: CourtHearing) => void;
}) {
  /* Pass over is one of the bench's three controls. It leaves with the other two
     rather than staying behind as the single bench act reachable from a smaller
     menu in a seat that has no session controls at all. */
  if (!seatHasBenchControls(seat)) return null;
  if (!canPassOver(hearing.status)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          aria-label={`More actions for item ${hearing.item}, ${causeTitle(hearing)}`}
        >
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuItem onSelect={() => onPassOver(hearing)}>
          Pass over
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Orders on this listing — the old cause list's document-with-plus column.
 *
 * `file-plus` is the DS allowlist match for that glyph: a sheet with a plus,
 * meaning draft or add an order for this matter. Opens the composer for this
 * listing. Issuing the order is still a real judicial act this build does not
 * perform; the composer itself says so.
 *
 * **When it opens depends on the seat, because what has to happen first does.** For a
 * seat that runs the sitting the control follows the sitting: a matter nobody has called
 * yet has no hearing to pass an order in, so on a scheduled row the icon holds the
 * column disabled and Start hearing beside it is what opens it (`canDraftOrder`). The
 * typist has no such control — this column is that seat's whole row — so there the trip
 * into the order is itself the sitting and a listing still on the day's call opens
 * (`canTypeOrder`). Both seats still close on a listing that was never heard.
 *
 * Disabled by the DS `disabled` prop rather than an `aria-disabled` mark, because this
 * is a live precondition and not a missing build — the same distinction as Sign selected
 * forms with nothing ticked.
 *
 * The reason lives in the accessible name: an icon-only control has no room to
 * carry it, and a tooltip cannot be hovered through the DS's
 * `disabled:pointer-events-none`. It names the status's own reason rather than the
 * seat's, because that is what a reader is being told about — a scheduled row is
 * waiting on the call, and a passed-over one is not going to get one today. Sighted
 * readers get it from the row: the chip and the start control sit inches away.
 *
 * `onOpen` is the caller's chance to act on the trip itself. The cause list uses it for
 * the typist, where walking into the order is what moves the matter; for the bench it is
 * not supplied and opening the composer changes nothing.
 *
 * `named` is for the one place the icon has nothing to lean on. In the table the column
 * header says *Orders* and the glyph is read under it; on a phone row there is no header,
 * and in the typist's seat this is the row's only control — a bare glyph with the name
 * only in `aria-label` leaves a sighted reader guessing at the one act the row has
 * (`ACCESSIBILITY.md` §8). So there it takes the session slot's dress and the words
 * instead: outline, text-only, at the control metric.
 */
export function HearingOrdersButton({
  hearing,
  seat,
  named = false,
  onOpen,
  className,
}: {
  hearing: CourtHearing;
  seat: CourtRole;
  /** Carry the words rather than the glyph — a row with no column header over it. */
  named?: boolean;
  onOpen?: (hearing: CourtHearing) => void;
  className?: string;
}) {
  const label = `Order for item ${hearing.item}, ${causeTitle(hearing)}`;
  /* One column, two preconditions — see above. */
  const open = seatHasBenchControls(seat)
    ? canDraftOrder(hearing.status)
    : canTypeOrder(hearing.status);
  const dressClass = named
    ? cn(SESSION_SLOT_CLASS, className)
    : cn("shrink-0 text-muted-foreground", className);
  const content = named ? "Open order" : <FilePlusIcon aria-hidden />;

  if (!open) {
    return (
      <Button
        type="button"
        disabled
        variant={named ? "outline" : "ghost"}
        size={named ? undefined : "icon"}
        className={dressClass}
        /* Named or not, the reason travels in the accessible name: the words say what
           the control is, not why it will not open. */
        aria-label={`${label} (${
          canStartHearing(hearing.status)
            ? "available once the hearing starts"
            : "the matter was not heard"
        })`}
      >
        {content}
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant={named ? "outline" : "ghost"}
      size={named ? undefined : "icon"}
      className={dressClass}
    >
      <Link
        href={`/employee/hearings/${hearing.id}/order`}
        aria-label={label}
        onClick={() => onOpen?.(hearing)}
      >
        {content}
      </Link>
    </Button>
  );
}

/**
 * Mobile stack: the start/end control, then Pass over, then orders.
 *
 * In the typist's seat the first two render nothing, so the row's actions are the orders
 * control alone — the same thing the table does by dropping a column, said in the shape
 * a phone row has. Standing alone it takes the words and the slot the session control
 * would have had, because a lone glyph on a card with no column header over it names
 * nothing.
 */
export function HearingRowActions({
  hearing,
  seat,
  onStartHearing,
  onEndHearing,
  onPassOver,
  onOpenOrder,
  className,
}: {
  hearing: CourtHearing;
  seat: CourtRole;
  onStartHearing: (hearing: CourtHearing) => void;
  onEndHearing: (hearing: CourtHearing) => void;
  onPassOver: (hearing: CourtHearing) => void;
  onOpenOrder?: (hearing: CourtHearing) => void;
  className?: string;
}) {
  const ordersIsTheRow = !seatHasBenchControls(seat);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <HearingSessionButton
        hearing={hearing}
        seat={seat}
        onStartHearing={onStartHearing}
        onEndHearing={onEndHearing}
        className="min-w-0 flex-1"
      />
      <HearingPassOverMenu
        hearing={hearing}
        seat={seat}
        onPassOver={onPassOver}
      />
      <HearingOrdersButton
        hearing={hearing}
        seat={seat}
        named={ordersIsTheRow}
        onOpen={onOpenOrder}
        className={ordersIsTheRow ? "min-w-0 flex-1" : undefined}
      />
    </div>
  );
}

/**
 * Today's cause list as a table: the court's serial, the cause, its number, who appears,
 * what it is listed for, where it stands, orders on this listing, and — for a seat that
 * runs the sitting — the call on it.
 *
 * **Eight columns in one seat, seven in the other.** The last one is the session
 * controls, so in a seat that has none the column goes with them rather than staying on
 * as a caption: a column headed Action with nothing actionable under it is the header
 * lying, and one headed Hearing that spells out the Status chip beside it is the same
 * fact twice (owner, 2026-09-09 — "that is redundant"). Orders is then the last column,
 * and it is that seat's one act per row.
 *
 * The panel shell (border, fill, shadow) lives on the screen around this, so the table is
 * one panel rather than a box inside a box.
 */
export function HearingsTable({
  rows,
  seat,
  onStartHearing,
  onEndHearing,
  onPassOver,
  onOpenOrder,
}: {
  rows: CourtHearing[];
  seat: CourtRole;
  onStartHearing: (hearing: CourtHearing) => void;
  onEndHearing: (hearing: CourtHearing) => void;
  onPassOver: (hearing: CourtHearing) => void;
  onOpenOrder?: (hearing: CourtHearing) => void;
}) {
  /* One question, asked once: whether this seat gets the session column at all. The
     header cell, the row cell and the header well's spacer row all have to agree, and a
     spacer that spans the wrong number of columns leaves the well's rounded corner
     hanging over open table. */
  const hasSessionColumn = seatHasBenchControls(seat);
  const columnCount = hasSessionColumn ? 8 : 7;

  return (
    <Table className="w-full border-separate border-spacing-0 text-body-compact">
      <TableHeader>
        <TableRow className={TABLE_HEAD_ROW}>
          <TableHead className={cn(TABLE_HEAD, "w-16 whitespace-nowrap")}>
            S. no.
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-40 whitespace-normal")}>
            Case name
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "whitespace-nowrap")}>
            Case number
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-48 whitespace-nowrap")}>
            Advocates
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-32 whitespace-normal")}>
            Purpose
          </TableHead>
          <TableHead className={cn(TABLE_HEAD, "min-w-32 whitespace-nowrap")}>
            Status
          </TableHead>
          <TableHead
            className={cn(TABLE_HEAD, ORDERS_COLUMN_CLASS, "whitespace-nowrap")}
          >
            Orders
          </TableHead>
          {/* The call on this sitting, in the seat that makes it. Named for what is in
              it, and absent where there is nothing to put in it. */}
          {hasSessionColumn ? (
            <TableHead
              className={cn(TABLE_HEAD, ACTION_COLUMN_CLASS, "whitespace-nowrap")}
            >
              Action
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody className={tableBodyClass()}>
        {/* The header is a well, not a band welded to the rows — it needs the panel's
            fill under it or its rounded bottom corners read as cut off (ui-craft §4).
            `border-separate` has no per-edge row gap, so the gap is one inert row held
            out of the accessibility tree. */}
        <tr aria-hidden="true">
          <td colSpan={columnCount} className="h-2 p-0" />
        </tr>
        {rows.map((hearing) => (
          <TableRow key={hearing.id} {...rowActivation(tableRowClass())}>
            <TableCell
              className={cn(TABLE_CELL, "w-16 tabular-nums text-muted-foreground")}
            >
              {hearing.item}
            </TableCell>
            {/* The row's one emphasised cell. Opens this matter's case overview as a
                page, without calling the matter. */}
            <TableCell
              className={cn(TABLE_CELL, "min-w-40 font-medium whitespace-normal")}
            >
              {/* Fills the cell so the target is the row's height, not the 20px
                  line box the text happens to occupy (`ACCESSIBILITY.md` §8).
                  `flex`, not `inline-flex`: an inline box would shrink-wrap and
                  fight the cell's `whitespace-normal` wrapping. */}
              <HearingCaseLink
                hearing={hearing}
                className="flex min-h-10 w-full items-center"
              />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "whitespace-nowrap")}>
              <Identifier value={hearing.caseNumber} label="case number" />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-48 whitespace-nowrap")}>
              <CounselCell
                complainant={counselFor(hearing, "complainant").map(
                  (counsel) => counsel.name,
                )}
                accused={counselFor(hearing, "accused").map(
                  (counsel) => counsel.name,
                )}
                dense
              />
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-32 whitespace-normal")}>
              {courtHearingPurposeLabel(hearing.purpose)}
            </TableCell>
            <TableCell className={cn(TABLE_CELL, "min-w-32 whitespace-nowrap")}>
              <Badge
                variant={courtHearingStatusVariant(hearing.status)}
                className="w-fit"
              >
                {courtHearingStatusLabel(hearing.status)}
              </Badge>
            </TableCell>
            <TableCell
              className={cn(TABLE_CELL, ORDERS_COLUMN_CLASS, "whitespace-nowrap")}
            >
              <div className="flex justify-center">
                <HearingOrdersButton
                  hearing={hearing}
                  seat={seat}
                  onOpen={onOpenOrder}
                />
              </div>
            </TableCell>
            {hasSessionColumn ? (
              <TableCell
                className={cn(TABLE_CELL, ACTION_COLUMN_CLASS, "whitespace-nowrap")}
              >
                <div className="flex items-center gap-2">
                  <HearingSessionButton
                    hearing={hearing}
                    seat={seat}
                    onStartHearing={onStartHearing}
                    onEndHearing={onEndHearing}
                  />
                  <HearingPassOverMenu
                    hearing={hearing}
                    seat={seat}
                    onPassOver={onPassOver}
                  />
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
