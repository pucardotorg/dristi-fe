"use client";

import * as React from "react";
import { FileSignatureIcon, SearchXIcon } from "lucide-react";

import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { CourtFilters } from "@/components/employee/court-filters";
import { SignBulkConfirmDialog } from "@/components/employee/sign-bulk-confirm-dialog";
import { SignOrderDialog } from "@/components/employee/sign-order-dialog";
import { SignOrdersTable } from "@/components/employee/sign-orders-table";
import { QueueItemRow } from "@/components/employee/queue-item-row";
import {
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  causeTitle,
  formatListingDate,
  isoDay,
  parseIsoDay,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  DEFAULT_SIGN_ORDER_FILTERS,
  SIGN_ORDER_QUEUE,
  SIGN_ORDER_STATUSES,
  filterSignOrders,
  formatSignOrderDate,
  signOrderStatusLabel,
  signOrderTypeLabel,
  signSelectedOrders,
  todayIsoDay,
  type SignOrder,
  type SignOrderFilters,
} from "@/lib/employee/sign-orders";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Sign orders — the orders this bench has drawn up and not yet signed.
 *
 * Deliberately the same screen as the signing queue for forms one row above it in the
 * rail, and as the three review queues before that: the page title stands on the page,
 * and **one** lifted panel holds the filters, the table and the pagination footer
 * together. Same panel recipe, same `gap-6` / `p-6`, same table treatment, same empty
 * states, literally the same footer component. A bench moving between the rail's rows is
 * looking at one court's work through several windows, and should not have to re-learn
 * the furniture in between.
 *
 * What this screen adds is the act. Signing is the one court-side job the reference does
 * in bulk, so selection lives in the table and the commit lives in a sticky bar — the
 * shape `BulkRescheduleScreen` already established for an act committed once over a list
 * longer than a screen. Clicking a row (the case name, or anywhere but the checkbox)
 * opens the order first, the way Sign forms does, because a bench that cannot read what
 * it is signing should not be offered a signature. Sign and publish then asks how — e-sign
 * or upload — the same second step the forms queue already runs.
 *
 * The status filter opens on Pending signature, as the reference draws it: the bench
 * comes here to clear work. Signed orders stay reachable through the same filter rather
 * than disappearing, so an order signed last month can be read without leaving.
 *
 * **Nothing is signed or published.** Both paths only move a row's status in the demo
 * queue — see `lib/employee/sign-orders.ts`.
 */
