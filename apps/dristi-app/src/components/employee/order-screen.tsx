"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  CalendarX2Icon,
  InboxIcon,
  ScrollTextIcon,
  UsersIcon,
} from "lucide-react";

import {
  RichTextField,
  type RichTextValue,
} from "@/components/cases/rich-text-field";
import { ListingApplicationDialog } from "@/components/employee/listing-application-dialog";
import { QueueSearchField } from "@/components/employee/queue-search-field";
import { SignMethodDialog } from "@/components/employee/sign-method-dialog";
import { useSignatureChoice } from "@/components/employee/sign-signature-fields";
import { useCourtToday } from "@/components/employee/use-court-today";
import { useHearingSession } from "@/components/employee/use-hearing-session";
import { useOrderDraft } from "@/components/employee/use-order-draft";
import { PANEL_CLASS } from "@/components/shell/panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  markHearingEnded,
  markHearingOngoing,
} from "@/lib/employee/hearing-session";
import {
  applicationsForListing,
  listingApplicationLabel,
  type ListingApplication,
  type ListingApplicationDecision,
} from "@/lib/employee/listing-applications";
import {
  causeTitle,
  counselFor,
  COURT_HEARING_PURPOSES,
  courtCaseStageLabel,
  courtHearingPurposeLabel,
  formatListingDate,
  hearingById,
  isoDay,
  parseIsoDay,
  withHearingSession,
  type CourtHearing,
  type CourtHearingPurposeId,
} from "@/lib/employee/hearings";
import { initialOrderDraft } from "@/lib/employee/order-demo";
import {
  appearancesFor,
  assembleItems,
  buildOrderDocument,
  nextUnhandledListing,
  type Appearance,
  type AttendanceMark,
  type OrderDocument,
  type ItemText,
  type OrderDraft,
  type OrderItemEntry,
} from "@/lib/employee/order-draft";
import {
  createOrderItem,
  orderItemLabel,
  type OrderItemDraft,
  type OrderItemTypeId,
} from "@/lib/employee/order-items";
import {
  likelyTemplatesFor,
  ORDER_GROUPS,
  ORDER_TEMPLATES,
  unavailableReason,
  type OrderCatalogueContext,
  type OrderGroupId,
} from "@/lib/employee/order-templates";

/**
 * Compose the order of one listing.
 *
 * Two regions under a band that names the matter. The left panel holds the sitting —
 * the applications standing in it, the present and absent rolls, when it is next listed
 * — and, behind the second tab, the catalogue of what the court passed. The right column
 * is the order itself, on paper: the court's own furniture around one ruled band that the
 * typist writes. A bar across the top carries the cause and the way on to the next
 * matter; a bar across the bottom carries the signature.
 *
 * **This build issues nothing.** The draft is held for this sitting and dies on a
 * reload. The paper on the page is the order as it will read. Sign order opens the
 * same Add-signature overlay the signing queues already run — e-sign or upload —
 * and Submit records that choice here only. Next hearing ends this listing and
 * calls the next one on the board — the same screen marks the cause list already
 * makes. Nothing files, notifies, or signs, and answering an application draws no
 * order.
 */
/**
 * Which half of the left panel is showing.
 *
 * The two clusters the owner separated: **sitting** is what happened at this listing —
 * the applications standing in it, who appeared, when it is next listed — and **orders**
 * is what the court passed. They are tabs rather than one scroll because the first is
 * finished in a single pass and the second wants the whole panel under it. Both keep
 * their count on the strip, so putting one away does not hide that it has something in
 * it.
 */
type SectionId = "applications" | "attendance" | "next" | "orders";

type SectionEntry = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * The panel's sections, in the order the bench works them.
 *
 * The applications standing in the matter are disposed of before the roll is called, the
 * roll is called before the matter is posted on, and what the court passed is set down
 * last. Each one carries its own mark in the rail, because filing four sections under two
 * headings — a "sitting" and an "orders" — put a seam through work that does not have
 * one, and made the order catalogue look like a different mode rather than the last thing
 * you do in this one.
 *
 * **No section gates the next.** An application can stand over, a roll can go unmarked, a
 * date can be left unset; all three genuinely happen, and the page says so in its muted
 * voice rather than the panel refusing to move. What a court record must not do is
 * quietly imply a fact nobody entered.
 */
/**
 * What a closed section says it got to.
 *
 * This is the part that makes one-at-a-time bearable. A section you cannot see is a
 * question you cannot answer, so every row states its own answer — and states it as the
 * fact, never as a tick. "Not marked" and "Not set" are real answers about a sitting;
 * a green check would claim the typist agreed to something they never touched.
 */
function sectionSummary(
  id: SectionId,
  draft: OrderDraft,
  pendingCount: number,
): string {
  if (id === "applications") {
    return pendingCount > 0 ? `${pendingCount} pending` : "None pending";
  }
  if (id === "attendance") {
    const marks = Object.values(draft.marks);
    const present = marks.filter((mark) => mark === "present").length;
    const absent = marks.filter((mark) => mark === "absent").length;
    if (present + absent === 0) return "Not marked";
    const parts: string[] = [];
    if (present > 0) parts.push(`${present} present`);
    if (absent > 0) parts.push(`${absent} absent`);
    return parts.join(", ");
  }
  if (id === "next") {
    if (draft.next === "none") return "Not being listed";
    return draft.nextDate ? formatListingDate(draft.nextDate) : "Not set";
  }
  return draft.items.length > 0 ? `${draft.items.length} added` : "None yet";
}

