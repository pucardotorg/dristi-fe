"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  FileQuestionIcon,
  PlusIcon,
  ScrollTextIcon,
  SearchXIcon,
  TrashIcon,
} from "lucide-react";

import { Identifier } from "@/components/chrome/identifier";
import { ARRIVAL } from "@/components/chrome/motion";
import {
  RichTextField,
  type RichTextValue,
} from "@/components/cases/rich-text-field";
import { markCognizanceTab } from "@/components/employee/cognizance-return";
import { COGNIZANCE_PATH } from "@/components/employee/cognizance-table";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { markArrival, useArrival } from "@/components/employee/use-arrival";
import { useCourtToday } from "@/components/employee/use-court-today";
import { PANEL_CLASS } from "@/components/shell/panel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COGNIZANCE_ACTS,
  cognizanceCaseById,
  nextCognizanceCase,
  primaryActFor,
  tabFor,
  type CognizanceAct,
  type CognizanceCase,
} from "@/lib/employee/cognizance";
import {
  cognizanceComposite,
  cognizanceOrderBlockers,
  cognizanceOrderOutcome,
  cognizanceTemplateFacts,
  composedText,
  defaultNextPurposeFor,
  defaultNextPurposeLabel,
  type CognizanceOrderItem,
} from "@/lib/employee/cognizance-order";
import {
  COURT_HEARING_PURPOSES,
  courtHearingPurposeLabel,
  formatListingDate,
  isoDay,
  parseIsoDay,
  type CourtHearingPurposeId,
} from "@/lib/employee/hearings";
import {
  appendRichText,
  orderItemsInBody,
  richTextFromPlain,
  richTextWithoutItem,
  upsertRichTextSentence,
} from "@/lib/employee/order-items";
import {
  browsableTemplates,
  ORDER_GROUPS,
  orderTemplate,
  unavailableReason,
  type OrderTemplate,
  type OrderTemplateId,
} from "@/lib/employee/order-templates";
import {
  subjectFacts,
  subjectReturn,
  type OrderSubject,
} from "@/lib/employee/order-subject";
import { cn } from "@/lib/utils";

/**
 * The order one cognizance act draws up — the PRD's composite, opened for the judge to
 * read, adjust and send.
 *
 * **The hearing composer's screen, not a second design** (owner, 2026-09-25: the two
 * order screens exist separately for now, but the design stays the same, minus what a
 * complaint does not have). So this is that screen's composition, rule for rule: the
 * cause and the way on in a sticky white header, the beige canvas under it split a third
 * to two-thirds, the catalogue in a collapsible card on the left, the order on its own
 * lifted sheet on the right, and one primary in a sticky footer.
 *
 * Three things are taken out or changed, and each is a fact about the subject rather
 * than a preference (`order-subject.ts`):
 *
 * 1. **No attendance.** Nobody appeared — the matter has never been called — so the
 *    sheet's roll would be four Present/Absent pairs about an event that did not happen.
 * 2. **No applications section.** Nothing is pending on a listing that does not exist.
 *    The one application that *is* live at cognizance, the condonation of delay, is
 *    disposed of by an item the act loads into the order itself, not by a strip.
 * 3. **The next hearing cannot be declined.** On a sitting the bench may decide a matter
 *    needs no further date. Both positive acts here schedule a hearing and its date is
 *    required (PRD §6), so the block loses its *List it again* tick; a dismissal loses
 *    the block altogether.
 *
 * **Nothing is issued.** Sending settles the screen and says so. The signing queue
 * (`sign-orders.ts`) is a fixture, so an order that claimed to have reached it would be
 * the one lie this screen cannot afford.
 */
export function CognizanceOrderScreen({
  caseId,
  act,
}: {
  caseId: string;
  /** `null` when the URL named no act, or one that is not an act. */
  act: CognizanceAct | null;
}) {
  const arrival = useArrival();
  const matter = cognizanceCaseById(caseId);

  if (!matter) return <OrderMissing />;

  /* No act in the URL means the one this complaint's tab offers — the act the bench
     would have pressed. A typed or truncated link lands on the right order rather
     than on an error. */
  const chosen = act ?? primaryActFor(matter);

  return (
    <div className={cn("min-w-0", arrival && ARRIVAL[arrival])}>
      <OrderBody key={`${matter.id}:${chosen}`} matter={matter} act={chosen} />
    </div>
  );
}