export function SignOrdersScreen() {
  /* The queue is state because signing changes it. One list, so the table, the rail
     count on the next render and the bar can never disagree about what is still
     pending. */
  const [orders, setOrders] = React.useState<SignOrder[]>(SIGN_ORDER_QUEUE);
  /* One state, not a draft and an applied one: the list answers the controls as they
     are used — every one of them, so the screen has a single rule rather than a live
     one and a deferred one. Every change resets to page one; the old Search button did
     that, and a keystroke that narrows the list to four rows must not leave the reader
     on page three of nothing. */
  const [filters, setFilters] = React.useState<SignOrderFilters>(
    DEFAULT_SIGN_ORDER_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<SignOrder | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  /* The bulk confirmation hands focus back here on the way out — see its `triggerRef`. */
  const signRef = React.useRef<HTMLButtonElement>(null);

  const pending = orders.filter(
    (order) => order.status === "pending-signature",
  );
  const rows = filterSignOrders(orders, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered =
    filters.status !== DEFAULT_SIGN_ORDER_FILTERS.status ||
    filters.addedOn !== "" ||
    filters.query !== "";

  /* What the bar will actually sign: the selection, minus anything that has since been
     signed or filtered out of existence. A stale id is dropped rather than counted. */
  const selected = pending.filter((order) => selectedIds.has(order.id));
  const signableInView = pageRows.filter(
    (order) => order.status === "pending-signature",
  ).length;

  function changeFilters(next: SignOrderFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(DEFAULT_SIGN_ORDER_FILTERS);
  }

  function toggle(order: SignOrder) {
    setNotice("");
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  }

  /** The header checkbox: every signable row in view, or none of them. */
  function toggleAllInView(select: boolean) {
    setNotice("");
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const order of pageRows) {
        if (order.status !== "pending-signature") continue;
        if (select) next.add(order.id);
        else next.delete(order.id);
      }
      return next;
    });
  }

  /**
   * The act, from either path. It marks the orders signed in this demo queue, clears the
   * selection it consumed and says what it did — nothing leaves the browser.
   */
  function sign(ids: ReadonlySet<string>) {
    const count = orders.filter(
      (order) => ids.has(order.id) && order.status === "pending-signature",
    ).length;
    if (count === 0) return;
    setOrders((current) => signSelectedOrders(current, ids, todayIsoDay()));
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
    setNotice(
      `${count} ${plural(count, "order is", "orders are")} marked signed on this screen. Nothing was published.`,
    );
  }

  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold">
          Sign orders
        </h1>
        {/* The count is the whole point of the queue, so the supporting line carries it
            rather than restating the title. Singular is spelled out because "1 orders"
            is the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {pending.length === 1
            ? "1 order is waiting for your signature."
            : `${pending.length} orders are waiting for your signature.`}
        </p>
      </header>

      {/* One panel: filters, list and footer are one unit of work, so they share one
          lifted sheet — the same recipe every other court-side queue uses. Nothing
          inside draws a second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <SignOrderFiltersForm
          filters={filters}
          searchRef={searchRef}
          onChange={changeFilters}
          onClear={clearFilters}
        />

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <SignOrdersEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page
                sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Six columns do not survive a phone. Below `md` the same rows stack as
                  items — the answer the rest of the court side already gives. */}
              <div className="hidden md:block">
                <SignOrdersTable
                  rows={pageRows}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onToggleAll={toggleAllInView}
                  onOpen={setOpen}
                />
              </div>
              <div className="md:hidden">
                <SignOrdersItemList
                  rows={pageRows}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onOpen={setOpen}
                />
              </div>
            </div>

            <ListFooter
              id="sign-orders-page-size"
              from={start + 1}
              to={start + pageRows.length}
              total={rows.length}
              page={currentPage}
              pageCount={pageCount}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>

      {selected.length > 0 || signableInView > 0 ? (
        <SignBar
          count={selected.length}
          notice={notice}
          onRequestSign={() => setBulkOpen(true)}
          signRef={signRef}
        />
      ) : null}

      {/* Confirm the count, then say what became of it — the shared bulk confirmation
          every signing queue runs. It hangs off the screen rather than off the bar,
          because signing the last signable row in view takes the bar away with it. */}
      <SignBulkConfirmDialog
        noun="order"
        count={selected.length}
        selection={{
          cases: selected.map((order) => order.caseNumber),
          kinds: selected.map((order) => signOrderTypeLabel(order.type)),
        }}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        triggerRef={signRef}
        onConfirm={() => sign(selectedIds)}
        onReturnFocus={returnFocus}
      />

      <SignOrderDialog
        order={open}
        onOpenChange={setOpen}
        onSign={(order) => {
          sign(new Set([order.id]));
          setOpen(null);
        }}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * Status, date and free text, then search — the reference's three controls, in the
 * reference's order, laid out the way the sibling queues lay out theirs.
 *
 * Every control carries a visible label. The reference labels the search box with the
 * things it searches, which is a hint rather than a name; ACCESSIBILITY §12 wants a
 * permanent label, so "Search cases" is the deviation, and the smallest one available.
 * The placeholder keeps the reference's own words.
 *
 * "Search" is `secondary` here, not the teal one. The Ration Teal Law allows one strong
 * action per view and this screen spends it on the act it exists for — the signature in
 * the bar below. `HearingsFilters` makes the same trade for the same reason.
 */
function SignOrderFiltersForm({
  filters,
  searchRef,
  onChange,
  onClear,
}: {
  filters: SignOrderFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: SignOrderFilters) => void;
  onClear: () => void;
}) {
  return (
    <CourtFilters
      search={{
        label: "Search cases",
        value: filters.query,
        onChange: (query) => onChange({ ...filters, query }),
        placeholder: "Case name or number",
      }}
      searchRef={searchRef}
      fields={[
        {
          id: "sign-orders-status",
          label: "Status",
          value: filters.status,
          all: "all",
          allLabel: "All statuses",
          options: SIGN_ORDER_STATUSES.map((status) => ({
            value: status.id,
            label: status.label,
          })),
          onApply: (value) =>
            onChange({ ...filters, status: value as SignOrderFilters["status"] }),
        },
      ]}
      date={{
        label: "Date added",
        value: filters.addedOn ? parseIsoDay(filters.addedOn) : undefined,
        active: filters.addedOn !== "",
        chipLabel: filters.addedOn ? formatListingDate(filters.addedOn) : "",
        draftActive: (value) => !!value,
        cleared: undefined,
        onApply: (value) =>
          onChange({ ...filters, addedOn: value ? isoDay(value) : "" }),
      }}
      onClearAll={onClear}
    />
  );
}