const SECTIONS: SectionEntry[] = [
  { id: "applications", title: "Applications", icon: InboxIcon },
  { id: "attendance", title: "Attendance", icon: UsersIcon },
  { id: "next", title: "Next hearing", icon: CalendarDaysIcon },
  { id: "orders", title: "Orders", icon: ScrollTextIcon },
];

export function OrderScreen({ hearingId }: { hearingId: string }) {
  const hearing = hearingById(hearingId);
  if (!hearing) return <OrderMissing />;
  /* Keyed on the listing so advancing to the next item opens a composer at the top of
     itself rather than inheriting this one's transient state. The draft is not in that
     state — it lives in `order-drafts.ts`, keyed by listing there. */
  return <OrderReady key={hearing.id} hearing={hearing} />;
}

function OrderMissing() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-8 p-6 md:p-8">
      <Empty className="border-0 p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX2Icon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="text-title-s font-semibold">
            This listing is not on the board
          </EmptyTitle>
          <EmptyDescription className="text-body">
            The order composer opens a matter from today&rsquo;s cause list. This
            one is not there.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/employee/hearings">Back to today&rsquo;s hearings</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function OrderReady({ hearing }: { hearing: CourtHearing }) {
  const router = useRouter();
  const session = useHearingSession();
  const today = useCourtToday();
  /* The sitting's own mark laid over the fixture, not the day's starting position: a
     matter the bench ended a moment ago is completed in the session and still scheduled
     in the data. */
  const status = withHearingSession([hearing], session)[0].status;
  /* What this listing opens on before anybody dictates — empty, until the sitting is
     over and the order it produced is already written (`order-demo.ts`). Memoised on
     primitives because it *is* the draft until the first edit, and a fresh object every
     render would restart the editor under the bench's hands. */
  const initial = React.useMemo(
    () => initialOrderDraft(hearing, status, today),
    [hearing, status, today],
  );
  const [draft, setDraft] = useOrderDraft(hearing.id, initial);
  const [signOpen, setSignOpen] = React.useState(false);
  /* Opens on the applications when one is standing in the matter, because that is the
     thing on this screen with a party waiting on the answer. With none pending there is
     nothing to answer, and the panel opens where the sitting actually starts. */
  const [section, setSection] = React.useState<SectionId | null>(() =>
    applicationsForListing(hearing.id).length > 0
      ? "applications"
      : "attendance",
  );
  const [announcement, setAnnouncement] = React.useState("");
  const [openApplication, setOpenApplication] =
    React.useState<ListingApplication | null>(null);
  const signRef = React.useRef<HTMLButtonElement>(null);
  const signature = useSignatureChoice("order");

  const appearances = React.useMemo(() => appearancesFor(hearing), [hearing]);
  const items = assembleItems(draft.items);
  const upNext = nextUnhandledListing(hearing, session);
  /* One document for the page and the preview. They print the same artefact, so they
     read it off the same object rather than each building their own. */
  const orderDocument = buildOrderDocument(hearing, draft, today);
  /* What the catalogue's own gates are read against. `longPending` is hard-coded false
     because `CourtHearing` does not carry the flag yet — `CaseRecord.longPending` exists
     on the advocate side and has never been threaded across. Recorded as a build gap in
     §11 of the brief: until it is, the two long-pending register orders answer to a
     matter that always says "not long pending". */
  const catalogue: OrderCatalogueContext = {
    cognizanceDue: hearing.stage === "cognizance",
    longPending: false,
    hearingOngoing: true,
  };

  /* Only what is still pending. The reference labels every row "Pending — …", so a row
     that has been answered has left the strip; the answer is in the order, which is
     where the bench reads what it has done. */
  const pending = React.useMemo(
    () =>
      applicationsForListing(hearing.id).filter(
        (application) => !draft.applications[application.id],
      ),
    [hearing.id, draft.applications],
  );

  /**
   * Mark one appearance present or absent.
   *
   * The reference offers two independent checkbox columns, and this keeps both — but a
   * person holds one mark, so ticking present clears absent for that person and the
   * other box goes back up. The alternative is an order that says a party was both
   * present and absent, which is not a state a court record can be in.
   */
  function setMark(id: string, mark: AttendanceMark | undefined) {
    setDraft((current) => ({
      ...current,
      marks: { ...current.marks, [id]: mark },
    }));
  }

  /**
   * Add what the court passed, on its standing words.
   *
   * The words arrive with the item because that is the difference between the two seats
   * this screen serves: the bench dictates an order it is making, and the typist sets
   * down one the court already made, from the court's own form. Nothing is committed by
   * adding it — the paragraph is editable the moment it lands, and the whole draft still
   * dies on a reload (`order-drafts.ts`).
   */
  function addItem(type: OrderItemTypeId) {
    const item = createOrderItem(type);
    const number = draft.items.length + 1;
    setDraft((current) => ({ ...current, items: [...current.items, item] }));
    setAnnouncement(
      item.text.text
        ? `${orderItemLabel(type)} added as item ${number}. Its text is written in the order and can be edited.`
        : `${orderItemLabel(type)} added as item ${number}. It has no standing text — write it in the order.`,
    );
  }

  function removeItem(item: OrderItemDraft, number: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((entry) => entry.id !== item.id),
    }));
    /* Renumbering is a fact about the order, so it is said — but only when something
       actually moved. Removing the last item renumbers nothing. */
    const following = draft.items.length - number;
    setAnnouncement(
      following > 0
        ? `Item ${number}, ${orderItemLabel(item.type)}, removed. The ${following === 1 ? "item" : `${following} items`} after it moved up.`
        : `Item ${number}, ${orderItemLabel(item.type)}, removed.`,
    );
  }

  function setItemText(id: string, text: ItemText) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((entry) =>
        entry.id === id ? { ...entry, text } : entry,
      ),
    }));
  }

  /**
   * Answer one application, from the row.
   *
   * The answer is a sentence in the draft order and nothing else — no bail is granted
   * and no hearing moves (`listing-applications.ts`). It is kept in the draft rather
   * than in this component's state for the same reason the marks and the item are: Next
   * hearing unmounts the composer, and an answer given on item 4 must still be there if
   * the bench comes back to it.
   */
  function decide(
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) {
    setDraft((current) => ({
      ...current,
      applications: { ...current.applications, [application.id]: decision },
    }));
    setOpenApplication(null);
    setAnnouncement(
      `${listingApplicationLabel(application)}, ${application.number}, is ${decision}. The order records it.`,
    );
  }

  /**
   * End this listing and call the next one on the board.
   *
   * Both marks already exist on the cause list, and the sitting holds a single ongoing
   * listing — so navigating without ending would land on a composer the sitting has
   * locked, and calling the next matter without ending this one would silently return
   * this one to scheduled. The pair is the act a bench actually performs.
   *
   * Neither mark files, signs or notifies anything (`hearing-session.ts`).
   */
  function advance() {
    markHearingEnded(hearing.id);
    if (!upNext) {
      router.push("/employee/hearings");
      return;
    }
    markHearingOngoing(upNext.id);
    router.push(`/employee/hearings/${upNext.id}/order`);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* The cause, and the way on. `top-14` rather than `top-0`: the chrome's own bar
          is `sticky top-0` and 3.5rem tall, so this comes to rest directly under it
          instead of sliding beneath its fill. */}
      {/* The cause, the matter it belongs to, and the way on — one header, not a title
          with a second band ruled off beneath it. The facts *are* the subtitle: they say
          which listing this is, and a rule between them and the name they qualify made
          them read as a separate region with its own business. */}
      <header className="sticky top-14 z-20 flex flex-col gap-3 border-b border-hairline bg-card px-6 py-4 sm:flex-row sm:items-start sm:justify-between md:px-8">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-title min-w-0 text-balance font-semibold">
            Order : {causeTitle(hearing)}
          </h1>
          <MatterFacts hearing={hearing} />
        </div>
        <Button
          type="button"
          className="w-full shrink-0 sm:w-fit"
          onClick={advance}
        >
          {upNext ? "Next hearing" : "End hearing"}
        </Button>
      </header>

      {/* The split the owner drew. Left: what the court did at this sitting, and what it
          passed — one at a time behind a tab strip, because the sitting's facts are
          finished in one pass and the catalogue is the region that wants the whole panel
          under it. Right: the order those entries make, on paper.

          The column between the white header and footer is the scoped work canvas:
          `bg-muted` in light so the panels read against the same tone as the rail; dark
          stays `bg-background` because muted sits *above* card there (FilingMain). */}
      <div className="flex min-w-0 flex-1 bg-muted p-6 md:p-8 dark:bg-background">
        {/* One panel, two columns inside it. The sitting's controls and the order they
            write are one piece of work, so they take one container and a seam — not two
            cards with a gutter between them, which said they were separate things. */}
        <Card
          className={cn(
            PANEL_CLASS,
            "grid min-w-0 flex-1 gap-0 overflow-hidden p-0 lg:grid-cols-3",
          )}
        >
          {/* No seam: the well beside it changes fill, and a fill change already
              separates two regions. A rule here would be a stroke doing work the
              surface has done. */}
          <div className="flex min-w-0 flex-col gap-6 p-6">
            {/* Four sections, one open at a time, and **the closed ones say where they
                got to**. That is the whole reason this beat an icon rail: a rail can
                show you four marks but not one fact, so the panel had nothing in it and
                the way on ended up below the fold. A row that reads "Attendance — not
                marked" is the state and the way back to it in the same line.

                `Collapsible` and not `Accordion`: the DS `Accordion` renders its header
                as a fixed `h3`, which would skip a level under this page's `h1` (D16 on
                this screen made the same call for the same reason).

                Not D16's mechanism, which was reversed. That folded the roll *for you*
                once every appearance was marked, and bought nothing on arrival because
                the screen opens unmarked. This is the navigation itself: it moves when
                you move, never on its own.

                **The rows are the only way through, and they are enough.** A "Next"
                inside each open section was a second control doing what the row below it
                already did, on a panel where all four rows are always in view. Nothing
                gates the move either way: an application can stand over, a roll can go
                unmarked, a date can be left unset, and the page prints the gap rather
                than the panel refusing to move on. */}
            <div className="flex min-w-0 flex-col divide-y divide-hairline">
              {SECTIONS.map((entry) => {
                const Icon = entry.icon;
                const open = entry.id === section;
                const headingId = `order-section-${entry.id}`;
                return (
                  <Collapsible
                    key={entry.id}
                    open={open}
                    /* Opening one closes the others; closing the open one closes
                       everything. **All four shut is a real state and a useful one** —
                       every row carries its own answer, so the collapsed panel is the
                       whole sitting at a glance rather than an empty screen. An earlier
                       revision refused the last close on the grounds that it showed
                       nothing; that was true of a rail with no summaries on it and has
                       not been true since the rows started carrying them (owner,
                       2026-09-13). */
                    onOpenChange={(next) => setSection(next ? entry.id : null)}
                    className="min-w-0 py-1"
                  >
                    <h2 id={headingId} tabIndex={-1} className="min-w-0">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex min-h-10 w-full min-w-0 items-center gap-3 rounded-lg px-2 text-start transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
                        >
                          <Icon
                            aria-hidden
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          <span
                            className={cn(
                              "text-body min-w-0 flex-1",
                              open ? "font-semibold" : "font-medium",
                            )}
                          >
                            {entry.title}
                          </span>
                          {/* The fact, not a second name for the section. Closed, this
                              is the only thing the row is for. */}
                          <span className="text-caption shrink-0 text-muted-foreground">
                            {sectionSummary(entry.id, draft, pending.length)}
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
                      <div className="flex min-w-0 flex-col gap-4 px-2 pt-4 pb-2">
                        <SectionBody
                          entry={entry}
                          draft={draft}
                          pending={pending}
                          appearances={appearances}
                          items={draft.items}
                          headingId={headingId}
                          purpose={hearing.purpose}
                          catalogue={catalogue}
                          onOpen={setOpenApplication}
                          onDecide={decide}
                          onMark={setMark}
                          onAdd={addItem}
                          onRemove={removeItem}
                          onSkip={(skip) =>
                            setDraft((current) => ({
                              ...current,
                              next: skip ? "none" : "list",
                            }))
                          }
                          onPurpose={(nextPurpose) =>
                            setDraft((current) => ({ ...current, nextPurpose }))
                          }
                          onDate={(nextDate) =>
                            setDraft((current) => ({ ...current, nextDate }))
                          }
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>

          {/* The document's surround. A well is where a sunken fill belongs — inside a
              panel — and it is what makes the sheet read as a sheet: the page is not the
              container, it is a thing lying on one. */}
          <div className="flex min-w-0 bg-surface-sunken p-6 lg:col-span-2 md:p-8">
            <OrderPaper
              document={orderDocument}
              hearing={hearing}
              items={draft.items}
              entries={items.items ?? []}
              onItemText={setItemText}
            />
          </div>
        </Card>
      </div>

      <footer className="sticky bottom-0 z-30 border-t border-hairline bg-card px-6 py-3 md:px-8 md:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            ref={signRef}
            type="button"
            className="w-full sm:w-fit"
            onClick={() => {
              signature.reset();
              setSignOpen(true);
            }}
          >
            Sign order
          </Button>
        </div>
      </footer>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <ListingApplicationDialog
        hearing={hearing}
        application={openApplication}
        onOpenChange={setOpenApplication}
        onAllow={(application) => decide(application, "allowed")}
        onDismiss={(application) => decide(application, "dismissed")}
        /* The row that opened the overlay is gone by the time it closes — answering
           takes it out of the strip — so focus goes to the heading the strip sits
           under rather than to a control that no longer exists. */
        onReturnFocus={() => {
          document.getElementById("order-section-applications")?.focus();
        }}
      />

      <SignMethodDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          signRef.current?.focus();
        }}
        noun="order"
        subject={`You are adding your signature to the order in ${hearing.caseNumber}.`}
        warning="Signing publishes this order and cannot be reversed."
        choice={signature}
        onSubmit={() => {
          setSignOpen(false);
          setAnnouncement(
            "Signature recorded for this sitting. Nothing has been filed or published.",
          );
        }}
      />
    </div>
  );
}

