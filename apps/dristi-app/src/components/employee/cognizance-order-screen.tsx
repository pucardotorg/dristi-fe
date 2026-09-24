"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarIcon,
  CircleCheckIcon,
  FileQuestionIcon,
  PlusIcon,
  SearchXIcon,
  XIcon,
} from "lucide-react";

import { Identifier } from "@/components/chrome/identifier";
import { ARRIVAL } from "@/components/chrome/motion";
import { markCognizanceTab } from "@/components/employee/cognizance-return";
import { COGNIZANCE_PATH } from "@/components/employee/cognizance-table";
import { markArrival, useArrival } from "@/components/employee/use-arrival";
import { useCourtToday } from "@/components/employee/use-court-today";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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
import { QueueSearchField } from "@/components/employee/queue-search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  itemOpenSlots,
  type CognizanceOrderItem,
} from "@/lib/employee/cognizance-order";
import {
  COURT_HEARING_PURPOSES,
  isoDay,
  parseIsoDay,
  type CourtHearingPurposeId,
} from "@/lib/employee/hearings";
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
  subjectTrail,
  type OrderSubject,
} from "@/lib/employee/order-subject";
import { cn } from "@/lib/utils";

/**
 * The order one cognizance act draws up — the PRD's composite, opened for the judge to
 * read, adjust and send.
 *
 * **Not the hearing composer.** That screen is a sitting's screen: its left half is a
 * catalogue you shop from and its right half opens on attendance and a next-date box,
 * with the order itself a blank field underneath the two of them. Here the order already
 * exists — the act loaded it — so the screen is composed the other way round. The order
 * is the page: four numbered passages on one lifted sheet, each the catalogue's own
 * wording with this complaint's facts in it, each editable where it stands. The
 * catalogue steps back into a sunken rail, which is what it is for here: the thing you
 * reach for only if the composition is missing something.
 *
 * That is the advocate side's shape — a board with a companion rail beside it — rather
 * than two equal panels, and it is the right one for the same reason: one of these two
 * things is the work and the other is a drawer.
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
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        arrival && ARRIVAL[arrival],
      )}
    >
      <OrderBody key={`${matter.id}:${chosen}`} matter={matter} act={chosen} />
    </div>
  );
}

/** Section labels above a surface — scaffolding, so it reads as scaffolding. */
const EYEBROW = "text-caption font-semibold text-muted-foreground";

