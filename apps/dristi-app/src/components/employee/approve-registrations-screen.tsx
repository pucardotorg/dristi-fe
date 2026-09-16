"use client";

import * as React from "react";
import { SearchXIcon, UserCheckIcon } from "lucide-react";

import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { RegistrationDialog } from "@/components/employee/approve-registrations-dialog";
import { RegistrationsTable } from "@/components/employee/approve-registrations-table";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PAGE_SIZE, type HearingsPageSize } from "@/lib/employee/hearings";
import {
  EMPTY_REGISTRATIONS_FILTERS,
  REGISTRATIONS_QUEUE,
  filterRegistrations,
  formatDaysWaitingSpoken,
  nextInQueue,
  registrationWaitTone,
  accountTypeVariant,
  requestKindLabel,
  roleLabel,
  APPROVE_REGISTRATIONS_TITLE,
  type RegistrationRequest,
  type RegistrationsFilters,
  type WaitTone,
} from "@/lib/employee/approve-registrations";
import { cn } from "@/lib/utils";

const waitClass: Record<WaitTone, string> = {
  plain: "",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
};

/**
 * Approve registrations — the registration requests waiting on this court's scrutiny officer.
 *
 * Deliberately the same screen as its siblings in the rail: the page title stands on the
 * page, and **one** lifted panel holds the search, the table and the pagination footer
 * together. Same panel recipe, same `gap-6` / `p-6`, same table treatment, same empty
 * states, literally the same footer component. An officer moving from "Register cases" to
 * this row should not have to re-learn the furniture in between.
 *
 * What this screen adds is a decision taken **without leaving the list**. The legacy path
 * was row → Verify → a detail page → Accept → a confirmation → a success dialog → "Go to
 * home": six steps per request and a trip back to a home nobody asked for, at the
 * reference's own count of thirty-nine pending. Here the application number opens an
 * overlay, the officer decides in it, the row leaves, the overlay settles on what happened
 * and offers the next request — so a queue can be cleared without coming back to the list
 * — and when it closes the search box takes the focus back.
 *
 * **There is no bulk path, and that is the one place this screen breaks from its nearest
 * sibling.** `ApproveCopyApplicationScreen` clears its queue with checkboxes and a sticky
 * bar, because there the evidence is a document the court itself composed. Here the
 * evidence is a photograph of a Bar ID card, collected for the sole reason that a human
 * looks at it (handover `REG-14`), and the outcome is a credential: the person may then
 * act as an advocate on real §138 files. A control that let an officer clear thirty-nine
 * registrations without opening a single photograph would void the only identity check
 * the product has. Clearing the queue is therefore slow by construction.
 *
 * **Nothing here is approved or refused.** Both paths drop their rows from the demo queue
 * and nothing else — see `lib/employee/approve-registrations.ts`. No account is opened, no
 * access is granted or withheld, no reason is sent, and nothing persists past a reload.
 */