/**
 * The controls of one section. Its name and its state are on the row that opens it, so
 * nothing here repeats them.
 */
function SectionBody({
  entry,
  draft,
  pending,
  appearances,
  items,
  headingId,
  purpose,
  catalogue,
  onOpen,
  onDecide,
  onMark,
  onAdd,
  onRemove,
  onSkip,
  onPurpose,
  onDate,
}: {
  entry: SectionEntry;
  /** Where focus goes when an answered or removed row leaves a list in here. */
  headingId: string;
  purpose: CourtHearingPurposeId;
  catalogue: OrderCatalogueContext;
  draft: OrderDraft;
  pending: ListingApplication[];
  appearances: Appearance[];
  items: readonly OrderItemDraft[];
  onOpen: (application: ListingApplication) => void;
  onDecide: (
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) => void;
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
  onAdd: (type: OrderItemTypeId) => void;
  onRemove: (item: OrderItemDraft, number: number) => void;
  onSkip: (skip: boolean) => void;
  onPurpose: (purpose: CourtHearingPurposeId | "") => void;
  onDate: (day: string | null) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {entry.id === "applications" ? (
        pending.length > 0 ? (
          <PendingApplications
            applications={pending}
            onOpen={onOpen}
            onDecide={onDecide}
          />
        ) : (
          <p className="text-body text-muted-foreground">
            No application is standing in this matter.
          </p>
        )
      ) : null}

      {entry.id === "attendance" ? (
        <div className="flex min-w-0 flex-col gap-6">
          <MarkGroup
            heading="Who is present"
            mark="present"
            appearances={appearances}
            marks={draft.marks}
            onMark={onMark}
          />
          <MarkGroup
            heading="Who is absent"
            mark="absent"
            appearances={appearances}
            marks={draft.marks}
            onMark={onMark}
          />
        </div>
      ) : null}

      {entry.id === "next" ? (
        <NextHearingDetails
          draft={draft}
          onSkip={onSkip}
          onPurpose={onPurpose}
          onDate={onDate}
        />
      ) : null}

      {entry.id === "orders" ? (
        <OrderItems
          items={items}
          onAdd={onAdd}
          onRemove={onRemove}
          headingId={headingId}
          purpose={purpose}
          catalogue={catalogue}
        />
      ) : null}
    </div>
  );
}