function OrderBody({
  matter,
  act,
}: {
  matter: CognizanceCase;
  act: CognizanceAct;
}) {
  const today = useCourtToday();
  const spec = COGNIZANCE_ACTS[act];
  const subject: OrderSubject = { kind: "cognizance", matter, act };
  const next = nextCognizanceCase(matter.id);

  /* The next listing, which the scheduling item is written from. The purpose has a
     sensible default because the act implies one; the date never does — it is the
     judge's, and it is the one thing this order cannot be sent without. */
  const [nextDate, setNextDate] = React.useState<string | null>(null);
  const [nextPurpose, setNextPurpose] = React.useState<CourtHearingPurposeId | null>(
    () => defaultNextPurposeFor(act),
  );

  const facts = React.useMemo(
    () =>
      cognizanceTemplateFacts(matter, today, {
        date: nextDate ?? undefined,
        purpose:
          COURT_HEARING_PURPOSES.find((entry) => entry.id === nextPurpose)?.label,
      }),
    [matter, today, nextDate, nextPurpose],
  );

  /* The composition the act loaded, and then whatever the judge makes of it.

     Seeded once. It is not recomputed from `facts`, because that would rewrite a
     sentence the judge had already edited every time they picked a date — so the
     scheduling item is refilled on its own, below, and only while it is untouched. */
  const [items, setItems] = React.useState<CognizanceOrderItem[]>(() =>
    cognizanceComposite(
      matter,
      act,
      cognizanceTemplateFacts(matter, today, {
        purpose: defaultNextPurposeLabel(act),
      }),
    ),
  );
  /** Which sentences the judge has typed into. An edited item is never overwritten. */
  const [edited, setEdited] = React.useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [sent, setSent] = React.useState(false);

  /* The scheduling sentence names the date and the purpose, so it follows them —
     the one place on this screen where a field owns a passage.

     Derived at render rather than written back into state when the date changes. An
     effect that rewrote the item would be a second source of truth for the same
     sentence, and the two would disagree for one render every time. It stops the
     moment the judge types into that passage: their words outrank the template's. */
  const composed = React.useMemo(
    () =>
      items.map((item) =>
        item.schedules && !edited.has(item.id)
          ? { ...item, text: composedText(item.template, matter, facts) }
          : item,
      ),
    [items, edited, facts, matter],
  );

  const blockers = cognizanceOrderBlockers(composed, nextDate, today);

  function editItem(id: string, text: string) {
    setEdited((current) => new Set(current).add(id));
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, text } : item)),
    );
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addItem(id: OrderTemplateId) {
    if (items.some((item) => item.id === id)) return;
    setItems((current) => [
      ...current,
      {
        id,
        template: id,
        label: orderTemplate(id).label,
        text: composedText(id, matter, facts),
        fixed: false,
        schedules: id === "scheduling-of-hearing" || undefined,
      },
    ]);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <OrderHeader
        subject={subject}
        title={spec.label}
        outcome={cognizanceOrderOutcome(matter, act)}
        matter={matter}
        blockers={blockers}
        sent={sent}
        onSend={() => setSent(true)}
      />

      {/* The board and its rail. One page scroll, not two: a drawer that scrolls beside
          the work is a second scroll box for something you visit once. */}
      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
          {sent ? <SentNotice matter={matter} act={act} next={next ?? null} /> : null}

          <section aria-labelledby="order-items" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="order-items" className={EYEBROW}>
                The order
              </h2>
              <span className="text-caption tabular-nums text-muted-foreground">
                {composed.length === 1 ? "1 item" : `${composed.length} items`}
              </span>
            </div>

            {composed.length === 0 ? (
              <EmptyOrder />
            ) : (
              <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-card shadow-raised">
                {composed.map((item, index) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    index={index + 1}
                    readOnly={sent}
                    showBlanks={!(item.schedules && !nextDate)}
                    onEdit={(text) => editItem(item.id, text)}
                    onRemove={() => removeItem(item.id)}
                    scheduling={
                      item.schedules ? (
                        <NextHearingFields
                          date={nextDate}
                          purpose={nextPurpose}
                          disabled={sent}
                          onDate={setNextDate}
                          onPurpose={setNextPurpose}
                        />
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </section>

        </main>

        <CatalogueRail
          chosen={composed.map((item) => item.id)}
          disabled={sent}
          onAdd={addItem}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────── the header ─────────────────────────────── */

/**
 * The trail, the cause, what this order does, and the two ways out of it.
 *
 * The act is the title and the cause is under it, not the other way round: the bench
 * arrived here having already chosen the act on the complaint's file, and what they are
 * checking now is whether *this order* says it properly.
 *
 * The primary action stands in the header rather than floating over the page. A button
 * that hovers above the content it acts on covers the last item of a list exactly when
 * the list is long enough to matter.
 */
function OrderHeader({
  subject,
  title,
  outcome,
  matter,
  blockers,
  sent,
  onSend,
}: {
  subject: OrderSubject;
  title: string;
  outcome: string;
  matter: CognizanceCase;
  blockers: string[];
  sent: boolean;
  onSend: () => void;
}) {
  const trail = subjectTrail(subject);
  const back = subjectReturn(subject);
  const facts = subjectFacts(subject);

  return (
    <header className="shrink-0 bg-muted px-4 pt-6 lg:px-8 dark:bg-background">
      <Breadcrumb className="mb-4">
        <BreadcrumbList className="text-caption">
          {trail.map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link
                      href={crumb.href}
                      onClick={() => {
                        markArrival("back");
                        markCognizanceTab(tabFor(matter));
                      }}
                    >
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-title text-balance font-semibold">{title}</h1>
          <p className="text-body text-muted-foreground text-pretty">{outcome}</p>
          <dl className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-baseline gap-2">
                <dt className="text-caption text-muted-foreground">{fact.label}</dt>
                <dd className="text-body-compact">
                  {fact.identifier ? (
                    <Identifier value={fact.value} label={fact.label} />
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 lg:items-end">
          <div className="flex shrink-0 items-center gap-3">
            <Button asChild variant="outline">
              <Link href={back.href} onClick={() => markArrival("back")}>
                View case
              </Link>
            </Button>
            <Button
              type="button"
              onClick={onSend}
              disabled={sent || blockers.length > 0}
            >
              Send to sign order
            </Button>
          </div>
          {/* Why the button is off, beside the button — never a disabled control with
              its reason somewhere else on the page. */}
          {!sent && blockers.length > 0 ? (
            <p className="text-caption text-warning-muted-foreground lg:text-right">
              {blockers.join(" ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-b border-hairline" aria-hidden />
    </header>
  );
}

/* ──────────────────────────────────── the items ─────────────────────────────── */

/**
 * One passage of the order, as a numbered paragraph you can type into.
 *
 * The sentence is a field, but it is dressed as prose: no box until you reach for it,
 * a sunken fill on hover and a proper edge on focus. An order is a document, and a
 * document made of eight bordered inputs reads as a form to fill rather than words to
 * check.
 *
 * A blank is marked twice over on the scheduling item — the badge, the hint, the
 * required date field under it and the line beside the send button all naming one
 * missing date — so `showBlanks` turns the first two off there. One missing fact, one
 * place that says so, and it is the one with the control in it.
 */
function OrderItemRow({
  item,
  index,
  readOnly,
  showBlanks,
  onEdit,
  onRemove,
  scheduling,
}: {
  item: CognizanceOrderItem;
  index: number;
  readOnly: boolean;
  /** Whether this item's blanks are worth marking — see `OrderBody`. */
  showBlanks: boolean;
  onEdit: (text: string) => void;
  onRemove: () => void;
  scheduling: React.ReactNode;
}) {
  const slots = showBlanks ? itemOpenSlots(item) : [];
  const hintId = `order-item-${item.id}-hint`;

  /* The passage grows to its words rather than scrolling inside a fixed box, and so
     carries no resize grip — four grips down a page of prose are four pieces of
     furniture on a document. Written to the node rather than held in state: it is the
     rendered height of text, which only the browser knows. */
  const field = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [item.text]);

  return (
    <article className="flex flex-col gap-3 p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="flex min-w-0 items-baseline gap-2 text-body font-semibold">
          <span className="tabular-nums text-muted-foreground">{index}.</span>
          <span className="min-w-0">{item.label}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {slots.length > 0 ? (
            <Badge variant="warning">
              {slots.length === 1 ? "1 blank" : `${slots.length} blanks`}
            </Badge>
          ) : null}
          {item.fixed || readOnly ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${item.label} from this order`}
              onClick={onRemove}
            >
              <XIcon aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {/* Named by `aria-label`, not by a `<label for>`: the DS `Textarea` destructures
          `id` out of its props and only puts it back from a surrounding `Field`, so a
          standalone one renders with no id at all and nothing can point at it. Raised
          with the DS; until it lands, the name travels on the control itself. */}
      <Textarea
        ref={field}
        aria-label={`${item.label} — the words of this item`}
        aria-describedby={slots.length > 0 ? hintId : undefined}
        value={item.text}
        readOnly={readOnly}
        rows={1}
        onChange={(event) => onEdit(event.target.value)}
        className={cn(
          /* Pulled out by its own padding so the words line up with the item's
             number, while the hover well still has room to breathe around them. */
          "-mx-3 min-h-0 w-[calc(100%+1.5rem)] resize-none overflow-hidden border-transparent bg-transparent px-3 py-2 text-body text-pretty shadow-none transition-colors",
          "hover:bg-surface-sunken focus-visible:border-input focus-visible:bg-card",
          /* The primitive fills itself in dark (`dark:bg-input/30`), which would put a
             box back round every passage on the theme where prose needs it least. Held
             clear at rest, and given the dark side's own two steps for hover and focus. */
          "dark:bg-transparent dark:hover:bg-surface-raised dark:focus-visible:bg-input/30",
          /* Sent: the DS read-only fill is the honest look for a passage that can no
             longer be typed into, so only the hover is taken away. */
          readOnly && "hover:bg-transparent dark:hover:bg-transparent",
        )}
      />

      {slots.length > 0 ? (
        <p id={hintId} className="text-caption text-warning-muted-foreground">
          Fill {slots.join(", ")} before this order can be sent.
        </p>
      ) : null}

      {scheduling}
    </article>
  );
}

/**
 * The next listing's date and purpose, under the passage they are written into.
 *
 * On a hearing these two live in a box of their own at the top of the order, because
 * there the bench may decide there is no next date at all. Here there is no such choice
 * — both positive acts schedule a hearing (PRD §6) — so the fields belong to the
 * scheduling item, beneath the sentence they fill. Nothing is opted out of, so nothing
 * needs a tick.
 */
function NextHearingFields({
  date,
  purpose,
  disabled,
  onDate,
  onPurpose,
}: {
  date: string | null;
  purpose: CourtHearingPurposeId | null;
  disabled: boolean;
  onDate: (day: string | null) => void;
  onPurpose: (purpose: CourtHearingPurposeId) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface-sunken p-4 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-col gap-2 sm:w-56">
        <span id="next-date-label" className="w-fit text-body-compact font-medium">
          Date of next hearing
        </span>
        <div role="group" aria-labelledby="next-date-label">
          <DatePicker
            value={date ? parseIsoDay(date) : undefined}
            onValueChange={(nextDate) =>
              onDate(nextDate ? isoDay(nextDate) : null)
            }
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:w-64">
        <Label htmlFor="next-purpose" className="text-body-compact">
          Purpose of next hearing
        </Label>
        <Select
          value={purpose ?? undefined}
          disabled={disabled}
          onValueChange={(value) => onPurpose(value as CourtHearingPurposeId)}
        >
          <SelectTrigger id="next-purpose" className="w-full">
            <SelectValue placeholder="Choose a purpose" />
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
      {!date ? (
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground sm:pb-2.5">
          <CalendarIcon aria-hidden className="size-3.5 shrink-0" />
          Required
        </p>
      ) : null}
    </div>
  );
}

/** An order the judge has emptied — recoverable, so it says how. */
function EmptyOrder() {
  return (
    <Empty className="rounded-xl border border-hairline bg-card p-8 shadow-raised">
      <EmptyHeader>
        <EmptyTitle className="text-title-s font-semibold">
          Nothing left in this order
        </EmptyTitle>
        <EmptyDescription className="text-body">
          Add an item from the catalogue, or leave without passing an order.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/* ─────────────────────────────────── the rail ───────────────────────────────── */

/**
 * The catalogue, as a companion rail rather than half the screen.
 *
 * The composition arrived complete, so this is a drawer: sunken, to its own side of a
 * hairline, holding the twenty-five orders the register writes. A type the complaint
 * cannot take is listed with the reason beside it rather than hidden — on a screen where
 * the wrong omission is a missed order, a silently shorter list is the worse failure
 * (`order-templates.ts`).
 */
function CatalogueRail({
  chosen,
  disabled,
  onAdd,
}: {
  chosen: string[];
  disabled: boolean;
  onAdd: (id: OrderTemplateId) => void;
}) {
  const [query, setQuery] = React.useState("");

  /* Before cognizance and never mid-sitting: the two facts the catalogue's own gates
     are read against. Long pending is a later life of the case and cannot be true of a
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

  return (
    <aside
      aria-label="Add an item"
      className="shrink-0 border-t border-hairline bg-surface-sunken px-4 py-6 lg:sticky lg:top-14 lg:h-[calc(100svh-3.5rem)] lg:w-84 lg:self-start lg:overflow-y-auto lg:border-t-0 lg:border-l lg:px-6 dark:bg-background"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-body font-semibold">Add an item</h2>
          <p className="text-caption text-muted-foreground text-pretty">
            The order already carries what this act requires. Add to it only if this
            complaint needs something more.
          </p>
        </div>

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
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <section key={group.id} className="flex flex-col gap-2">
                <h3 className={EYEBROW}>{group.label}</h3>
                <ul className="flex flex-col gap-1">
                  {group.rows.map((template) => (
                    <li key={template.id}>
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
    </aside>
  );
}

/**
 * One catalogue row.
 *
 * Three states, and each says which it is in words: addable, already in the order, or
 * barred with the gate's own reason. Never colour alone, and never a row that simply
 * does nothing when pressed.
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
  const barred = reason !== null;
  const note = already ? "Already in this order" : reason;

  if (barred || already || disabled) {
    return (
      <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2">
        <span className="text-body-compact text-muted-foreground">
          {template.label}
        </span>
        {note ? <span className="text-caption text-muted-foreground">{note}</span> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      className="group/row flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-card focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none dark:hover:bg-surface-raised"
    >
      <PlusIcon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover/row:text-foreground"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-compact">{template.label}</span>
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
 * What happened, once the order has been sent.
 *
 * In place, at the head of the order it was drawn from — not a dialog that closes over
 * the thing the bench just passed. It says plainly that nothing has been issued, because
 * the signing queue is a fixture and an order that claimed otherwise would be a lie the
 * next screen could not honour.
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
      className="flex flex-col gap-3 rounded-xl border border-hairline bg-card p-6 shadow-raised md:flex-row md:items-center md:justify-between md:gap-6"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CircleCheckIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-success animate-in fade-in-0 zoom-in-50 duration-500 motion-reduce:animate-none"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-body font-semibold">{spec.settled}</p>
          <p className="text-body-compact text-muted-foreground text-pretty">
            The order is waiting to be signed. Nothing has been issued from this screen.
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