/**
 * What is selected, and the act itself.
 *
 * Sticky, because the list it commits is longer than a screen and a button that scrolls
 * away from its own selection is a button the bench has to hunt for. Chrome, so it is
 * `bg-card` over a hairline seam and never carries the panel's full-strength edge
 * (ui-craft §4, layer 2); the negative margins let it span the page's own padding.
 * `z-30` is the chrome layer this app already uses — the top bar and the filing footer
 * both sit there.
 *
 * The line beside the button is `aria-live`, so a screen reader hears the selection
 * change, and what signing did, without going looking for either.
 */
function SignBar({
  count,
  notice,
  onRequestSign,
  signRef,
}: {
  count: number;
  notice: string;
  /** Opens the shared confirmation. The act itself lives on the screen. */
  onRequestSign: () => void;
  /** Handed down so the confirmation can give the keyboard back to this button. */
  signRef: React.Ref<HTMLButtonElement>;
}) {
  const summary =
    notice ||
    (count === 0
      ? "Select the orders to sign."
      : `${count} ${plural(count, "order", "orders")} selected.`);

  return (
    <div className="sticky bottom-0 z-30 -mx-6 -mb-6 border-t border-hairline bg-card px-6 py-3 md:-mx-8 md:-mb-8 md:px-8 md:py-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p
          className="mr-auto text-body-compact text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {summary}
        </p>

        <Button
          ref={signRef}
          type="button"
          disabled={count === 0}
          className="w-full sm:w-fit"
          onClick={onRequestSign}
        >
          {count > 0
            ? `Sign ${count} ${plural(count, "order", "orders")}`
            : "Sign selected orders"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a filter that matched nothing is a dead
 * end with an action worth offering, while an empty pending queue is the bench being up
 * to date — the same good-empty the sibling queues use. Borderless and unpadded; the
 * panel is already the frame.
 */
function SignOrdersEmpty({
  isFiltered,
  onClear,
}: {
  isFiltered: boolean;
  onClear: () => void;
}) {
  return (
    <Empty className="border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isFiltered ? (
            <SearchXIcon aria-hidden />
          ) : (
            <FileSignatureIcon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered ? "No orders match these filters" : "Nothing to sign"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No order matches the status, date or search you asked for."
            : "Every order this court has drawn up has been signed."}
        </EmptyDescription>
      </EmptyHeader>
      {isFiltered ? (
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/**
 * The same rows below `md`, stacked.
 *
 * The checkbox and the opener stay separate controls here too, for the same reason they
 * do in the table: one tap cannot mean both. The checkbox takes the leading column at
 * its full 40px target, and a tap anywhere else on the card opens the order — the case
 * name is the keyboard button, matching Sign forms, with the title, number and date
 * under it spelled out because there is no column header to name them.
 */
function SignOrdersItemList({
  rows,
  selectedIds,
  onToggle,
  onOpen,
}: {
  rows: SignOrder[];
  selectedIds: ReadonlySet<string>;
  onToggle: (order: SignOrder) => void;
  onOpen: (order: SignOrder) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((order) => {
        const pending = order.status === "pending-signature";
        const title = signOrderTypeLabel(order.type);
        return (
          <QueueItemRow
            key={order.id}
            className="flex gap-3"
          >
            {/* The DS box expands its own hit area to 40×40; the name it carries is the
                order and its case, not the column, because a row read aloud has no
                column header. A signed order has nothing to select. */}
            {pending ? (
              <span className="pt-0.5">
                <Checkbox
                  checked={selectedIds.has(order.id)}
                  onCheckedChange={() => onToggle(order)}
                  aria-label={`Select ${title} in ${order.caseNumber}`}
                />
              </span>
            ) : (
              /* A signed order has nothing to select, but it keeps the box's width so
                 the titles down the list still start on one line. */
              <span className="size-4 shrink-0" aria-hidden />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpen(order)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">
                  {pending ? "Read and sign " : "Read "}
                  {title} in{" "}
                </span>
                {causeTitle(order)}
              </button>
              <p className="min-w-0 text-body-compact">{title}</p>
              <p className="text-caption text-muted-foreground">
                <span className="tabular-nums">{order.caseNumber}</span>
                {" · Added "}
                <span className="tabular-nums">
                  {formatSignOrderDate(order.addedOn)}
                </span>
              </p>
              <Badge variant={pending ? "warning" : "success"} className="w-fit">
                {signOrderStatusLabel(order.status)}
              </Badge>
            </div>
          </QueueItemRow>
        );
      })}
    </ul>
  );
}