export function ApproveRegistrationsScreen() {
  /* One state, not a draft and an applied one: the list answers the box as it is typed,
     so there is never a moment where what the officer has written and what the table is
     showing disagree. Every change resets to page one — the old Search button did that,
     and a keystroke that narrows thirty-nine requests to four must not leave the reader
     on page three of nothing. */
  const [filters, setFilters] = React.useState<RegistrationsFilters>(
    EMPTY_REGISTRATIONS_FILTERS,
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [decidedIds, setDecidedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<RegistrationRequest | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  const remaining = REGISTRATIONS_QUEUE.filter(
    (request) => !decidedIds.has(request.id),
  );
  const rows = filterRegistrations(remaining, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const isFiltered = filters.query.trim() !== "";

  function changeFilters(next: RegistrationsFilters) {
    setFilters(next);
    setPage(1);
  }

  function clearFilters() {
    changeFilters(EMPTY_REGISTRATIONS_FILTERS);
  }

  /** Both decisions end here: the row leaves the demo queue, and nothing else happens. */
  function removeFromQueue(id: string, spoken: string) {
    setDecidedIds((current) => new Set(current).add(id));
    setAnnouncement(spoken);
  }

  /* The overlay stays open through both: it ends on a settled stage that says what
     happened and offers the next request, and the row has already left the list behind
     it (`nextInQueue` is read off `rows`, which no longer holds this one). */
  function approveOne(request: RegistrationRequest) {
    removeFromQueue(
      request.id,
      `${request.applicationNumber} approved on this screen and removed from the queue. No account was opened and nobody was told.`,
    );
  }

  function rejectOne(request: RegistrationRequest) {
    removeFromQueue(
      request.id,
      `${request.applicationNumber} rejected on this screen and removed from the queue. The reason was not sent to anyone.`,
    );
  }

  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    /* **The beige canvas — the product default** (owner, 2026-09-11). Built here first as
       an iteration the owner could say no to; they kept it and made it the default for
       every work surface (ui-craft §1.0).

       Warm neutral-2 — the rail's own tone — so page and rail are one ground and the white
       panel is the only lifted thing on the screen. The top bar stays `bg-card`, so the
       chrome still reads as chrome. Dark keeps `bg-background`, because `muted` sits above
       `card` there and a tinted canvas would invert the depth. */
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        {/* **"Approve registrations"**, not "Approve registrations" (owner, 2026-09-11: the
            queue is advocates *and* their clerks, so the old title named half of it). Verb
            and object, like every other row in the Actions group — "Register cases",
            "Approve copy application" — and "approve" because it is the word the screen
            already speaks in: *Pending approval*, *Confirm approval*, *waiting for
            approval*. The officer rejects here too, the way they refuse copies under
            "Approve copy application"; the group names each queue by what it exists to
            grant. `APPROVE_REGISTRATIONS_TITLE` is shared with the rail and the tab, so the
            three can never disagree. */}
        <h1 className="text-title text-balance font-semibold">
          {APPROVE_REGISTRATIONS_TITLE}
        </h1>
        {/* The count is the whole point of the queue, so the supporting line carries it
            rather than restating the title. Singular is spelled out because
            "1 registrations" is the kind of thing a court notices. */}
        <p className="text-body text-muted-foreground">
          {remaining.length === 1
            ? "1 registration is waiting for approval."
            : `${remaining.length} registrations are waiting for approval.`}
        </p>
      </header>

      {/* One panel: search, list and footer are one unit of work, so they share one lifted
          sheet — the same recipe every other court-side list uses. Nothing inside draws a
          second frame. */}
      <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
        <RegistrationFilters
          filters={filters}
          searchRef={searchRef}
          onChange={changeFilters}
        />

        {/* Mounted whatever the list is doing, including empty — see `QueueAnnouncer`. */}
        <QueueAnnouncer
          from={start + 1}
          to={start + pageRows.length}
          total={rows.length}
        />

        {pageRows.length === 0 ? (
          <RegistrationsEmpty isFiltered={isFiltered} onClear={clearFilters} />
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {/* min-w-0 lets this flex item shrink below the table's content width, so a
                wide table scrolls inside the panel instead of pushing the page sideways. */}
            <div className="min-w-0 overflow-x-auto">
              {/* Five columns do not survive a phone, and they do not survive a laptop
                  either. Measured on the render: the table's natural width is ~780px, and
                  what the panel actually offers is the viewport less the 256px rail, the
                  page's `p-8` and the panel's `p-6` — 656px at 1024. The column that goes
                  over the right edge is `Days waiting`: the one tied to a statutory clock,
                  and the key the queue is read by. A wait an officer has to scroll
                  sideways to reach is a wait they will not see.
                  So the swap is at `xl`, two steps later than the sibling queues rather
                  than one. `lg` was the obvious cut and it is the wrong one — at exactly
                  1024 the table comes back and is still clipped; the whole table first
                  fits somewhere around 1150, and `xl` is the next rung of the ladder past
                  that (RESPONSIVE.md: use the prefix, do not hardcode a pixel breakpoint).
                  Below it the stacked items carry every one of these facts and spell the
                  wait out in words. (The sibling tables are five columns too and clip the
                  same way; whether they move with this one is their own change.) */}
              <div className="hidden xl:block">
                <RegistrationsTable rows={pageRows} onOpen={setOpen} />
              </div>
              <div className="xl:hidden">
                <RegistrationItemList rows={pageRows} onOpen={setOpen} />
              </div>
            </div>

            <ListFooter
              id="approve-registrations-page-size"
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

      {/* What actually changed, for anyone not watching the list. A decision that only
          shows as a row disappearing is silent to a screen reader. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <RegistrationDialog
        request={open}
        next={open ? nextInQueue(rows, open) : null}
        onOpenChange={setOpen}
        onApprove={approveOne}
        onReject={rejectOne}
        onNext={setOpen}
        onReturnFocus={returnFocus}
      />
    </div>
  );
}

/**
 * One text box, filtering as it is typed — the whole filter row.
 *
 * The reference sliced this queue by *User Type*, whose only value on this screen is
 * Advocate, and by *Application Number* alone, which is the one identifier an officer is
 * least likely to be holding. Neither completes a sentence anybody would say. What
 * replaces both is a single box reaching the name, the Bar registration ID and the
 * application number, because which of the three the officer has depends only on how the
 * question reached them. The visible label is "Search requests" so it does not promise
 * less than it does (ACCESSIBILITY §12 wants a permanent label either way).
 *
 * The Search button is gone. With one box there is nothing to compose before asking, so
 * it only ever stood between the officer and the answer — and at thirty-nine pending it
 * stood there once per lookup. The way back to the whole queue is the `×` inside the box
 * (`QueueSearchField`), which is why there is no "Clear search" beside it either: on this
 * screen the search *is* the filters, and two controls for one undo is one too many.
 *
 * **The page now has no teal at all, and the brief already argued that it should not.**
 * Search was its only `bg-primary`; D9 says the Ration Teal Law has nothing to spend it
 * on here, because this page has no page-level act — there is no bulk approve (see the
 * screen doc), and the decision is taken in the overlay, where the teal is Approve.
 * Nothing was promoted to fill the gap.
 *
 * The form element stays so Enter in the box is swallowed rather than reloading the page:
 * a lone text input inside a `<form>` submits implicitly, and there is no submit handler
 * left to catch it.
 */
function RegistrationFilters({
  filters,
  searchRef,
  onChange,
}: {
  filters: RegistrationsFilters;
  searchRef: React.Ref<HTMLInputElement>;
  onChange: (filters: RegistrationsFilters) => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => event.preventDefault()}
    >
      <QueueSearchField
        label="Search requests"
        className="sm:w-96"
        ref={searchRef}
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder="Name, registration number or application number"
      />
    </form>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Two different facts, so two different states: a search that matched nothing is a dead
 * end with an action worth offering, while an empty queue is the office being up to date —
 * the same good-empty the sibling queues use. No action is offered on that one, because
 * there is nothing for the court to do: every row in this queue arrives from the other
 * side of the product. Borderless and unpadded; the panel is already the frame.
 */
function RegistrationsEmpty({
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
            <UserCheckIcon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {isFiltered
            ? "No requests match this search"
            : "No registrations waiting"}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {isFiltered
            ? "No request waiting for approval matches the name, registration number or application number you searched for."
            : "Everyone who has applied to this court has been dealt with."}
        </EmptyDescription>
      </EmptyHeader>
      {isFiltered ? (
        <EmptyContent>
          <Button variant="outline" onClick={onClear}>
            Clear search
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/**
 * The same rows below `xl`, stacked.
 *
 * A queue read on a phone, a tablet or a narrow laptop is still who is waiting, what they
 * claim and how long they have been kept — and the officer can still open and decide one,
 * because a phone that could only read this list would be a phone that cannot do the work. The
 * column headers are gone, so each fact is spelled out where the header would have said
 * it — which is why the wait reads "19 days waiting" here and not "19".
 */
function RegistrationItemList({
  rows,
  onOpen,
}: {
  rows: RegistrationRequest[];
  onOpen: (request: RegistrationRequest) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((request) => {
        const kind = requestKindLabel(request);
        return (
          <li
            key={request.id}
            {...rowActivation(
              "flex flex-col gap-2 rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong",
            )}
          >
            <button
              type="button"
              onClick={() => onOpen(request)}
              {...rowOpener}
              className={cn(rowOpenerClass, "tabular-nums")}
            >
              <span className="sr-only">Review </span>
              {request.applicationNumber}
            </button>
            <p
              className="min-w-0 text-body-compact"
              lang={request.fullNameLang}
            >
              {request.fullName}
            </p>
            <p className="text-caption text-muted-foreground">
              <span className="tabular-nums">{request.registrationNumber}</span>
              {" · "}
              <span
                className={cn(
                  "tabular-nums",
                  waitClass[registrationWaitTone(request.daysWaiting)],
                )}
              >
                {formatDaysWaitingSpoken(request.daysWaiting)}
              </span>
            </p>
            {/* As in the table: the account type is the one pill, and the request type
                is text beside it. One presentation per fact across both layouts. */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={accountTypeVariant(request.registrantKind)}>
                {roleLabel(request.registrantKind)}
              </Badge>
              {kind ? (
                <span className="text-caption text-muted-foreground">
                  {kind}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