/** The sheet's own recessed block, as the hearing composer rules it. */
const WELL_CLASS = "rounded-lg border border-hairline bg-surface-sunken p-4";

function OrderBody({
  matter,
  act,
}: {
  matter: CognizanceCase;
  act: CognizanceAct;
}) {
  const today = useCourtToday();
  const subject: OrderSubject = { kind: "cognizance", matter, act };
  const next = nextCognizanceCase(matter.id);
  const back = subjectReturn(subject);

  const [nextDate, setNextDate] = React.useState<string | null>(null);
  const [nextPurpose, setNextPurpose] = React.useState<CourtHearingPurposeId | null>(
    () => defaultNextPurposeFor(act),
  );
  const [sent, setSent] = React.useState(false);

  /* What the act loaded, and what it is worth saying about each of them. The list is
     the record of the composition; what the order *carries* is read back off the
     passage, so a direction the judge deleted in the editor stops being counted
     (`orderItemsInBody`). */
  const [items, setItems] = React.useState<CognizanceOrderItem[]>(() =>
    cognizanceComposite(
      matter,
      act,
      cognizanceTemplateFacts(matter, today, {
        purpose: defaultNextPurposeLabel(act),
      }),
    ),
  );

  /* The passage itself, seeded from the composition: one marked block per item, in the
     order the PRD lists them. The editor owns it from then on. */
  const [body, setBody] = React.useState<RichTextValue>(() =>
    items.reduce<RichTextValue>(
      (passage, item) =>
        appendRichText(passage, richTextFromPlain(item.text, item.id)),
      { html: "", text: "" },
    ),
  );
  /** Bumped by every write the screen makes, so the editor re-reads it. */
  const [bodyWrites, setBodyWrites] = React.useState(0);

  function write(nextBody: RichTextValue) {
    setBody(nextBody);
    setBodyWrites((count) => count + 1);
  }

  /* The scheduling sentence names the date and the purpose, so it follows them. Replaced
     where it stands rather than removed and re-appended: the posting closes the order,
     and an order that reshuffled its last line every time a date changed would read as
     a different document each time. */
  const scheduling = items.find((item) => item.schedules);
  const schedulingText = scheduling
    ? composedText(
        scheduling.template,
        matter,
        cognizanceTemplateFacts(matter, today, {
          date: nextDate ?? undefined,
          purpose: nextPurpose
            ? courtHearingPurposeLabel(nextPurpose)
            : undefined,
        }),
      )
    : null;
  const said = React.useRef(scheduling?.text ?? null);

  function postNext(change: {
    date?: string | null;
    purpose?: CourtHearingPurposeId;
  }) {
    const day = change.date !== undefined ? change.date : nextDate;
    const purpose = change.purpose ?? nextPurpose;
    if (change.date !== undefined) setNextDate(change.date);
    if (change.purpose) setNextPurpose(change.purpose);
    if (!scheduling) return;
    const sentence = composedText(
      scheduling.template,
      matter,
      cognizanceTemplateFacts(matter, today, {
        date: day ?? undefined,
        purpose: purpose ? courtHearingPurposeLabel(purpose) : undefined,
      }),
    );
    write(
      upsertRichTextSentence(body, sentence, [said.current ?? ""]),
    );
    said.current = sentence;
  }

  /* What the order says now, not what was pulled into it: the blanks and the blockers
     are read off the items the passage still carries. */
  const carried = orderItemsInBody(
    items.map((item) =>
      item.schedules && schedulingText
        ? { ...item, text: schedulingText }
        : item,
    ),
    body.html,
  );
  const blockers = cognizanceOrderBlockers(carried, nextDate, today);
  const schedules = carried.some((item) => item.schedules);

  function addItem(id: OrderTemplateId) {
    if (items.some((item) => item.id === id)) return;
    const text = composedText(
      id,
      matter,
      cognizanceTemplateFacts(matter, today, {
        date: nextDate ?? undefined,
        purpose: nextPurpose ? courtHearingPurposeLabel(nextPurpose) : undefined,
      }),
    );
    setItems((current) => [
      ...current,
      {
        id,
        template: id,
        label: orderTemplate(id).label,
        text,
        fixed: false,
        schedules: id === "scheduling-of-hearing" || undefined,
      },
    ]);
    write(appendRichText(body, richTextFromPlain(text, id)));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    write(richTextWithoutItem(body, id));
  }

  return (
    <div className="flex min-h-svh min-w-0 flex-col">
      {/* The cause, the complaint it belongs to, and the way back — one header, the
          hearing composer's own. `top-14` rather than `top-0`: the chrome's bar is
          `sticky top-0` and 3.5rem tall, so this comes to rest under it. */}
      <header className="sticky top-14 z-20 flex flex-col gap-3 border-b border-hairline bg-card px-6 py-4 sm:flex-row sm:items-start sm:justify-between md:px-8">
        <div className="flex min-w-0 flex-col gap-2">
          {/* No space before the colon, and the cause after it — the sibling screen's
              heading, word for word. Which act this is rides in the facts row below,
              where the sitting's own screen puts the item number. */}
          <h1 className="text-title min-w-0 text-balance font-semibold">
            Order: {matter.parties.complainant} v. {matter.parties.accused}
          </h1>
          <MatterFacts subject={subject} />
        </div>
        {/* One button, not two. The hearing composer's other control walks on to the
            next matter of the sitting; there is no sitting here, and the way on is
            the footer's own act. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            asChild
            variant="outline"
            className="w-full shrink-0 sm:w-fit"
          >
            <Link
              href={back.href}
              onClick={() => {
                markArrival("back");
                markCognizanceTab(tabFor(matter));
              }}
            >
              View case
            </Link>
          </Button>
        </div>
      </header>

      {/* The split the hearing composer draws: the catalogue in a third, the order in
          two. The column between the white header and footer is the scoped work canvas
          — `bg-muted` in light so the panels read against the rail's tone; dark stays
          `bg-background`, where muted sits above card. */}
      <div className="grid min-w-0 flex-1 gap-8 bg-muted p-6 md:p-8 lg:grid-cols-3 dark:bg-background">
        <div className="flex min-w-0 flex-col gap-4 self-start">
          <CatalogueCard
            carried={carried}
            disabled={sent}
            onAdd={addItem}
            onRemove={removeItem}
          />
        </div>

        <article
          aria-labelledby="order-paper"
          className={cn(
            PANEL_CLASS,
            "flex min-w-0 flex-col gap-4 self-start rounded-xl bg-card p-6 text-card-foreground md:p-8 lg:col-span-2",
          )}
        >
          <h2
            id="order-paper"
            tabIndex={-1}
            className="text-body-compact font-semibold uppercase tracking-wide"
          >
            Order
          </h2>

          {sent ? <SentNotice matter={matter} act={act} next={next ?? null} /> : null}

          {/* One block, full width. On a sitting this row carries attendance beside the
              posting; with the roll gone there is no pair to hold a two-column grid
              open, and a half-width block beside empty card is a gap, not a layout. */}
          {schedules ? (
            <section
              aria-labelledby="order-next"
              className={cn("flex min-w-0 flex-col gap-2", WELL_CLASS)}
            >
              <h3
                id="order-next"
                className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Next hearing
              </h3>
              <PaperNextHearing
                date={nextDate}
                purpose={nextPurpose}
                today={today}
                disabled={sent}
                onDate={(day) => postNext({ date: day })}
                onPurpose={(purpose) => postNext({ purpose })}
              />
            </section>
          ) : null}

          {/* The composed region: one box, ruled at the top so the editor reads as the
              passage this document is for rather than a control that landed on the
              sheet. The editor's own border closes it below. */}
          <div className="flex min-w-0 flex-col border-t border-hairline py-6">
            <RichTextField
              key={bodyWrites}
              value={body}
              onChange={setBody}
              labelId="order-paper"
              className="[&_[data-slot=input-group-control]]:min-h-48 [&_[data-slot=input-group-control]>*+*]:mt-6"
            />
          </div>
        </article>
      </div>

      <footer className="sticky bottom-0 z-30 border-t border-hairline bg-card px-6 py-3 md:px-8 md:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {/* Why the button is off, beside the button — never a disabled control with
              its reason somewhere else on the page. */}
          {!sent && blockers.length > 0 ? (
            <p className="text-caption text-warning-muted-foreground">
              {blockers.join(" ")}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full sm:w-fit"
            disabled={sent || blockers.length > 0}
            onClick={() => setSent(true)}
          >
            Send to sign order
          </Button>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────── the facts ──────────────────────────────── */

/**
 * The facts under the cause — the hearing composer's own row, answering for a complaint.
 *
 * No item and no purpose: a complaint has not been listed and has not been called. What
 * it has instead is the filing it came in as and which half of the register it stands on
 * (`subjectFacts`). One size throughout, hierarchy from colour and weight.
 */
function MatterFacts({ subject }: { subject: OrderSubject }) {
  return (
    <dl className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1">
      {subjectFacts(subject).map((fact) => (
        <div key={fact.label} className="flex min-w-0 items-baseline gap-2">
          <dt className="text-body-compact font-medium text-muted-foreground">
            {fact.label}
          </dt>
          <dd className="text-body-compact min-w-0">
            {fact.identifier ? (
              <Identifier value={fact.value} label={fact.label} />
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ──────────────────────────────── the next hearing ──────────────────────────── */

/**
 * The posting, as the sheet settles it.
 *
 * The hearing composer's block with its first control removed: there, *List it again* is
 * a real question, because a matter that has been heard may need no further date. Here
 * both positive acts schedule a hearing and the date is a required field, so there is
 * nothing to opt out of and a tick that could only ever be ticked would be furniture.
 *
 * `Popover` + `Calendar` rather than the DS `DatePicker`, which is what this screen's
 * sibling already composes — and the reason it matters here is that the picker takes no
 * earliest date, while `Calendar` takes a `disabled` matcher. A next hearing in the past
 * is barred at the control instead of being caught after the fact.
 */
function PaperNextHearing({
  date,
  purpose,
  today,
  disabled,
  onDate,
  onPurpose,
}: {
  date: string | null;
  purpose: CourtHearingPurposeId | null;
  today: string;
  disabled: boolean;
  onDate: (day: string | null) => void;
  onPurpose: (purpose: CourtHearingPurposeId) => void;
}) {
  const fieldId = React.useId();
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const chosen = date ? parseIsoDay(date) : undefined;
  const earliest = parseIsoDay(today);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span
          id={`${fieldId}-purpose`}
          className="text-body-compact min-w-0 wrap-break-word"
        >
          Purpose of next hearing
        </span>
        <Select
          value={purpose ?? undefined}
          disabled={disabled}
          onValueChange={(value) => onPurpose(value as CourtHearingPurposeId)}
        >
          <SelectTrigger
            aria-labelledby={`${fieldId}-purpose`}
            className="w-full"
          >
            {/* Rendered rather than left to the primitive: a trigger with a value
                server-renders empty and fills in on hydration, and this block arrives
                with a purpose already chosen. */}
            <SelectValue placeholder="Choose a purpose">
              {purpose ? courtHearingPurposeLabel(purpose) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COURT_HEARING_PURPOSES.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <span
          id={`${fieldId}-date`}
          className="text-body-compact min-w-0 wrap-break-word"
        >
          Date of next hearing
        </span>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            {/* Named by the label beside it *and* by its own content, the way a combobox
                is: "Date of next hearing, 6 October 2026". */}
            <Button
              id={`${fieldId}-date-trigger`}
              variant="outline"
              disabled={disabled}
              aria-labelledby={`${fieldId}-date ${fieldId}-date-trigger`}
              className={cn(
                "w-full justify-start gap-2 text-left font-normal",
                !chosen && "text-muted-foreground",
              )}
            >
              <CalendarDaysIcon data-icon="inline-start" aria-hidden />
              <span className="truncate">
                {date ? formatListingDate(date) : "Pick a date"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="start"
            collisionPadding={16}
            className="w-auto max-w-(--radix-popover-content-available-width) gap-0 p-0"
          >
            <Calendar
              mode="single"
              autoFocus
              selected={chosen}
              /* Today included: the summons has to go out before the matter is called,
                 so the earliest date this order can post to is tomorrow. */
              disabled={{ before: new Date(earliest.getTime() + 86_400_000) }}
              onSelect={(day) => {
                onDate(day ? isoDay(day) : null);
                if (day) setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {!date ? (
          <p className="text-caption text-muted-foreground">
            Required before the order can be sent.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────────────────────────── the catalogue ────────────────────────────── */

/**
 * The orders section, as one collapsible card on the canvas.
 *
 * The hearing composer's left column holds two of these — the applications pending on
 * the listing, then the catalogue. A complaint has no listing and nothing pending on it,
 * so only the catalogue stands, and the card keeps the same metrics: `gap-0 p-2`, a 40px
 * trigger row with a teal tile, the section's own fact on the right of it.
 *
 * It opens on arrival rather than closed. On a sitting the row is navigation — the two
 * sections are the order the work is done in. Here there is one section, and a card that
 * opened to nothing would be a click between the bench and the only thing it holds.
 */
function CatalogueCard({
  carried,
  disabled,
  onAdd,
  onRemove,
}: {
  carried: CognizanceOrderItem[];
  disabled: boolean;
  onAdd: (id: OrderTemplateId) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [query, setQuery] = React.useState("");

  /* Before cognizance and never mid-sitting: the two facts the catalogue's own gates are
     read against. Long pending is a later life of the case and cannot be true of a
     complaint that is not yet on file. */
  const context = { cognizanceDue: true, longPending: false, hearingOngoing: false };

  const needle = query.trim().toLowerCase();
  const matches = browsableTemplates().filter((template) =>
    needle ? template.label.toLowerCase().includes(needle) : true,
  );
  const groups = ORDER_GROUPS.map((group) => ({
    ...group,
    rows: matches.filter((template) => template.group === group.id),
  })).filter((group) => group.rows.length > 0);

  const chosen = carried.map((item) => item.id);

  return (
    <Card className={cn(PANEL_CLASS, "min-w-0 gap-0 p-2")}>
      <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
        <h2 id="order-section-orders" tabIndex={-1} className="min-w-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-h-10 w-full min-w-0 items-center gap-3 rounded-lg px-2 text-start transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground"
              >
                <ScrollTextIcon className="size-4" />
              </span>
              <span
                className={cn(
                  "text-body-compact min-w-0 flex-1",
                  open ? "font-semibold" : "font-medium",
                )}
              >
                Orders
              </span>
              <span className="text-caption shrink-0 text-muted-foreground">
                {carried.length === 1 ? "1 in this order" : `${carried.length} in this order`}
              </span>
              <ChevronDownIcon
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                  open && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
        </h2>

        <CollapsibleContent className="min-w-0">
          <div className="flex min-w-0 flex-col gap-6 px-2 pt-4 pb-4">
            <InThisOrder
              carried={carried}
              disabled={disabled}
              onRemove={onRemove}
            />

            <div className="flex min-w-0 flex-col gap-3">
              <QueueSearchField
                label="Search the catalogue"
                value={query}
                onChange={setQuery}
                placeholder="Order type"
                className="w-full"
              />

              {groups.length === 0 ? (
                <Empty className="border-0 p-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchXIcon aria-hidden />
                    </EmptyMedia>
                    <EmptyTitle className="text-body font-semibold">
                      No order type matches
                    </EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex min-w-0 flex-col gap-4 lg:max-h-[50svh] lg:overflow-y-auto">
                  {groups.map((group) => (
                    <section key={group.id} className="flex min-w-0 flex-col gap-1">
                      <h3 className="text-caption font-semibold text-muted-foreground">
                        {group.label}
                      </h3>
                      <ul className="flex min-w-0 flex-col">
                        {group.rows.map((template) => (
                          <li key={template.id} className="min-w-0">
                            <CatalogueRow
                              template={template}
                              already={chosen.includes(template.id)}
                              reason={unavailableReason(template, context)}
                              disabled={disabled}
                              onAdd={() => onAdd(template.id)}
                            />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * What the order carries now, and the way to take one back out.
 *
 * Read off the passage rather than off the record of what was added, so a direction the
 * judge deleted in the editor stops being listed here (`orderItemsInBody`). The act's
 * own item has no remove: an order headed *Take cognizance* with the cognizance
 * direction taken out is an order that does not take cognizance, and the way to not take
 * it is to leave without sending this.
 */
function InThisOrder({
  carried,
  disabled,
  onRemove,
}: {
  carried: CognizanceOrderItem[];
  disabled: boolean;
  onRemove: (id: string) => void;
}) {
  if (carried.length === 0) {
    return (
      <p className="text-body-compact text-muted-foreground text-pretty">
        Nothing in this order yet. Add a direction from the catalogue below.
      </p>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-caption font-semibold text-muted-foreground">
        In this order
      </h3>
      <ul className="flex min-w-0 flex-col gap-1">
        {carried.map((item, index) => (
          <li
            key={item.id}
            className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-surface-sunken px-3 py-1.5"
          >
            <span className="text-caption tabular-nums text-muted-foreground">
              {index + 1}.
            </span>
            <span className="text-body-compact min-w-0 flex-1 wrap-break-word">
              {item.label}
            </span>
            {item.fixed || disabled ? null : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.label} from this order`}
                onClick={() => onRemove(item.id)}
              >
                <TrashIcon aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One catalogue row.
 *
 * Three states, each said in words: addable, already in the order, or barred with the
 * gate's own reason. A type the complaint cannot take is listed with the reason beside
 * it rather than hidden — on a screen where the wrong omission is a missed order, a
 * silently shorter list is the worse failure (`order-templates.ts`).
 */
function CatalogueRow({
  template,
  already,
  reason,
  disabled,
  onAdd,
}: {
  template: OrderTemplate;
  already: boolean;
  reason: string | null;
  disabled: boolean;
  onAdd: () => void;
}) {
  const note = already ? "Already in this order" : reason;

  if (reason !== null || already || disabled) {
    return (
      <div className="flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2">
        <span className="text-body-compact text-muted-foreground wrap-break-word">
          {template.label}
        </span>
        {note ? (
          <span className="text-caption text-muted-foreground">{note}</span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className="group/row flex w-full min-w-0 items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <PlusIcon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover/row:text-foreground"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-compact wrap-break-word">{template.label}</span>
        {template.workflow ? (
          <span className="text-caption text-muted-foreground">
            {template.workflow}
          </span>
        ) : null}
      </span>
    </button>
  );
}

/* ──────────────────────────────────── settled ───────────────────────────────── */

/**
 * What happened, once the order has been sent — at the head of the sheet it was drawn
 * on, not in a dialog that closes over the thing the bench just passed.
 *
 * It says plainly that nothing has been issued, because the signing queue is a fixture
 * and an order that claimed otherwise would be a lie the next screen could not honour.
 */
function SentNotice({
  matter,
  act,
  next,
}: {
  matter: CognizanceCase;
  act: CognizanceAct;
  next: CognizanceCase | null;
}) {
  const spec = COGNIZANCE_ACTS[act];
  return (
    <section
      aria-live="polite"
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6",
        WELL_CLASS,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <CircleCheckIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-success animate-in fade-in-0 zoom-in-50 duration-500 motion-reduce:animate-none"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body-compact font-semibold">{spec.settled}</p>
          <p className="text-body-compact text-muted-foreground text-pretty">
            {cognizanceOrderOutcome(matter, act)} The order is waiting to be signed;
            nothing has been issued from this screen.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button asChild variant={next ? "ghost" : "default"}>
          <Link
            href={COGNIZANCE_PATH}
            onClick={() => {
              markArrival("back");
              markCognizanceTab(tabFor(matter));
            }}
          >
            Back to take cognizance
          </Link>
        </Button>
        {next ? (
          <Button asChild>
            <Link
              href={`${COGNIZANCE_PATH}/${next.id}`}
              onClick={() => markArrival("next")}
            >
              Next complaint
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

/* ───────────────────────────────────── the miss ─────────────────────────────── */

/** An id this queue does not hold — a stale link, a typed URL, a complaint decided. */
function OrderMissing() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6 md:p-8">
      <Empty className="border-0 p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestionIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="font-semibold text-title-s">
            This complaint is not waiting for cognizance
          </EmptyTitle>
          <EmptyDescription className="text-body">
            An order is drawn up from a complaint on the list of those waiting for
            cognizance. This one is not on it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={COGNIZANCE_PATH}>Back to take cognizance</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
