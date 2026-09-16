"use client";

import * as React from "react";
import {
  ArrowRightIcon,
  FileCheck2Icon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import { ListFooter } from "@/components/employee/list-footer";
import { QueueAnnouncer } from "@/components/employee/queue-announcer";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { SignBulkConfirmDialog } from "@/components/employee/sign-bulk-confirm-dialog";
import { SignProcessDialog } from "@/components/employee/sign-process-dialog";
import { SignProcessTable } from "@/components/employee/sign-process-table";
import {
  rowActivation,
  rowOpener,
  rowOpenerClass,
} from "@/lib/employee/row-activation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isPendingFilterChange } from "@/lib/employee/filter-state";
import {
  causeTitle,
  isoDay,
  parseIsoDay,
  PAGE_SIZE,
  type HearingsPageSize,
} from "@/lib/employee/hearings";
import {
  advanceProcesses,
  courtProcessTypeInline,
  courtProcessTypeLabel,
  COURT_PROCESS_TYPES,
  defaultProcessFilters,
  downloadProcessBundle,
  DEFAULT_PROCESS_STAGE,
  filterProcesses,
  formatProcessDate,
  groupSelectionByCase,
  PROCESS_CHANNELS,
  PROCESS_LINE,
  PROCESS_STAGES,
  processChannelLabel,
  processesAdvancing,
  processesAt,
  processesElsewhere,
  processIdsForCase,
  processStage,
  singleCaseMatch,
  rebaseFilters,
  todayIsoDay,
  type CourtProcess,
  type ProcessFilters,
  type SelectedCase,
  type ProcessStage,
  type ProcessStageId,
} from "@/lib/employee/sign-process";

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

/**
 * Sign process — every summons, notice, warrant and proclamation this court has issued
 * and has still to get out of the building.
 *
 * The other four rows in the rail's Sign group are queues: one act, one list, gone. This
 * one is a **line**, and the reference screens draw it as five tabs because a process
 * moves — its registered-post cover is collected, it is sent for signature, it is
 * signed, it is dispatched, and the channel reports back. Left to right is the direction
 * of travel, and the screen opens on the end nothing has been done to.
 *
 * Everything below the tab strip is the court-side furniture the rest of the rail
 * already uses, unchanged: the page title on the page, then **one** lifted panel holding
 * the filters, the table and the pagination footer together. Same panel recipe, same
 * `gap-6` / `p-6`, same table treatment, same empty states, literally the same footer
 * component. A bench moving between the rail's rows is looking at one court's work
 * through several windows and should not have to re-learn the furniture in between.
 *
 * **What changes between tabs is only what the stage makes change** — the fourth
 * column's heading and the day under it, whether the hearing-date filter is offered,
 * and which act sits in the bar. All three are read off `PROCESS_STAGES`, so a stage is
 * a row of data rather than a branch in this file.
 *
 * **Selection does not survive a tab change.** Eight rows checked for signature mean
 * nothing under Sent, and an act carried across tabs would be the wrong verb applied to
 * the wrong rows. Changing tab clears the selection, the filters and the page.
 *
 * **Nothing is signed, sent or served.** Every act moves a row's stage in the demo line
 * and stamps a day — see `lib/employee/sign-process.ts`.
 */
export function SignProcessScreen() {
  /* The line is state because every act changes it. One list, so the five tabs, the rail
     count on the next render and the bar can never disagree about where a row is. */
  const [line, setLine] = React.useState<CourtProcess[]>(PROCESS_LINE);
  const [stageId, setStageId] = React.useState<ProcessStageId>(
    DEFAULT_PROCESS_STAGE,
  );
  const stage = processStage(stageId);

  /* One state, not a draft and an applied one: the line answers the controls as they are
     used — type, channel, returnable day and free text alike, so the row has one rule
     rather than four controls on two. Every change resets to page one; the old Search
     button did that, and a keystroke that narrows the tab to four rows must not leave the
     clerk on page three of nothing. */
  const [filters, setFilters] = React.useState<ProcessFilters>(() =>
    defaultProcessFilters(stage),
  );
  const [pageSize, setPageSize] = React.useState<HearingsPageSize>(PAGE_SIZE);
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [open, setOpen] = React.useState<CourtProcess | null>(null);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  /* What the last Enter did with the cover in the clerk's hand. Spoken, not shown — the
     chip arriving in the tray is what says it on screen. */
  const [picked, setPicked] = React.useState("");
  /* What the act just moved, so the confirmation's success step can still offer the
     papers. Ids rather than rows: by the time that button can be pressed the rows have
     been stamped, and a copy taken before the act would hand the bench ten processes
     that still say they are waiting to be signed. */
  const [actedIds, setActedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const searchRef = React.useRef<HTMLInputElement>(null);
  /* The bulk confirmation hands focus back here on the way out — see its `triggerRef`. */
  const actRef = React.useRef<HTMLButtonElement>(null);

  const stageRows = processesAt(line, stageId);
  const rows = filterProcesses(stageRows, filters);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const defaults = defaultProcessFilters(stage);
  /* Still the shared check, and still the question it was written for: whether what the
     table is showing is narrower than the tab's own default view. Only the *other* caller
     — a Search button asking whether it had work to do — is gone. */
  const isFiltered = isPendingFilterChange(filters, defaults);

  /* What the bar will act on: the selection, minus anything that has since moved on. A
     stale id is dropped rather than counted. */
  const selected = stageRows.filter((process) => selectedIds.has(process.id));

  /* The same selection counted the way the clerk counts it — by envelope. One cover per
     case, so a case is an envelope however much process is inside it.

     Derived plainly, the way `rows` and `selected` above it are. A `useMemo` here is
     refused whatever its body does — `stageRows` comes back from an imported call and is
     handed to more of them, so the compiler can never establish that nothing mutates it,
     and a dependency it cannot call immutable makes the memo unpreservable. It then
     declines to optimise the whole component rather than this one line, which is what
     `react-hooks/preserve-manual-memoization` reports. Grouping is one Map over a single
     stage's rows: the order of work those two lines already do on every render. */
  const selectedCases = groupSelectionByCase(stageRows, selectedIds);

  /* Only asked when this stage has come up empty under a filter — the one moment the
     answer changes what the screen should say. */
  const elsewhere =
    rows.length === 0 && isFiltered
      ? processesElsewhere(line, filters, stageId)
      : [];

  /**
   * Move to another stage.
   *
   * `carry` is the filters to arrive with, and only the empty state passes it: following
   * "1 in Signed" out of a search that found nothing here has to land on that search
   * still applied, or the bench arrives at eight rows and has to type it again. Anything
   * carried is rebased first, because a stage-defining channel is not a question the
   * bench asked (`rebaseFilters`). The tab strip itself passes nothing and resets, which
   * is what picking a stage off the strip means.
   */
  function changeStage(next: ProcessStageId, carry?: ProcessFilters) {
    const nextStage = processStage(next);
    setStageId(next);
    setFilters(
      carry
        ? rebaseFilters(carry, stage, nextStage)
        : defaultProcessFilters(nextStage),
    );
    setSelectedIds(new Set());
    setPage(1);
    setNotice("");
    setPicked("");
  }

  /**
   * The filter controls changed — all four of them, as they are used.
   *
   * **The box is a lookup and so are the selects.** A clerk typing a case number off an
   * envelope already knows the answer they want, and every keystroke is a better guess at
   * it; a clerk picking a process type is asking a one-part question that is complete the
   * moment it is picked. Neither has an in-between state worth holding, so neither waits
   * for a button, and there is no moment where what the controls hold and what the table
   * is showing disagree.
   *
   * The last Enter's word about a cover goes with the query it was typed against: once
   * the number has changed, "KL-…-2026 added to the pile" is about a case the box no
   * longer names.
   */
  function changeFilters(next: ProcessFilters) {
    if (next.query !== filters.query) setPicked("");
    setFilters(next);
    setPage(1);
  }

  /**
   * Enter, in the search box: put this envelope on the pile.
   *
   * The clerk's hands are on the keyboard with a cover in front of them, so the gesture
   * that ends a lookup should be the gesture that records it. Type the number, press
   * Enter, the case joins the pile and the box empties ready for the next cover. The
   * checkboxes still work and still feed the same pile — this is the fast path, not the
   * only one.
   *
   * **It commits only when the number names one case.** A cover is one per case, so one
   * case is one envelope and adding it is unambiguous; two cases still matching means the
   * clerk has not finished typing, and guessing between them would put the wrong court's
   * process into a signing batch. So an ambiguous Enter does nothing — the list is already
   * showing what has been typed — and the clerk keeps typing.
   *
   * A case already on the pile is said out loud rather than silently ignored: a second
   * cover for a case whose process is already picked is a thing that happens, and the
   * clerk needs to know which of the two it was.
   */
  function submitSearch() {
    const query = filters.query.trim();
    /* Both refusals used to press Search on the way out. There is no Search: the table is
       already showing what the box says, so an Enter that names no single case has nothing
       left to do and the clerk keeps typing. */
    if (!stage.reconcilesCovers || !query) return;

    const matches = singleCaseMatch(stageRows, { ...filters, query });
    if (!matches) return;

    const caseNumber = matches[0].caseNumber;
    const already = matches.every((process) => selectedIds.has(process.id));
    if (!already) {
      setSelectedIds((current) => {
        const next = new Set(current);
        for (const process of matches) next.add(process.id);
        return next;
      });
    }

    /* The box empties on the way out, because the next thing the clerk does is read the
       next cover. Clearing it also puts the table back, which is one deliberate change
       following one deliberate act rather than a list moving while nobody asked. */
    setFilters((current) => ({ ...current, query: "" }));
    setPage(1);
    setNotice("");
    setPicked(
      already
        ? `${caseNumber} is already on the pile.`
        : `${caseNumber} added to the pile.`,
    );
  }

  function clearFilters() {
    changeFilters(defaults);
  }

  function toggle(process: CourtProcess) {
    setNotice("");
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(process.id)) next.delete(process.id);
      else next.add(process.id);
      return next;
    });
  }

  /** The header checkbox: every row in view, or none of them. */
  function toggleAllInView(select: boolean) {
    setNotice("");
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const process of pageRows) {
        if (select) next.add(process.id);
        else next.delete(process.id);
      }
      return next;
    });
  }

  /**
   * Take an envelope back out of the pile.
   *
   * A cover is one per case, so removing an entry removes the whole case — every process
   * of it that is at this stage, whether or not the table is currently showing them.
   * Untick two of three and the entry stays, reading `2`; untick the entry and all three
   * go, because the entry *is* the envelope.
   */
  function removeCase(caseNumber: string) {
    setNotice("");
    const ids = processIdsForCase(stageRows, caseNumber);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  /* Put the whole pile down. Distinct from the filters' Clear, which puts the *question*
     down — hence "Clear selection" on the tray rather than a second bare "Clear". */
  function clearSelection() {
    setNotice("");
    setSelectedIds(new Set());
  }

  /**
   * The act, from either path. It moves the rows one stage along in this demo line,
   * clears the selection it consumed and says what it did — nothing leaves the browser.
   */
  function advance(ids: ReadonlySet<string>) {
    const act = stage.act;
    if (!act) return;
    const moving = processesAdvancing(line, ids, stageId);
    const count = moving.length;
    if (count === 0) return;
    setActedIds(new Set(moving.map((process) => process.id)));
    setLine((current) =>
      advanceProcesses(current, ids, stageId, todayIsoDay()),
    );
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) next.delete(id);
      return next;
    });
    setNotice(act.notice(count));
  }

  function returnFocus() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-title text-balance font-semibold sm:text-title-l">
          Sign process
        </h1>
        {/* The supporting line belongs to the tab, not to the page: what is worth saying
            under the title is how much work is standing at the stage the bench is
            looking at, and that sentence is different at every one of the five. */}
        <p className="text-body text-muted-foreground">
          {stage.summary(stageRows.length)}
        </p>
      </header>

      <Tabs
        value={stageId}
        onValueChange={(value) => changeStage(value as ProcessStageId)}
        className="flex min-w-0 flex-col gap-6"
      >
        {/* Line TabsList, not the pill track: these are stages of one thing rather than
            alternative views of it, and the underline is what a line looks like. Five
            long labels will not fit a phone, so the row scrolls rather than crushing
            them (RESPONSIVE).

            The primitive hangs its mark at `after:bottom-[-5px]` for a padded track, and
            `overflow-x-auto` clips that hang (x-scroll forces y-clip). Sit the mark at
            `after:-bottom-px` so it lands on the gutter's own rule instead of floating
            above it as a second horizontal line (ui-craft §2). */}
        <div className="overflow-x-auto border-b border-hairline">
          <TabsList
            variant="line"
            aria-label="Process stages"
            className="h-10 w-max min-w-full justify-start rounded-none p-0 group-data-horizontal/tabs:h-10"
          >
            {PROCESS_STAGES.map((entry) => (
              <TabsTrigger
                key={entry.id}
                value={entry.id}
                className="h-10 flex-none gap-2 px-3 text-body-compact group-data-horizontal/tabs:after:-bottom-px"
              >
                {entry.label}
                {/* How much is standing here. One presentation across all five, and it
                    inherits the trigger's colour so the count and its label read as one
                    thing rather than as a badge stuck to a tab (ui-craft §2). */}
                <span className="font-normal tabular-nums">
                  {processesAt(line, entry.id).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {PROCESS_STAGES.map((entry) => (
          <TabsContent
            key={entry.id}
            value={entry.id}
            className="min-w-0 outline-none"
          >
            {entry.id !== stageId ? null : (
              /* One panel: filters, list and footer are one unit of work, so they share
                 one lifted sheet — the same recipe every other court-side queue uses.
                 Nothing inside draws a second frame. */
              <section className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-card shadow-raised p-6">
                <ProcessFiltersForm
                  stage={stage}
                  filters={filters}
                  searchRef={searchRef}
                  onChange={changeFilters}
                  onClear={clearFilters}
                  onSubmit={submitSearch}
                />

                {/* Mounted whatever the tab is doing, including empty — see
                    `QueueAnnouncer`. */}
                <QueueAnnouncer
                  from={start + 1}
                  to={start + pageRows.length}
                  total={rows.length}
                />

                {/* The pile, above the list it was picked from — and outside the branch
                    below, so searching a case with nothing at this stage empties the
                    table without emptying the clerk's hands.

                    Shown only when it holds something. An empty box announcing that it is
                    empty is chrome asking to be read; the pile explains itself the moment
                    there is a pile. It briefly carried a placeholder to stop the box
                    *appearing* on the first tick and shoving the table out from under the
                    cursor — but with Enter as the way covers go on, the clerk's hands stay
                    in the search box and the table is not what they are aiming at. The
                    tray and the restored table arrive together, as one change following
                    one act. */}
                {stage.reconcilesCovers && selectedCases.length > 0 ? (
                  <ProcessSelectionTray
                    cases={selectedCases}
                    processCount={selected.length}
                    onRemoveCase={removeCase}
                    onClearSelection={clearSelection}
                  />
                ) : null}

                {/* One height for both branches, so narrowing a search does not walk the
                    footer and the page up the screen under the clerk. Ten rows is taller
                    than this, so a full tab is unaffected; the floor catches the last few
                    keystrokes — the ones that take a result from five rows to one — which
                    are exactly the keystrokes the clerk is watching. */}
                <div className="flex min-h-96 min-w-0 flex-col">
                {pageRows.length === 0 ? (
                  <ProcessEmpty
                    stage={stage}
                    isFiltered={isFiltered}
                    elsewhere={elsewhere}
                    onClear={clearFilters}
                    onGoToStage={(next) => changeStage(next, filters)}
                  />
                ) : (
                  <div className="flex min-w-0 flex-col gap-4">
                    {/* min-w-0 lets this flex item shrink below the table's content
                        width, so a wide table scrolls inside the panel instead of
                        pushing the page sideways. */}
                    <div className="min-w-0 overflow-x-auto">
                      {/* Seven columns do not survive a phone. Below `md` the same rows
                          stack as items — the answer the rest of the court side already
                          gives. */}
                      <div className="hidden md:block">
                        <SignProcessTable
                          stage={stage}
                          rows={pageRows}
                          selectedIds={selectedIds}
                          onToggle={toggle}
                          onToggleAll={toggleAllInView}
                          onOpen={setOpen}
                        />
                      </div>
                      <div className="md:hidden">
                        <ProcessItemList
                          stage={stage}
                          rows={pageRows}
                          selectedIds={selectedIds}
                          onToggle={toggle}
                          onOpen={setOpen}
                        />
                      </div>
                    </div>

                    <ListFooter
                      id="sign-process-page-size"
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
                </div>
              </section>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {stageRows.length > 0 ? (
        <ProcessBar
          stage={stage}
          count={selected.length}
          notice={notice}
          onDownload={() => downloadProcessBundle(selected)}
          onRequestAct={() => setBulkOpen(true)}
          actRef={actRef}
        />
      ) : null}

      {/* Confirm the count, then say what became of it — the shared bulk confirmation
          every signing queue runs, carrying this stage's verb rather than a signature's.
          It hangs off the screen rather than off the bar, because acting on the last row
          in view takes the bar away with it. */}
      {stage.act ? (
        <SignBulkConfirmDialog
          noun="process"
          act={stage.act}
          count={selected.length}
          selection={{
            cases: selected.map((process) => process.caseNumber),
            kinds: selected.map((process) =>
              courtProcessTypeLabel(process.type),
            ),
          }}
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          triggerRef={actRef}
          onConfirm={() => advance(selectedIds)}
          /* Only off Pending sign. Signing is the act that produces something worth
             having in hand — a paper that now carries the magistrate's name and the day
             it was signed — and the rows have left the tab that could have downloaded
             them. The other two acts move rows that are unchanged as documents, and both
             land on a tab whose own bar still offers Download. Owner ask, 2026-09-07. */
          onDownload={
            stageId === "pending-sign"
              ? () =>
                  downloadProcessBundle(
                    line.filter((process) => actedIds.has(process.id)),
                  )
              : undefined
          }
          onReturnFocus={returnFocus}
        />
      ) : null}

      <SignProcessDialog
        process={open}
        onOpenChange={setOpen}
        onSign={(process) => {
          advance(new Set([process.id]));
          setOpen(null);
        }}
        onReturnFocus={returnFocus}
      />

      {/* What the last Enter did with the cover in the clerk's hand — the one thing on
          this screen the eye cannot catch, since the tray arrives silently and a second
          cover for a case already picked changes nothing on screen at all. Polite, and
          outside every panel so it survives the tab it was spoken on.

          It says nothing about the list: what the search narrowed to is `QueueAnnouncer`'s
          sentence, once per pause rather than once per keystroke, and two regions
          reporting the same filtering would be read out twice (ACCESSIBILITY §5). */}
      <p aria-live="polite" className="sr-only">
        {picked}
      </p>
    </div>
  );
}

/**
 * Type, channel, hearing date and free text, then search — the reference's controls, in
 * the reference's order, laid out the way the sibling queues lay out theirs.
 *
 * **The box does not wait for the button.** A case number is a lookup and it applies as
 * it is typed; the three selects compose a question and still apply on Search. The
 * button is therefore live exactly when a *select* is pending, which is what makes the
 * split legible rather than arbitrary — see `changeDraft`.
 *
 * Two of them answer to the stage. The hearing-date picker is absent on the first tab,
 * as the reference draws it. The channel select is absent there too, which the reference
 * is not: it draws the control pre-set to RPAD. Only registered post has a cover to
 * collect, so every row on that tab is RPAD and the control has exactly one possible
 * answer — it can return the whole list or nothing, and a disabled `SelectTrigger` is
 * rendered at half opacity, so the one fact it would carry is the one thing on the row
 * nobody can read. The fact survives in two places that are not controls: the line under
 * the page title says these are registered-post covers, and every row's Delivery channel
 * column says RPAD. Deviation logged in the build report.
 *
 * Every control carries a visible label. The reference labels the search box with the
 * things it searches, which is a hint rather than a name; ACCESSIBILITY §12 wants a
 * permanent label, so "Search cases" is the deviation, and the smallest one available.
 * The placeholder names the one field the box actually matches — case number — and on
 * the tab where Enter puts a cover on the pile it names that too: a keyboard gesture
 * nobody is told about is a keyboard gesture nobody uses.
 *
 * All four controls apply as they are used, and the Search button is gone. Nothing in the
 * row has a meaningless in-between state — two selects, a calendar and a text box — and
 * nothing here re-queries: the filter narrows rows the browser already holds, inside a tab
 * that has already narrowed them. Removing it also leaves the tab one strong fill instead
 * of two, and it is the one in the bar that actually moves a process.
 */
function ProcessFiltersForm({
  stage,
  filters,
  searchRef,
  onChange,
  onClear,
  onSubmit,
}: {
  stage: ProcessStage;
  filters: ProcessFilters;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onChange: (filters: ProcessFilters) => void;
  onClear: () => void;
  /** Enter in the box. On the stage that reconciles covers it is the pile's fast path. */
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      onSubmit={(event) => {
        /* A lone text input inside a `<form>` submits implicitly, and there is no submit
           button left to catch it — so Enter is handled here or it reloads the page. */
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor="sign-process-type" className="w-fit text-body-compact">
          Process type
        </Label>
        <Select
          value={filters.type}
          onValueChange={(value) =>
            onChange({ ...filters, type: value as ProcessFilters["type"] })
          }
        >
          <SelectTrigger id="sign-process-type" className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All process types</SelectItem>
            {COURT_PROCESS_TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stage.onlyChannel === undefined ? (
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="sign-process-channel" className="w-fit text-body-compact">
            Delivery channel
          </Label>
          <Select
            value={filters.channel}
            onValueChange={(value) =>
              onChange({
                ...filters,
                channel: value as ProcessFilters["channel"],
              })
            }
          >
            <SelectTrigger id="sign-process-channel" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {PROCESS_CHANNELS.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* `DatePicker` owns its trigger and takes no `id`, so the visible label names a
          group around it rather than pointing `htmlFor` at a control that does not
          exist. The trigger still announces the date it holds.

          The `key` is not decoration. `DatePicker` treats `value === undefined` as "I am
          uncontrolled" and falls back to its own last selection, so a filter cleared back
          to "any day" would keep showing the date it used to hold. Remounting on the
          value is the only fix that does not edit the primitive — upstream DS bug, logged
          in the build report. */}
      {stage.hearingDateFilter ? (
        <div className="flex min-w-0 flex-col gap-2">
          <span
            id="sign-process-hearing-label"
            className="w-fit text-body-compact font-medium"
          >
            Hearing date
          </span>
          <div role="group" aria-labelledby="sign-process-hearing-label">
            <DatePicker
              key={filters.hearingDate || "any-day"}
              value={
                filters.hearingDate ? parseIsoDay(filters.hearingDate) : undefined
              }
              placeholder="Any day"
              onValueChange={(next) =>
                onChange({
                  ...filters,
                  hearingDate: next ? isoDay(next) : "",
                })
              }
              className="w-full sm:w-52"
            />
          </div>
        </div>
      ) : null}

      <QueueSearchField
        label="Search cases"
        className="sm:w-72"
        ref={searchRef}
        value={filters.query}
        onChange={(query) => onChange({ ...filters, query })}
        placeholder={
          stage.reconcilesCovers ? "case number, then Enter" : "case number"
        }
      />

      {/* The only button left on the row. "Clear filters" rather than the reference's
          "Clear search": it returns the type and the date to this tab's default view as
          well, so a label naming only the search would undersell what it does — and it
          stays for exactly that reason, since the box's own `×` reaches the text alone. */}
      <Button type="button" variant="ghost" onClick={onClear}>
        Clear filters
      </Button>
    </form>
  );
}

/**
 * The pile of envelopes, on screen.
 *
 * The clerk works this stage one cover at a time: pick one up, type its case number,
 * press Enter, put it down, pick up the next — or tick it in the table, which feeds the
 * same pile. The screen used to lose that work between searches: the picked rows scroll
 * away the moment the next number is typed, and the only surviving evidence was a count
 * on the bar. Seven envelopes in, there was no way to tell whether the third had been
 * picked, picked twice, or missed.
 *
 * So the accumulation the clerk was holding in their head lives here instead, and it
 * survives search, paging and every filter change. It is not a second selection: these
 * are the same rows the checkboxes hold, read back in the unit the clerk holds them in.
 *
 * **Counted by envelope, acted on by process.** A cover is one per case, so the tray
 * counts cases — that is the number the clerk can check against the stack still on the
 * desk, and the only check available at this stage, because nothing but the covers knows
 * how many covers arrived. The bar goes on counting process, because that is what gets
 * sent for signature. Both numbers are true and the tray says both rather than picking
 * the one that makes a tidier sentence.
 *
 * **A well, not a bordered box.** It sits inside the panel that already lifts off the
 * page, so the third layer is a sunken fill and the entries are flat white on it — no
 * stroke anywhere, and nothing nested inside a shadow (ui-craft §4).
 */
function ProcessSelectionTray({
  cases,
  processCount,
  onRemoveCase,
  onClearSelection,
}: {
  cases: SelectedCase[];
  processCount: number;
  onRemoveCase: (caseNumber: string) => void;
  onClearSelection: () => void;
}) {
  return (
    <section
      aria-label="Cases picked to send for signature"
      className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* One line, two counts, one weight: the numbers carry the foreground and the
            words stay muted, so the pair reads as a count rather than as a sentence
            with numbers in it. */}
        <p className="text-body-compact text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">
            {cases.length}
          </span>{" "}
          {plural(cases.length, "case", "cases")} picked{" · "}
          <span className="font-medium tabular-nums text-foreground">
            {processCount}
          </span>{" "}
          {plural(processCount, "process", "processes")}
        </p>
        {/* "Clear selection", not "Clear": the filters already own a Clear, and the two
            put down different things — the question, and the pile. */}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="max-md:h-10"
          onClick={onClearSelection}
        >
          Clear selection
        </Button>
      </div>
      <ul className="flex flex-wrap items-center gap-1.5">
        {cases.map((entry) => (
          <li key={entry.caseNumber}>
            {/* The DS's own chip shape — its combobox chip, inverted: that one is a
                sunken fill on a white field, this one is a white fill on a sunken well,
                which is the same step in the other direction. Below `md` it grows to the
                40px the DS asks of a touch target (ACCESSIBILITY §8). */}
            <span className="flex h-10 items-center gap-1.5 rounded-md bg-card pl-2.5 pr-1 text-caption md:h-8">
              <span className="tabular-nums">{entry.caseNumber}</span>
              {/* How much process is inside this envelope. Same treatment on every
                  entry, including the ones holding a single process — a count that
                  appears only sometimes is a count the eye has to interpret. */}
              <span className="tabular-nums text-muted-foreground">
                {entry.processes.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="max-md:size-10"
                aria-label={`Take ${entry.caseNumber} out of the selection`}
                onClick={() => onRemoveCase(entry.caseNumber)}
              >
                <XIcon aria-hidden />
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * What is selected, and what the stage does with it.
 *
 * Sticky, because the list it commits is longer than a screen and a button that scrolls
 * away from its own selection is a button the bench has to hunt for. Chrome, so it is
 * `bg-card` over a hairline seam and never carries the panel's full-strength edge
 * (ui-craft §4, layer 2); the negative margins let it span the page's own padding.
 * `z-30` is the chrome layer this app already uses — the top bar and the filing footer
 * both sit there.
 *
 * Download reaches every stage; the act reaches three of them. On Sent and Completed the
 * bar therefore carries one button, which is the truthful shape of a record: there is
 * nothing to do to these rows here, and the papers are still worth taking away.
 *
 * The line beside the buttons is `aria-live`, so a screen reader hears the selection
 * change, and what an act did, without going looking for either.
 */
function ProcessBar({
  stage,
  count,
  notice,
  onDownload,
  onRequestAct,
  actRef,
}: {
  stage: ProcessStage;
  count: number;
  notice: string;
  onDownload: () => void;
  /** Opens the shared confirmation. The act itself lives on the screen. */
  onRequestAct: () => void;
  /** Handed down so the confirmation can give the keyboard back to this button. */
  actRef: React.Ref<HTMLButtonElement>;
}) {
  const summary =
    notice ||
    (count === 0
      ? stage.act
        ? "Select the processes to act on."
        : "Select the processes to download."
      : `${count} ${plural(count, "process", "processes")} selected.`);

  return (
    <div className="sticky bottom-0 z-30 -mx-6 -mb-6 border-t border-hairline bg-card px-6 py-3 md:-mx-8 md:-mb-8 md:px-8 md:py-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p
          className="mr-auto text-body-compact text-muted-foreground tabular-nums"
          aria-live="polite"
        >
          {summary}
        </p>

        {/* One bordered action beside the strong one, per the Ration Teal Law: the teal
            is spent on the act that moves the line, and taking a copy away is the quieter
            of the two. On the record stages it is the only button, and it stays `outline`
            rather than being promoted — a stage with nothing to do to it should not grow
            a strong action to fill the space. */}
        <Button
          type="button"
          variant="outline"
          disabled={count === 0}
          className="w-full sm:w-fit"
          onClick={onDownload}
        >
          {count > 0
            ? `Download ${count} ${plural(count, "document", "documents")}`
            : "Download selected documents"}
        </Button>

        {stage.act ? (
          <Button
            ref={actRef}
            type="button"
            disabled={count === 0}
            className="w-full sm:w-fit"
            onClick={onRequestAct}
          >
            {stage.act.bar(count)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Why the list is empty, and what to do about it.
 *
 * Three facts, so three states. An empty stage is the line being clear at that point, and
 * what *that* means differs at each of the five, so the words come off the stage. A
 * filter that matched nothing anywhere is a dead end with one action worth offering.
 *
 * And then the state a single-stage queue never has: **the row is in the line, just not
 * at this stage.** A process moves, so the most ordinary search on this screen — a case
 * number typed while standing on the tab it was last seen at — finds nothing here and
 * everything one tab over. Answering that with "no process matches" is true of the tab
 * and useless about the line, and it is how a working search gets reported as broken. So
 * the stage that has the row says so by name, with its count, and takes the search along
 * when the bench follows it.
 *
 * Borderless and unpadded; the panel is already the frame.
 */
function ProcessEmpty({
  stage,
  isFiltered,
  elsewhere,
  onClear,
  onGoToStage,
}: {
  stage: ProcessStage;
  isFiltered: boolean;
  /** Stages that do hold something matching. Empty unless this stage found nothing. */
  elsewhere: { stage: ProcessStage; count: number }[];
  onClear: () => void;
  onGoToStage: (next: ProcessStageId) => void;
}) {
  const found = isFiltered && elsewhere.length > 0;
  const total = elsewhere.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Empty className="border-0 p-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {found ? (
            <ArrowRightIcon aria-hidden />
          ) : isFiltered ? (
            <SearchXIcon aria-hidden />
          ) : (
            <FileCheck2Icon aria-hidden />
          )}
        </EmptyMedia>
        <EmptyTitle className="text-title-s font-semibold">
          {found
            ? "Further along the line"
            : isFiltered
              ? "No process matches these filters"
              : stage.empty.title}
        </EmptyTitle>
        <EmptyDescription className="text-body">
          {found
            ? `Nothing at this stage matches, but ${total === 1 ? "1 process does" : `${total} processes do`} elsewhere in the line. A process leaves a stage as the court works it.`
            : isFiltered
              ? "No process anywhere in this line matches the type, channel, date or search you asked for."
              : stage.empty.description}
        </EmptyDescription>
      </EmptyHeader>
      {isFiltered ? (
        <EmptyContent>
          {/* One button per stage that holds something, carrying this search with it.
              At most four, and in practice one — they wrap rather than truncate, because
              a stage name the bench cannot read is a destination it cannot choose. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {elsewhere.map((entry) => (
              <Button
                key={entry.stage.id}
                variant="outline"
                onClick={() => onGoToStage(entry.stage.id)}
              >
                <span className="tabular-nums">
                  {entry.count} in {entry.stage.label}
                </span>
              </Button>
            ))}
            <Button
              variant={found ? "ghost" : "outline"}
              onClick={onClear}
            >
              Clear filters
            </Button>
          </div>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/**
 * The same rows below `md`, stacked.
 *
 * The checkbox and the opener stay separate controls here too, for the same reason they
 * do in the table: one tap cannot mean both. The checkbox takes the leading column at its
 * full 40px target, and a tap anywhere else on the card opens the process — the case name
 * is the keyboard button, with the instrument, number, channel and the two dates spelled
 * out under it because there is no column header to name them.
 */
function ProcessItemList({
  stage,
  rows,
  selectedIds,
  onToggle,
  onOpen,
}: {
  stage: ProcessStage;
  rows: CourtProcess[];
  selectedIds: ReadonlySet<string>;
  onToggle: (process: CourtProcess) => void;
  onOpen: (process: CourtProcess) => void;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((process) => {
        const type = courtProcessTypeLabel(process.type);
        const inline = courtProcessTypeInline(process.type);
        const day = stage.dateOf(process);
        return (
          <li
            key={process.id}
            {...rowActivation("flex gap-3 rounded-lg bg-surface-sunken p-4 transition-colors hover:bg-accent-strong")}
          >
            {/* The DS box expands its own hit area to 40×40; the name it carries is the
                process and its case, not the column, because a row read aloud has no
                column header. */}
            <span className="pt-0.5">
              <Checkbox
                checked={selectedIds.has(process.id)}
                onCheckedChange={() => onToggle(process)}
                aria-label={`Select the ${inline} in ${process.caseNumber}`}
              />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpen(process)}
                {...rowOpener}
                className={rowOpenerClass}
              >
                <span className="sr-only">Read the {inline} in </span>
                {causeTitle(process)}
              </button>
              <p className="min-w-0 text-body-compact">
                {type} · {processChannelLabel(process.channel)}
              </p>
              <p className="text-caption text-muted-foreground">
                <span className="tabular-nums">{process.caseNumber}</span>
                {day ? (
                  <>
                    {` · ${stage.dateColumn} `}
                    <span className="tabular-nums">
                      {formatProcessDate(day)}
                    </span>
                  </>
                ) : null}
                {" · Hearing "}
                <span className="tabular-nums">
                  {formatProcessDate(process.hearingDate)}
                </span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