/**
 * The applications standing in this matter, and the bench's answer to each.
 *
 * The reference decides them on the row — View to read the paper, then Reject or
 * Accept — and that is the point of putting them here rather than in a review queue: an
 * interlocutory application is answered *in* the hearing it is pending on, by a
 * magistrate who has the file open in front of them. A modal per application is the
 * queue's workflow, and the queue is the work between sittings.
 *
 * The tint is the reference's cream: waiting on this bench is a status, so it takes the
 * warning pair rather than a neutral well, and the row says "Pending" as well as wearing
 * the fill — status is never colour alone (ACCESSIBILITY §3).
 *
 * *A quieter row — no tint, no decisions, one Review, with the filer and the filing date
 * in their place — was built on 2026-09-13 and reverted the same day on the owner's
 * verdict. §5 D44 keeps the argument and the outcome; this is the shape that stands.*
 */
function PendingApplications({
  applications,
  onOpen,
  onDecide,
}: {
  applications: ListingApplication[];
  onOpen: (application: ListingApplication) => void;
  onDecide: (
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) => void;
}) {
  return (
    <ul className="flex min-w-0 flex-col gap-2">
      {applications.map((application) => (
        <li
          key={application.id}
          className="flex min-w-0 flex-col gap-3 rounded-lg bg-warning-muted p-4 text-warning-muted-foreground"
        >
          {/* The column is a third of the panel, so the title takes its own line and the
              controls sit under it. Sitting them beside a wrapping title is what broke
              this row once: `sm:` is the viewport's width, not this column's. */}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body-compact min-w-0 font-medium">
              Pending &mdash; {listingApplicationLabel(application)}
            </p>
            <p className="text-caption tabular-nums">{application.number}</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {/* `text-foreground` on the ghost control: the two filled ones bring their
                own fill, so their labels sit on that and not on the amber, and without it
                this one would inherit the tint's ink and jump to neutral on hover. */}
            <Button
              type="button"
              variant="ghost"
              className="text-foreground"
              onClick={() => onOpen(application)}
            >
              View
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDecide(application, "dismissed")}
            >
              Reject
            </Button>
            <Button
              type="button"
              onClick={() => onDecide(application, "allowed")}
            >
              Accept
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * One of the reference's two attendance columns — present, or absent.
 *
 * A `fieldset` with the heading as its `legend`, so a screen reader announcing any box
 * in it says which roll it belongs to. Two columns, not four: four-across in this
 * panel squeezed long labels into ~125px. Each box still carries the 40×40 hit
 * area the DS primitive builds in.
 *
 * Legend is `display: table` in the UA stylesheet, so it does not take part in the
 * fieldset's flex gap — `mb-3` is the spacing that actually lands under the heading.
 */
function MarkGroup({
  heading,
  mark,
  appearances,
  marks,
  onMark,
}: {
  heading: string;
  mark: AttendanceMark;
  appearances: Appearance[];
  marks: OrderDraft["marks"];
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
}) {
  const group = React.useId();
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="text-body mb-3 w-full font-semibold">{heading}</legend>
      {/* One per line. `sm:` measures the viewport, and this column is a third of the
          panel at every width above it — two-up here is what wrapped "Advocate for the
          complainant" across three lines. */}
      <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-3">
        {appearances.map((appearance) => {
          const id = `${group}-${appearance.id}`;
          /* A side may have two counsel on record, and two controls with the same
             accessible name is a control a voice user cannot ask for by name. The
             name disambiguates only where the role does not. */
          const ambiguous =
            appearances.filter((other) => other.role === appearance.role)
              .length > 1;
          return (
            <div
              key={appearance.id}
              className="flex min-h-10 min-w-0 items-center gap-3"
            >
              <Checkbox
                id={id}
                checked={marks[appearance.id] === mark}
                onCheckedChange={(checked) =>
                  onMark(appearance.id, checked === true ? mark : undefined)
                }
              />
              <Label htmlFor={id} className="text-body min-w-0 font-normal">
                {ambiguous
                  ? `${appearance.role} — ${appearance.name}`
                  : appearance.role}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Where the matter is posted to — the reference's third block.
 *
 * Skip is a checkbox rather than a pair of buttons because that is what the reference
 * offers, and it reads correctly: listing the matter again is the ordinary course, and
 * skipping is the exception you tick. The two fields under it stay visible when it is
 * ticked and go disabled, so the block does not change height under the pointer that
 * just ticked it.
 */
function NextHearingDetails({
  draft,
  onSkip,
  onPurpose,
  onDate,
}: {
  draft: OrderDraft;
  onSkip: (skip: boolean) => void;
  onPurpose: (purpose: CourtHearingPurposeId | "") => void;
  onDate: (day: string | null) => void;
}) {
  const skipId = React.useId();
  const skipped = draft.next === "none";
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-start gap-2">
        <Checkbox
          id={skipId}
          className="mt-1"
          checked={skipped}
          onCheckedChange={(checked) => onSkip(checked === true)}
        />
        <Label htmlFor={skipId} className="text-body min-w-0 font-normal">
          Skip scheduling next hearing
        </Label>
      </div>

      <Field className="min-w-0">
        <FieldLabel className="text-body font-medium">
          Purpose of hearing
        </FieldLabel>
        <Select
          value={draft.nextPurpose || undefined}
          disabled={skipped}
          onValueChange={(value) => onPurpose(value as CourtHearingPurposeId)}
        >
          <SelectTrigger className="w-full">
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
      </Field>

      {/* `DatePicker` owns its trigger and takes no `id`, so the visible label names a
          group around it rather than pointing `htmlFor` at a control that does not
          exist. Same pattern as today's hearings filter. */}
      <div className="flex min-w-0 flex-col gap-2">
        <span
          id="order-next-date-label"
          className="text-body w-fit font-medium"
        >
          Next date of hearing
        </span>
        <div role="group" aria-labelledby="order-next-date-label">
          <DatePicker
            value={draft.nextDate ? parseIsoDay(draft.nextDate) : undefined}
            disabled={skipped}
            onValueChange={(next) => onDate(next ? isoDay(next) : null)}
            placeholder="Pick a date"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * What the court passed today, chosen from the court's own catalogue.
 *
 * **Choosing the order is what writes it.** A typist is not composing a direction from
 * nothing; they are setting down one the court has already made, from the court's
 * standing form. So the catalogue is the instrument, and since 2026-09-13 it is the real
 * one — the twenty-seven templates of `order-templates.ts`.
 *
 * Built to the owner's reference screen, which arranges it in three parts:
 *
 * 1. **Likely at this hearing.** The source maps every hearing purpose to the orders it
 *    usually produces, so a matter listed for evidence offers witness batta and a witness
 *    summons first, each captioned with the workflow it sets in motion — which is what
 *    the reference's tiles were showing. One per line rather than the reference's 2-up:
 *    its rail is wider than this column, and "Moving case out of long pending register"
 *    does not survive a 145px tile.
 * 2. **A search field over four groups**, which is the reference's own browse and
 *    replaces the `Combobox` an earlier revision used. The trade is deliberate: a
 *    combobox is faster for a typist who knows the word and shows *nothing* to one who
 *    does not, because its list only exists while the menu is open. Four standing rows
 *    say how much catalogue there is before anyone types.
 * 3. **Every order in its group, including the ones this matter cannot take**, each with
 *    the reason under it. The source gates several types on the state of the case, and a
 *    silently shorter list is the worse failure on a screen where the missing order is
 *    the one that mattered.
 *
 * **A note on the counts, because they will not match the reference.** The reference
 * shows 5 / 7 / 10 / 6 — twenty-eight, one more than the catalogue holds — and its
 * **Accept / Reject** group is offered as something to browse. Under the source, every
 * accept/reject order is marked *not in dropdown*: they are reached from the application
 * that produces them and never chosen from a list. So that group stands here with its
 * five rows all reading "Comes from an application". Nothing is hidden and nothing lies
 * about being available. The source itself lists grouping as one of two things it has yet
 * to supply, so this is provisional either way.
 */
function OrderItems({
  items,
  onAdd,
  onRemove,
  headingId,
  purpose,
  catalogue,
}: {
  items: readonly OrderItemDraft[];
  onAdd: (type: OrderItemTypeId) => void;
  onRemove: (item: OrderItemDraft, number: number) => void;
  /** Where focus goes when a removed row leaves the list. */
  headingId: string;
  purpose: CourtHearingPurposeId;
  catalogue: OrderCatalogueContext;
}) {
  const [query, setQuery] = React.useState("");
  const [openGroup, setOpenGroup] = React.useState<OrderGroupId | null>(null);

  const likely = likelyTemplatesFor(purpose, catalogue);
  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;

  const groups = ORDER_GROUPS.map((group) => {
    const all = ORDER_TEMPLATES.filter((entry) => entry.group === group.id);
    return {
      ...group,
      rows: searching
        ? all.filter((entry) => entry.label.toLowerCase().includes(needle))
        : all,
    };
  });

  function add(type: OrderItemTypeId) {
    onAdd(type);
    setQuery("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {likely.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-caption font-semibold text-muted-foreground">
            Likely at this hearing
          </p>
          <ul className="flex min-w-0 flex-col gap-2">
            {likely.map((template) => (
              <li key={template.id} className="min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full flex-col items-start gap-0.5 px-3 py-2 text-start whitespace-normal"
                  onClick={() => add(template.id)}
                >
                  <span className="text-body-compact font-medium">
                    {template.label}
                  </span>
                  {template.workflow ? (
                    <span className="text-caption text-muted-foreground">
                      {template.workflow}
                    </span>
                  ) : null}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col gap-3">
        <QueueSearchField
          label="Search orders"
          value={query}
          onChange={setQuery}
          placeholder="Search the catalogue"
          className="w-full"
        />

        <div className="flex min-w-0 flex-col divide-y divide-hairline">
          {groups.map((group) => {
            /* A search opens whatever it found and leaves the rest shut, so the result
               is on screen without the typist opening four groups to look for it. */
            const open = searching
              ? group.rows.length > 0
              : openGroup === group.id;
            return (
              <Collapsible
                key={group.id}
                open={open}
                onOpenChange={(next) =>
                  setOpenGroup(next ? group.id : null)
                }
                className="min-w-0 py-1"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    disabled={searching && group.rows.length === 0}
                    className="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-start transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:opacity-50"
                  >
                    <ChevronDownIcon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                        open && "rotate-180",
                      )}
                    />
                    <span className="text-body-compact min-w-0 flex-1 font-medium">
                      {group.label}
                    </span>
                    <span className="text-caption shrink-0 text-muted-foreground tabular-nums">
                      {group.rows.length}
                    </span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent className="min-w-0">
                  <ul className="flex min-w-0 flex-col gap-0.5 ps-8 pt-1 pb-2">
                    {group.rows.map((template) => {
                      const reason = unavailableReason(template, catalogue);
                      if (reason) {
                        return (
                          <li
                            key={template.id}
                            className="flex min-w-0 flex-col px-2 py-1.5"
                          >
                            <span className="text-body-compact text-muted-foreground">
                              {template.label}
                            </span>
                            <span className="text-caption text-muted-foreground">
                              {reason}
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li key={template.id} className="min-w-0">
                          <button
                            type="button"
                            onClick={() => add(template.id)}
                            className="flex min-h-10 w-full min-w-0 flex-col items-start justify-center gap-0.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
                          >
                            <span className="text-body-compact">
                              {template.label}
                            </span>
                            {template.workflow ? (
                              <span className="text-caption text-muted-foreground">
                                {template.workflow}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>

        {/* The escape from the catalogue, kept deliberately quiet. It is not one of the
            court's twenty-seven and must not look like one. */}
        <Button
          type="button"
          variant="ghost"
          className="w-fit"
          onClick={() => add("others")}
        >
          Something else
        </Button>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-caption font-semibold text-muted-foreground">
          In this order
        </p>
        {items.length === 0 ? (
          <p className="text-body text-muted-foreground">
            Nothing has been added yet. Choose an order and its words are written
            into the page beside you.
          </p>
        ) : (
          <ol className="flex min-w-0 flex-col gap-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex min-h-10 min-w-0 items-center justify-between gap-3 rounded-lg bg-surface-sunken px-3 py-2"
              >
                <p className="text-body-compact min-w-0">
                  <span className="tabular-nums">{index + 1}.</span>{" "}
                  {orderItemLabel(item.type)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => {
                    onRemove(item, index + 1);
                    document.getElementById(headingId)?.focus();
                  }}
                >
                  Remove
                  {/* The visible word is the same for every row, so the name a voice user
                      says is prefixed by it and finished by the order it belongs to. */}
                  <span className="sr-only"> {orderItemLabel(item.type)}</span>
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/**
 * Which listing this is — the line under the cause name.
 *
 * The screen used to open on a cause title and nothing else: no serial, no case number,
 * no stage, no purpose. A typist just handed the file needs those four before they can
 * set anything down, and the stage in particular is not decoration — the court's
 * catalogue makes several orders available only once the case is on file and others only
 * on a long-pending one, so hiding it leaves the typist unable to see why a form is
 * offered here and not on the matter before it.
 *
 * It sits **inside** the header, under the name it qualifies (owner, 2026-09-13). It was
 * a band of its own with a rule above and below it, and that gave a subtitle the weight
 * of a region — two horizontal rules stacked four rows apart, for one line of text that
 * belongs to the heading.
 *
 * No fill and no stroke of its own: the header it lives in is already chrome.
 */
function MatterFacts({ hearing }: { hearing: CourtHearing }) {
  /* `figures` is not styling for its own sake: the serial and the case number sit in a
     row the eye runs along, and a stage or a purpose is a word. Lining figures on a word
     buys nothing and costs the shape of it. */
  const rows: { label: string; value: string; figures: boolean }[] = [
    { label: "Item", value: String(hearing.item), figures: true },
    { label: "Case", value: hearing.caseNumber, figures: true },
    {
      label: "Stage",
      value: courtCaseStageLabel(hearing.stage),
      figures: false,
    },
    {
      label: "Today for",
      value: courtHearingPurposeLabel(hearing.purpose),
      figures: false,
    },
  ];
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1">
      {rows.map((row) => (
        <p key={row.label} className="flex min-w-0 items-baseline gap-2">
          <span className="text-caption font-medium text-muted-foreground">
            {row.label}
          </span>
          <span
            className={cn("text-body-compact", row.figures && "tabular-nums")}
          >
            {row.value}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * The order, on paper, as the thing the typist is actually making.
 *
 * This replaces a panel of three labelled boxes — an attendance box, an item box and a
 * next-hearing box — that described an order without ever being one. The owner's
 * reference puts the document itself in this column and it is right to: the typist is
 * setting down a page a court will read, and a page is the only honest preview of a
 * page. The furniture around the writing is the court's own — the cause heading, the
 * roll of parties and their counsel, the offence, attendance, the next posting, the
 * signature — and none of it is typed, because every one of those facts is already
 * known to the listing.
 *
 * `paper` is the DS family for exactly this and for nothing else: a fixed facsimile that
 * does not invert in dark, because a printed page does not change colour with the
 * product palette. It is the same treatment the signing queue uses on the same artefact,
 * so what the bench reads back here is what it will see when it comes to sign.
 *
 * **The writable band is ruled off.** Between the attendance line and the next posting
 * sits the one region that is composed rather than known, and it carries the editors.
 * The rules above and below it are the reference's own, and they earn their place: they
 * say where the court's standing furniture stops and the typist's work begins.
 */
function OrderPaper({
  className,
  document: order,
  hearing,
  items,
  entries,
  onItemText,
}: {
  className?: string;
  document: OrderDocument;
  hearing: CourtHearing;
  items: readonly OrderItemDraft[];
  entries: OrderItemEntry[];
  onItemText: (id: string, value: RichTextValue) => void;
}) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-6 rounded-lg bg-paper p-8 text-paper-foreground md:p-12",
        className,
      )}
      aria-labelledby="order-paper"
    >
      <header className="flex flex-col gap-4">
        <p className="text-body text-center font-semibold text-balance">
          {order.court}
        </p>
        <dl className="flex flex-col gap-1">
          <PaperFact label="Case no." value={order.caseNumber} />
          <PaperFact label="In the matter of" value={order.matter} />
          <PaperFact label="Dated" value={order.dated} />
        </dl>
      </header>

      <PartyRoll hearing={hearing} />

      {/* Every case on this platform is a cheque-dishonour prosecution, so the offence
          is a fact about the page rather than something the typist chooses. An order
          sheet names it above the operative part. */}
      <p className="text-caption text-center text-paper-muted-foreground">
        Offence under S. 138 of the Negotiable Instruments Act, 1881
      </p>

      {/* Set as an order sheet sets it: the word alone, centred, spaced. Uppercase
          tracking is opened rather than tightened, which is the one direction small
          text may be letterspaced. */}
      <h2
        id="order-paper"
        className="text-body-compact text-center font-semibold uppercase tracking-wide"
      >
        {order.title}
      </h2>

      <p className="text-body-compact">{order.opening}</p>

      {order.applications.length > 0 ? (
        <div className="flex flex-col gap-2">
          {order.applications.map((sentence) => (
            <p
              key={sentence.text}
              className={cn(
                "text-body-compact",
                sentence.pending && "text-paper-muted-foreground",
              )}
            >
              {sentence.text}
            </p>
          ))}
        </div>
      ) : null}

      {/* The composed region. Ruled top and bottom so the page says where the court's
          own furniture stops and the typing starts. */}
      <div className="flex min-w-0 flex-col gap-4 border-y border-paper-border py-6">
        {items.length === 0 ? (
          <p className="text-body-compact text-paper-muted-foreground">
            Nothing has been passed yet. Add what the court ordered under
            <span className="font-medium"> Orders</span> and its words are written
            here for you to correct.
          </p>
        ) : (
          items.map((item, index) => (
            <OrderItemWell
              key={item.id}
              number={entries[index]?.number ?? index + 1}
              heading={entries[index]?.heading ?? ""}
              value={item.text}
              onChange={(value) => onItemText(item.id, value)}
            />
          ))
        )}
      </div>

      <p className="text-body-compact">{order.closing}</p>

      {/* The page is a page: what is written stops where it stops, and the signature
          sits at the foot of the sheet rather than crowding up under the last line.
          `aria-hidden` because it is space, not content. */}
      <div aria-hidden className="min-h-8 flex-1" />

      <p className="text-body-compact text-end text-paper-muted-foreground">
        {order.signature}
      </p>
    </article>
  );
}

/** One label-and-value line of the page's heading block. */
function PaperFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <dt className="text-body-compact font-semibold">{label}</dt>
      <dd className="text-body-compact min-w-0">{value}</dd>
    </div>
  );
}

/**
 * Who is on the cause, and who appears for them.
 *
 * The reference prints this roll and an order does carry it, but the reason to build it
 * is narrower: the composer names parties in the words it writes, and a typist correcting
 * "Issue summons to Anand Traders" should be able to see, on the same page, that Anand
 * Traders is the accused and that Adv. Rekha Pillai is on record for them.
 *
 * A side with no vakalat prints a dash rather than an empty cell — the absence is a fact
 * about the matter, and a blank reads as a rendering fault.
 */
function PartyRoll({ hearing }: { hearing: CourtHearing }) {
  /* Capitalised here rather than through `partySideLabel`, which returns the word as it
     reads mid-sentence ("the complainant is present"). A table cell is a heading for the
     row, not a clause. */
  const sides = [
    {
      side: "complainant" as const,
      label: "Complainant",
      name: hearing.parties.complainant,
    },
    {
      side: "accused" as const,
      label: "Accused",
      name: hearing.parties.accused,
    },
  ];
  return (
    <table className="w-full border-collapse text-start">
      <thead>
        <tr className="border-b border-paper-border">
          {["Party", "Name", "Advocate"].map((head) => (
            <th
              key={head}
              scope="col"
              className="text-caption px-0 py-2 text-start font-semibold text-paper-muted-foreground"
            >
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sides.map((entry) => {
          const counsel = counselFor(hearing, entry.side);
          return (
            <tr key={entry.side} className="border-b border-paper-border">
              <td className="text-body-compact py-2 pe-4 align-top">
                {entry.label}
              </td>
              <td className="text-body-compact py-2 pe-4 align-top">
                {entry.name}
              </td>
              <td className="text-body-compact py-2 align-top">
                {counsel.length > 0
                  ? counsel.map((lawyer) => lawyer.name).join(", ")
                  : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * One numbered paragraph of the order.
 *
 * The editor is uncontrolled after it mounts (`rich-text-field.tsx` keeps the markup it
 * opened on), which is why the caller keys these on the item's id: a key that moved with
 * position would hand item two's words to item three the moment one above it was removed.
 */
function OrderItemWell({
  number,
  heading,
  value,
  onChange,
}: {
  number: number;
  heading: string;
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
}) {
  const labelId = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={labelId} className="text-body-compact w-fit font-semibold">
        <span className="tabular-nums">{number}.</span> {heading}
      </span>
      <RichTextField
        value={value}
        onChange={onChange}
        labelId={labelId}
        className="[&_[data-slot=input-group-control]]:min-h-32"
      />
    </div>
  );
}
