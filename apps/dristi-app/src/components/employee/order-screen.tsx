"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CalendarX2Icon,
  InboxIcon,
  PencilIcon,
  ScrollTextIcon,
  XIcon,
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
import { CURRENT_STAFF, PRESIDING_MAGISTRATE } from "@/lib/employee/content";
import { Badge } from "@/components/ui/badge";
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
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type CounselSide,
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
  orderTemplateFacts,
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
  applicationForOrder,
  cognizanceDueFor,
  noSuggestionsNote,
  orderSuggestions,
  suggestionCaption,
  type AttendanceSignal,
  type OrderSuggestion,
} from "@/lib/employee/order-suggestions";
import {
  ORDER_GROUPS,
  ORDER_TEMPLATES,
  hasTemplateText,
  openSlots,
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
/**
 * Which half of the left panel is showing.
 *
 * Only two things live here now. Attendance and the next listing moved into the page on
 * 2026-09-14 (D45) — they are sentences the order itself says, so they are edited in the
 * place they appear — and what is left is the work the court passed and the applications
 * standing in the matter. Those two *are* alternatives, which is what a tab is for; the
 * four-section accordion this replaces was carrying a sequence and a pair of alternatives
 * in one instrument.
 */
type PanelId = "orders" | "applications";

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
            The order composer opens a matter from today&rsquo;s cause list.
            This one is not there.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/employee/hearings">
              Back to today&rsquo;s hearings
            </Link>
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
  /* Orders by default: it is the work this screen exists for, and the applications tab
     can say for itself that something is waiting. */
  const [panel, setPanel] = React.useState<PanelId>("orders");
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
  /* **And read against this order, not only against the case as it was called** — the
     reading `cognizanceDueFor` carries, off DOC-ORD-001 of the court's own order pack:
     cognizance taken as an item of *this* draft puts the case on file for the rest of
     the order. */
  const chosen = draft.items.map((item) => item.type);
  const catalogue: OrderCatalogueContext = {
    cognizanceDue: cognizanceDueFor(hearing.stage, chosen),
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
   * What this sitting is likely to produce, read off the sitting.
   *
   * Four facts the screen already holds and until now threw away: what it was listed
   * for, the applications standing in it, who the bench has marked absent, and what the
   * draft order already carries. `order-suggestions.ts` carries the ranking and the
   * grounding; this is only the wiring, and it is deliberately not memoised — the whole
   * point is that the shortcut moves as the sitting does, so marking the accused absent
   * re-ranks it under the bench's hand.
   */
  const attendance = appearances
    .map((appearance) => {
      const mark = draft.marks[appearance.id];
      return mark
        ? { side: appearance.side, kind: appearance.kind, mark }
        : null;
    })
    .filter((entry): entry is AttendanceSignal => entry !== null);
  /* Every application on the listing and how it has been answered — not `pending`, which
     is the strip's list. An allowed application is the strongest signal there is about the
     next order, and it has left the strip by the time it is one. Held in one place because
     both the ranking and the auto-fill pass read it. */
  const applicationSignals = applicationsForListing(hearing.id).map(
    (application) => ({
      number: application.number,
      type: application.type,
      decision: draft.applications[application.id],
    }),
  );
  const suggestions = orderSuggestions({
    purpose: hearing.purpose,
    catalogue,
    attendance,
    applications: applicationSignals,
    chosen,
  });

  /**
   * Add what the court passed, on its standing words.
   *
   * The words arrive with the item because that is the difference between the two seats
   * this screen serves: the bench dictates an order it is making, and the typist sets
   * down one the court already made, from the court's own form. Nothing is committed by
   * adding it — the paragraph is editable the moment it lands, and the whole draft still
   * dies on a reload (`order-drafts.ts`).
   */
  function addItem(
    type: OrderItemTypeId,
    /* Which application the order was reached from, when it was reached from one. A
       suggestion row knows this and a count cannot: two applications standing on one
       listing is exactly the case where "the only candidate" has no answer and the row
       still does. */
    application?: Pick<ListingApplication, "number" | "type">,
  ) {
    /* Pressed a suggestion row? It named the application. Searched the catalogue
       instead? `applicationForOrder` type-matches one, and finds nothing rather than
       reaching for whatever happens to be standing on the listing. */
    const context =
      application ?? applicationForOrder(type, applicationSignals);
    const item = createOrderItem(
      type,
      undefined,
      orderTemplateFacts(hearing, draft, today, context),
    );
    const number = draft.items.length + 1;
    const open = openSlots(item.text.text);
    setDraft((current) => ({ ...current, items: [...current.items, item] }));
    /* The announcement says what is left to do, because after the auto-fill pass that is
       the fact that changed: an order can now arrive part-written, and "its text is
       written" would tell a screen-reader user it is finished when three brackets are
       still standing in it. */
    setAnnouncement(
      item.text.text
        ? open.length === 0
          ? `${orderItemLabel(type)} added as item ${number}, complete. Its text is in the order and can be edited.`
          : `${orderItemLabel(type)} added as item ${number}. Its text is in the order with ${open.length === 1 ? "one detail" : `${open.length} details`} still to fill: ${open.join(", ")}.`
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
      <div className="grid min-w-0 flex-1 gap-8 bg-muted p-6 md:p-8 lg:grid-cols-3 dark:bg-background">
        {/* Two surfaces on the canvas, not one container holding two columns (owner,
            2026-09-14). The panel and the page are both white and both lifted, so the
            beige canvas is the ground and each reads as a thing lying on it — which is
            what the reference screen does and what a shared card was flattening into one
            object with an internal seam.

            `self-start` on the panel and nothing on the page: the panel floats at its own
            height, the page fills the canvas. That is the difference between a control
            surface, which is as tall as its contents, and a document, which is a page.

            The columns stay 1/3 and 2/3, as they were before the container was removed.
            Narrowing the panel *and* unwrapping it in one step moved both surfaces at
            once, and the layout stopped being recognisable (owner, 2026-09-14). Only one
            of those was asked for. */}
        <Card className={cn(PANEL_CLASS, "min-w-0 gap-6 self-start p-6")}>
          {/* Two tabs, and they are genuine alternatives now rather than a sequence
                cut in half. Attendance and the next listing moved into the page on
                2026-09-14 — they are sentences the order says, so they are edited where
                they appear — which leaves this panel holding only the two things that
                are *not* the order's own text: what the court passed, and what is
                standing in the matter waiting on an answer.

                Orders is the default because it is the work. Applications carries its
                count, because a party is waiting on it and a tab you are not looking at
                has to be able to say so. */}
          <Tabs
            value={panel}
            onValueChange={(value) => setPanel(value as PanelId)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="orders" className="gap-2">
                <ScrollTextIcon aria-hidden />
                Orders
                {draft.items.length > 0 ? (
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {draft.items.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="applications" className="gap-2">
                <InboxIcon aria-hidden />
                Applications
                {pending.length > 0 ? (
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {pending.length}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="orders"
              className="flex min-w-0 flex-col gap-4 pt-2"
            >
              {/* The reference's own name for this region, kept as it words it.
                    Worth knowing it collides with the source catalogue's vocabulary: in
                    `order-templates.ts` a *workflow* is the thing an order sets in
                    motion — create a payment task, schedule a hearing — and what this
                    panel lists is the templates that trigger them. The reference's label
                    is the one the court reads, so it wins here; if the two ever have to
                    be told apart on one screen, this is the name to revisit. */}
              <h2
                id="order-panel-orders"
                tabIndex={-1}
                className="text-body font-semibold"
              >
                Workflows &amp; templates
              </h2>
              <OrderItems
                items={draft.items}
                onAdd={addItem}
                onRemove={removeItem}
                headingId="order-panel-orders"
                purpose={hearing.purpose}
                suggestions={suggestions}
                catalogue={catalogue}
              />
            </TabsContent>

            <TabsContent
              value="applications"
              className="flex min-w-0 flex-col gap-4 pt-2"
            >
              {/* Visible, unlike the Orders panel's, and the asymmetry is deliberate:
                    that panel opens on three labelled regions of its own and a fourth
                    heading over them would be a label on labels. This panel is one list,
                    so the list wants naming. Sentence case, like every other heading on
                    this screen. */}
              <h2
                id="order-panel-applications"
                tabIndex={-1}
                className="text-body font-semibold"
              >
                Pending applications
              </h2>
              {pending.length > 0 ? (
                <PendingApplications
                  applications={pending}
                  onOpen={setOpenApplication}
                  onDecide={decide}
                />
              ) : (
                <p className="text-body text-muted-foreground">
                  No application is standing in this matter.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* No surround. The page lies on the canvas directly and carries its own lift,
            which it could not do inside the old panel — a raised sheet inside a raised
            card flattens both. */}
        <OrderPaper
          className="lg:col-span-2"
          document={orderDocument}
          hearing={hearing}
          items={draft.items}
          entries={items.items ?? []}
          appearances={appearances}
          draft={draft}
          onItemText={setItemText}
          onRemoveItem={removeItem}
          onApplyMarks={(marks) =>
            setDraft((current) => ({ ...current, marks }))
          }
          onApplyNext={(next) =>
            setDraft((current) => ({ ...current, ...next }))
          }
        />
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
          document.getElementById("order-panel-applications")?.focus();
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
 * The applications standing in this matter, and the bench's answer to each.
 *
 * The card is laid out as the owner set it (2026-09-14): the status as its own pill,
 * then what the application is and its own serial, then every act in one row — Accept,
 * Reject, and View beside them. The row decides them, and that is the point of putting
 * them here rather than in a review queue: an
 * interlocutory application is answered *in* the hearing it is pending on, by a
 * magistrate who has the file open in front of them. A modal per application is the
 * queue's workflow, and the queue is the work between sittings.
 *
 * **The status is a bar, not a fill** (owner, 2026-09-14). Waiting on this bench is a
 * status and it keeps the warning family, but as an inset rule down the leading edge
 * rather than a cream wash over the whole card — which is the ladder's own answer for a
 * persistent state cue: a fill *or* an inset bar, never the fill for something every row
 * in the strip shares. Two amber cards were the loudest objects in the panel for
 * information the tab beside them already gives as a figure. The row still says
 * "Pending", so the status is never colour alone (ACCESSIBILITY §3).
 *
 * `border-s`, not `border-l`: the bar is on the *leading* edge, so it moves to the right
 * of the card in a right-to-left rendering instead of staying on the wrong side.
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
          className="flex min-w-0 flex-col gap-3 rounded-lg border-s-4 border-warning bg-surface-sunken p-4"
        >
          {/* The status is its own object now, on its own line, with the way *in* beside
              it — so "Pending" stops being read as the first word of the application's
              name. "Pending — Application to reschedule/adjournment" was one run of text
              doing two jobs, and at this column width the title wrapped under the word
              that was not part of it. */}
          <Badge variant="warning">Pending</Badge>

          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-body-compact min-w-0 font-medium">
              {listingApplicationLabel(application)}
            </p>
            <p className="text-caption tabular-nums text-muted-foreground">
              {application.number}
            </p>
          </div>

          {/* All three acts in one row, as the owner set them out: Accept, Reject, and
              the way in beside them. Accept leads because it is the order the bench
              reaches for more often, and the destructive weight should not be the first
              control under the reader's hand.

              View is `link`, which is the DS's text button: its hover is an underline
              rather than a fill, so it reads on this sunken card where `ghost` measured
              1.03:1 against the ground and had no hover at all (ds-requests #21). It
              also keeps the row at one filled control per decision and nothing more —
              reading the paper is not a third decision. */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => onDecide(application, "allowed")}
            >
              Accept
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
              variant="link"
              onClick={() => onOpen(application)}
            >
              View
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Which half of the catalogue is on screen.
 *
 * `system` is the twenty-five orders the court has words for; `custom` is what a typist
 * writes themselves. The line between them is `hasTemplateText`, not a curation — see
 * `order-templates.ts` for why the source draws it there.
 */
type CatalogueSourceId = "system" | "custom";

/**
 * One order in the catalogue, in either tab.
 *
 * Shared so a type reads the same wherever it is listed, and so the two tabs cannot
 * drift into two row designs. **A row the matter rules out keeps its words and loses its
 * button**: the reason goes where the caption would, because a greyed row that still
 * clicks teaches a typist to distrust the list.
 */
function CatalogueRow({
  label,
  caption,
  reason,
  onSelect,
}: {
  label: string;
  /** What the order sets in motion, or what the typist will have to write. */
  caption?: string;
  /** Why this matter cannot take it, or `null` when it can. */
  reason: string | null;
  onSelect: () => void;
}) {
  if (reason) {
    return (
      <li className="flex min-w-0 flex-col px-2 py-1.5">
        <span className="text-body-compact text-muted-foreground">{label}</span>
        <span className="text-caption text-muted-foreground">{reason}</span>
      </li>
    );
  }
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-10 w-full min-w-0 flex-col items-start justify-center gap-0.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
      >
        <span className="text-body-compact">{label}</span>
        {caption ? (
          <span className="text-caption text-muted-foreground">{caption}</span>
        ) : null}
      </button>
    </li>
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
 * 1. **Likely at this hearing** — ranked, and off the sitting rather than off the purpose
 *    alone (`order-suggestions.ts`, 2026-09-14). The source's purpose table is still the
 *    baseline, so an evidence listing still offers witness batta and a witness summons;
 *    what is new is that the applications standing in the matter, an absence the bench has
 *    just marked, and the orders already in this draft can each put something above them
 *    and say why. **The ordinary row stays uncaptioned and keeps its workflow line** — the
 *    heading already says why it is there, and a second sentence saying "usual at this
 *    hearing" under a list headed "Likely at this hearing" is a line of type carrying no
 *    information. A row a signal moved gets the signal instead: "Follows CMP/312/2026,
 *    allowed at this hearing". One per line rather than the reference's 2-up: its rail is
 *    wider than this column, and "Moving case out of long pending register" does not
 *    survive a 145px tile.
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
 * **System orders and custom orders are two tabs under the search, on the owner's ask
 * (2026-09-14).** The split is not a curation; it is the one the source already makes.
 * Twenty-five of the twenty-seven arrive part-written, and the judge's work on them is to
 * fill what auto-fill could not. Two carry no template text at all — Order under section
 * 202 CrPC, and Judgement — and of those the source says the judge "writes the order text
 * from scratch". Those two sit under **Custom orders** with the one order that is not the
 * court's at all, `others`, which is where the quiet "Something else" button under the
 * groups went. So each type is listed in exactly one place, and both tabs answer the
 * search above them: the counts on the tabs are match counts while a query stands, which
 * is how a typist searching "202" sees that the hit is in the other tab rather than
 * reading an empty list.
 *
 * **A note on the counts, because they will not match the reference.** The reference
 * shows 5 / 7 / 10 / 6 — twenty-eight, one more than the catalogue holds — and its
 * **Accept / Reject** group is offered as something to browse. Under the source, every
 * accept/reject order is marked *not in dropdown*: they are reached from the application
 * that produces them and never chosen from a list. So that group stands here with its
 * five rows all reading "Comes from an application". Nothing is hidden and nothing lies
 * about being available. The groups now read 5 / 5 / 10 / 5, the two write-them-yourself
 * types having moved to the other tab. The source itself lists grouping as one of two
 * things it has yet to supply, so this is provisional either way.
 */
function OrderItems({
  items,
  onAdd,
  onRemove,
  headingId,
  purpose,
  suggestions,
  catalogue,
}: {
  items: readonly OrderItemDraft[];
  onAdd: (
    type: OrderItemTypeId,
    application?: Pick<ListingApplication, "number" | "type">,
  ) => void;
  onRemove: (item: OrderItemDraft, number: number) => void;
  /** Where focus goes when a removed row leaves the list. */
  headingId: string;
  /** Only to word the note when the court's table has nothing to suggest. */
  purpose: CourtHearingPurposeId;
  /** Ranked, most likely first, and already gated. Built by the screen. */
  suggestions: readonly OrderSuggestion[];
  catalogue: OrderCatalogueContext;
}) {
  const [query, setQuery] = React.useState("");
  const [openGroup, setOpenGroup] = React.useState<OrderGroupId | null>(null);
  const [source, setSource] = React.useState<CatalogueSourceId>("system");

  const needle = query.trim().toLowerCase();
  const searching = needle.length > 0;
  const matches = (label: string) =>
    !searching || label.toLowerCase().includes(needle);

  const groups = ORDER_GROUPS.map((group) => ({
    ...group,
    rows: ORDER_TEMPLATES.filter(
      (entry) =>
        entry.group === group.id &&
        hasTemplateText(entry) &&
        matches(entry.label),
    ),
  }));
  /* The sum of the four group counts below, which is why it can sit on the tab without
     saying anything twice: the tab carries the total, each group carries its share. */
  const systemCount = groups.reduce(
    (total, group) => total + group.rows.length,
    0,
  );

  /* What the typist writes themselves. The two court types the source gives no words
     for, and then the one order that is not the court's at all. Same row treatment as
     the groups opposite — a template is a template wherever it is listed — and the
     caption is the whole point of the split: these open empty. */
  const customRows = [
    ...ORDER_TEMPLATES.filter((entry) => !hasTemplateText(entry)).map(
      (entry) => ({
        key: entry.id,
        label: entry.label,
        caption: "No template — opens empty",
        reason: unavailableReason(entry, catalogue),
        select: () => add(entry.id),
      }),
    ),
    {
      key: "others",
      label: "Something else",
      caption: "Outside the court's twenty-seven",
      reason: null,
      select: () => add("others"),
    },
  ].filter((row) => matches(row.label));

  function add(
    type: OrderItemTypeId,
    application?: Pick<ListingApplication, "number" | "type">,
  ) {
    onAdd(type, application);
    setQuery("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-caption font-semibold text-muted-foreground">
          Likely at this hearing
        </p>
        {suggestions.length === 0 ? (
          <p className="text-body text-muted-foreground">
            {noSuggestionsNote(purpose)}
          </p>
        ) : (
          /* An `ol`, because the order is the answer. The list is ranked by how strongly
             the sitting argues for each row — an application the bench has allowed above
             an order the purpose table merely mentions — so position carries meaning and
             a `ul` would have thrown it away. The numbers stay off: a typist chooses one
             of these, they do not work down them. */
          <ol className="flex min-w-0 flex-col gap-2">
            {suggestions.map((suggestion) => {
              const caption = suggestionCaption(suggestion);
              return (
                <li key={suggestion.template.id} className="min-w-0">
                  <Button
                    type="button"
                    variant="outline"
                    /* `h-auto` so a wrapped label and its caption both fit, and
                       `min-h-10` because `h-auto` alone let an uncaptioned row —
                       Cognizance, Judgement, and the others the source gives no workflow
                       — render at 36px, under the DS floor of 40×40 for a touch target
                       (ACCESSIBILITY §8). The floor is the control metric, so it is
                       `min-h-10` and not a spacing value. */
                    className="h-auto min-h-10 w-full flex-col items-start gap-0.5 px-3 py-2 text-start whitespace-normal"
                    onClick={() =>
                      add(suggestion.template.id, suggestion.fromApplication)
                    }
                  >
                    <span className="text-body-compact font-medium">
                      {suggestion.template.label}
                    </span>
                    {caption ? (
                      <span className="text-caption text-muted-foreground">
                        {caption}
                      </span>
                    ) : null}
                  </Button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <QueueSearchField
          label="Search orders"
          value={query}
          onChange={setQuery}
          placeholder="Search the catalogue"
          className="w-full"
        />

        {/* The panel's own pair of tabs sits above this one, so this switch has to read
            as subordinate to it: it takes the DS's `line` variant — underline and teal,
            no well and no second white pill competing with the one above. No band rule
            under it either; the accent bar sits 4px clear of the list, so a rule would
            draw a second parallel line rather than the one the bar lands on. */}
        <Tabs
          value={source}
          onValueChange={(next) => setSource(next as CatalogueSourceId)}
        >
          <TabsList variant="line">
            <TabsTrigger value="system" className="gap-2">
              System orders
              <span className="text-caption tabular-nums text-muted-foreground">
                {systemCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              Custom orders
              <span className="text-caption tabular-nums text-muted-foreground">
                {customRows.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="system"
            className="flex min-w-0 flex-col divide-y divide-hairline"
          >
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
                  onOpenChange={(next) => setOpenGroup(next ? group.id : null)}
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
                      {group.rows.map((template) => (
                        <CatalogueRow
                          key={template.id}
                          label={template.label}
                          caption={template.workflow}
                          reason={unavailableReason(template, catalogue)}
                          onSelect={() => add(template.id)}
                        />
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TabsContent>

          <TabsContent value="custom" className="min-w-0">
            {customRows.length === 0 ? (
              <p className="text-body py-1 text-muted-foreground">
                No order you write yourself answers to that.
              </p>
            ) : (
              <ul className="flex min-w-0 flex-col gap-0.5 py-1">
                {customRows.map((row) => (
                  <CatalogueRow
                    key={row.key}
                    label={row.label}
                    caption={row.caption}
                    reason={row.reason}
                    onSelect={row.select}
                  />
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-caption font-semibold text-muted-foreground">
          In this order
        </p>
        {items.length === 0 ? (
          <p className="text-body text-muted-foreground">
            Nothing has been added yet. Choose an order and its words are
            written into the page beside you.
          </p>
        ) : (
          <ol className="flex min-w-0 flex-col gap-2">
            {items.map((item, index) => {
              /* What the auto-fill pass could not resolve, still standing in the words.
                 The count is the honest other half of filling anything at all: an order
                 now arrives part-written, so the row that lists it has to say how much of
                 it is a hole. The brackets themselves are visible in the page beside this
                 — naming them again here would be the same fact twice — so the row
                 carries the number and the document carries the places. */
              const open = openSlots(item.text.text);
              return (
                <li
                  key={item.id}
                  className="flex min-h-10 min-w-0 items-center justify-between gap-3 rounded-lg bg-surface-sunken px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-body-compact min-w-0">
                      <span className="tabular-nums">{index + 1}.</span>{" "}
                      {orderItemLabel(item.type)}
                    </p>
                    {open.length > 0 ? (
                      <p className="text-caption tabular-nums text-muted-foreground">
                        {open.length === 1
                          ? "1 detail still to fill"
                          : `${open.length} details still to fill`}
                      </p>
                    ) : null}
                  </div>
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
                    <span className="sr-only">
                      {" "}
                      {orderItemLabel(item.type)}
                    </span>
                  </Button>
                </li>
              );
            })}
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
  appearances,
  draft,
  onItemText,
  onRemoveItem,
  onApplyMarks,
  onApplyNext,
}: {
  className?: string;
  document: OrderDocument;
  hearing: CourtHearing;
  items: readonly OrderItemDraft[];
  entries: OrderItemEntry[];
  appearances: Appearance[];
  draft: OrderDraft;
  onItemText: (id: string, value: RichTextValue) => void;
  onRemoveItem: (item: OrderItemDraft, number: number) => void;
  onApplyMarks: (marks: OrderDraft["marks"]) => void;
  onApplyNext: (
    next: Pick<OrderDraft, "next" | "nextPurpose" | "nextDate">,
  ) => void;
}) {
  /* Both open on arrival, which is the owner's call and the right one: a typist lands on
     this screen to record a sitting that has just happened, and the two facts they always
     have are who appeared and when it is next listed. Opening closed would make the first
     two acts of every order a pair of presses that reveal a form. */
  const [markingAttendance, setMarkingAttendance] = React.useState(true);
  const [settingNext, setSettingNext] = React.useState(true);

  return (
    <article
      className={cn(
        PANEL_CLASS,
        "flex min-w-0 flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground md:p-8",
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
      <p className="text-caption text-center text-muted-foreground">
        Offence under S. 138 of the Negotiable Instruments Act, 1881
      </p>

      <h2
        id="order-paper"
        tabIndex={-1}
        className="text-body-compact text-center font-semibold uppercase tracking-wide"
      >
        {order.title}
      </h2>

      <PaperBlock
        id="order-attendance"
        label="Attendance"
        action="Mark attendance"
        editing={markingAttendance}
        onEdit={() => setMarkingAttendance(true)}
      >
        {markingAttendance ? (
          <AttendanceEditor
            appearances={appearances}
            marks={draft.marks}
            onCancel={() => setMarkingAttendance(false)}
            onApply={(marks) => {
              onApplyMarks(marks);
              setMarkingAttendance(false);
            }}
          />
        ) : (
          <AttendanceRolls document={order} />
        )}
      </PaperBlock>

      {order.applications.length > 0 ? (
        <div className="flex flex-col gap-2">
          {order.applications.map((sentence) => (
            /* No muted branch: only answered applications reach the page now
               (`OrderDocument.applications`), and an answer is not a provisional
               thing — it is what the court did. */
            <p key={sentence.text} className="text-body-compact">
              {sentence.text}
            </p>
          ))}
        </div>
      ) : null}

      {/* The composed region. Ruled top and bottom so the page says where the court's
          own furniture stops and the typing starts. */}
      <div className="flex min-w-0 flex-col gap-4 border-y border-hairline py-6">
        {items.length === 0 ? (
          <p className="text-body-compact text-muted-foreground">
            Nothing has been passed yet. Add what the court ordered under
            <span className="font-medium"> Orders</span> and its words are
            written here for you to correct.
          </p>
        ) : (
          items.map((item, index) => (
            <OrderItemWell
              key={item.id}
              number={entries[index]?.number ?? index + 1}
              heading={entries[index]?.heading ?? ""}
              value={item.text}
              onChange={(value) => onItemText(item.id, value)}
              onRemove={() => {
                onRemoveItem(item, index + 1);
                /* The paragraph that held focus is gone, so focus goes up to the page's
                   own heading rather than to whatever paragraph happens to have moved
                   into that position. */
                document.getElementById("order-paper")?.focus();
              }}
            />
          ))
        )}
      </div>

      <PaperBlock
        id="order-next"
        label="Next hearing"
        action="Set next hearing"
        editing={settingNext}
        onEdit={() => setSettingNext(true)}
      >
        {settingNext ? (
          <NextHearingEditor
            draft={draft}
            onCancel={() => setSettingNext(false)}
            onApply={(next) => {
              onApplyNext(next);
              setSettingNext(false);
            }}
          />
        ) : (
          <NextHearingLines document={order} draft={draft} />
        )}
      </PaperBlock>

      {/* The page is a page: what is written stops where it stops, and the signature
          sits at the foot of the sheet rather than crowding up under the last line.
          `aria-hidden` because it is space, not content. */}
      <div aria-hidden className="min-h-8 flex-1" />

      <SignatureBlock />
    </article>
  );
}

/**
 * Attendance as an order sheet prints it: two rolls, not a running sentence.
 *
 * The offices are listed, not the names — the roll of parties two inches above already
 * maps one to the other, and an order sheet's Present line names offices. A side that
 * has nobody on it prints no line at all rather than an empty one: "Absent: —" is a
 * sentence about nothing.
 */
function AttendanceRolls({ document: order }: { document: OrderDocument }) {
  const rolls = [
    {
      label: "Present",
      names: order.attendance
        .filter((entry) => entry.mark === "present")
        .map((entry) => entry.role),
    },
    {
      label: "Absent",
      names: order.attendance
        .filter((entry) => entry.mark === "absent")
        .map((entry) => entry.role),
    },
  ].filter((roll) => roll.names.length > 0);

  return (
    <dl className="flex min-w-0 flex-col gap-1">
      {rolls.map((roll) => (
        <div
          key={roll.label}
          className="flex min-w-0 flex-wrap items-baseline gap-x-2"
        >
          <dt className="text-body-compact font-semibold">{roll.label}:</dt>
          <dd className="text-body-compact min-w-0">{roll.names.join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The next listing, as the two facts it is.
 *
 * A purpose and a date are values in fields, not a sentence to be parsed — which is what
 * the owner's reference prints and what the register will need to read back. The prose
 * form survives for the one case that is not two facts: a matter not being listed again.
 *
 * The values take the brand ink. That is a **deliberate departure** from rationing the
 * brand colour to one action per view: the owner's reference marks them this way, and
 * they are the two things on the page a bench looks for first. Logged in §5 D49.
 */
function NextHearingLines({
  document: order,
  draft,
}: {
  document: OrderDocument;
  draft: OrderDraft;
}) {
  if (draft.next === "none") {
    return <p className="text-body-compact">{order.closing}</p>;
  }
  const lines = [
    {
      label: "Purpose of next hearing",
      value: draft.nextPurpose
        ? courtHearingPurposeLabel(draft.nextPurpose)
        : null,
    },
    {
      label: "Date of next hearing",
      value: draft.nextDate ? formatListingDate(draft.nextDate) : null,
    },
  ];
  return (
    <dl className="flex min-w-0 flex-col gap-1">
      {lines.map((line) => (
        <div
          key={line.label}
          className="flex min-w-0 flex-wrap items-baseline gap-x-2"
        >
          <dt className="text-body-compact font-semibold">{line.label}:</dt>
          {/* A gap stays a gap. An unset value prints as "Not set" in the muted voice
              rather than as a blank the reader has to notice. */}
          <dd
            className={cn(
              "text-body-compact min-w-0",
              line.value ? "text-primary" : "text-muted-foreground",
            )}
          >
            {line.value ?? "Not set"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Where the order is signed.
 *
 * An order sheet ends with the bench's name and designation over a signature, and the
 * page was ending with a sentence saying one was pending. The block is the form of the
 * document; **"Signature" is a caption over an empty space**, which is exactly what this
 * is — nothing on this screen signs anything (D10), and the Sign order control in the
 * footer is the act.
 *
 * The magistrate is `PRESIDING_MAGISTRATE`, never `CURRENT_STAFF`: the seat working this
 * screen is a bench clerk or a typist, and the order is not theirs to sign.
 */
function SignatureBlock() {
  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5 text-end">
      <p className="text-caption text-muted-foreground">Signature</p>
      <p className="text-body-compact font-semibold">
        {PRESIDING_MAGISTRATE.name}
      </p>
      <p className="text-caption text-muted-foreground">
        {PRESIDING_MAGISTRATE.designation},
      </p>
      <p className="text-caption text-muted-foreground">
        {CURRENT_STAFF.court}
      </p>
    </div>
  );
}

/**
 * One part of the page that is written rather than printed.
 *
 * The eyebrow names it and, once it has been set, offers the way back in. While the
 * block is being edited the eyebrow carries no control: the form below it has Cancel and
 * Apply, and a third control in the same four rows would be the loudest thing on a page
 * whose whole job is to read like a document.
 */
function PaperBlock({
  id,
  label,
  action,
  editing,
  onEdit,
  children,
}: {
  id: string;
  label: string;
  action: string;
  editing: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-2">
      {/* Label and control adjacent, not at opposite margins. `justify-between` pinned
          the chip to the page's right edge — ~500px from the words it governs, floating
          in whitespace with nothing beside it. That placement belongs to a list row,
          where the thing on the left is a record and the thing on the right acts on it;
          this is a section label, so the control reads as part of it. */}
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h3
          id={id}
          tabIndex={-1}
          className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {label}
        </h3>
        {editing ? null : (
          /* `link` — the DS's text button — on the owner's instruction (2026-09-14).
             It went `ghost` → `outline` → here: ghost was dark text with no edge and read
             as a line of the document, outline had an edge and read as a button bolted to
             a page. Link is the middle: teal and underlined on hover, so it is plainly
             pressable without bringing a box onto the paper. Its hover is an underline
             rather than a fill, which also means it works on any ground.

             **Open, flagged to the owner:** the two next-hearing values a line below are
             already brand ink (D49), so on that block teal now says both "press this" and
             "this is the value". One of the two should give the colour up, and the values
             are the ones that can.

             The icon is the owner's own wireframe's, and it earns its place rather than
             decorating: it says *editable* before the label is read. */
          <Button
            type="button"
            variant="link"
            size="sm"
            /* 36px of visible chrome beside an 11px eyebrow, topped to a 40px target by
               an inset pseudo-element — `ACCESSIBILITY.md` §8's own remedy for a visual
               under the floor, and the pattern the DS's `SegmentedControl` uses ("the
               well shrinks, the target does not"). **Do not delete the `after:` — it is
               the hit area**, and nothing clips it: the button base sets no `overflow`,
               and `relative` here is what it positions against.
               
               Sized twice and both were wrong before this. `default` (40px of 14px text)
               read as absurd beside a caption. `xs` (32px) met the target on paper but
               sat against §8's caution about `xs` as the *sole* action on mobile — and
               this button is the only way back into the editor, so in that region it is
               exactly that. `sm` is quiet next to the eyebrow and leaves no argument. */
            className="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']"
            onClick={onEdit}
          >
            <PencilIcon aria-hidden />
            {action}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Who appeared, one control per person, split by the side they appear on.
 *
 * **Every choice is on the page.** A dropdown per person hid two of three answers behind
 * a press and made four rows of identical closed boxes — the roll's whole content was
 * invisible until you opened each one. A segmented control is the DS primitive for
 * exactly this ("a small, fixed set of mutually exclusive options shown side by side"),
 * and marking a roll of four becomes four presses rather than eight.
 *
 * **The two sides are separated, not listed.** A cause has two sides and an order names
 * them separately; a flat list of four made the typist read each label to work out whose
 * row it was. Grouped, the name is the row and the side is the heading — so the party's
 * row needs no role caption at all, and only counsel carry one.
 *
 * Grouping reads `side` off the appearance rather than matching on the words in `role`:
 * the label is copy, it will be translated, and a state that adds a second accused would
 * break a parse silently.
 *
 * **This is the fix problem 1 has been waiting for since the first revision.** Present
 * and Absent were two independent checkbox grids over the same four roles, so a person
 * could be marked both or neither. One control per person makes that unrepresentable
 * rather than merely discouraged.
 *
 * `Cancel` and `Apply to order` mean the marks are held here until they are committed —
 * the page does not change under the typist while they work down a roll, and abandoning
 * a half-marked roll leaves the order saying what it said before.
 */
function AttendanceEditor({
  appearances,
  marks,
  onCancel,
  onApply,
}: {
  appearances: Appearance[];
  marks: OrderDraft["marks"];
  onCancel: () => void;
  onApply: (marks: OrderDraft["marks"]) => void;
}) {
  const [local, setLocal] = React.useState<OrderDraft["marks"]>(marks);
  const sides: { id: CounselSide; label: string }[] = [
    { id: "complainant", label: "Complainant" },
    { id: "accused", label: "Accused" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-6 rounded-lg bg-surface-sunken p-4">
      <p className="text-body-compact font-semibold">Who is present today?</p>

      {/* Filtered before the map rather than inside it, so the divider can be put on
          every side *after the first one that actually renders*. A side with no vakalat
          has no counsel row, and a side with neither is not a heading over nothing — and
          if the complainant's side were the empty one, a rule above the accused's would
          be a rule under the title. */}
      {sides
        .map((side) => ({
          ...side,
          rows: appearances.filter((appearance) => appearance.side === side.id),
        }))
        .filter((side) => side.rows.length > 0)
        .map((side, index) => (
          /* The rule is on a wrapper, never on the `fieldset`. A `<legend>` is rendered
             into its fieldset's own top-border area, so `border-t` there draws the line
             *under* the heading rather than above it, and any `pt` lands below the
             heading as a gap. Both were visible on the first build of this divider.

             `hairline` is the DS's internal divider — the same stroke its tab and
             segmented wells use on this fill. Separation inside a well is a whisper, not
             a block of colour. */
          <div
            key={side.id}
            className={cn(
              "flex min-w-0 flex-col",
              index > 0 && "border-t border-hairline pt-6",
            )}
          >
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                {side.label}
              </legend>
              <ul className="flex min-w-0 flex-col gap-3">
                {side.rows.map((appearance) => (
                  <li
                    key={appearance.id}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="text-body-compact">
                        {appearance.name}
                      </span>
                      {appearance.kind === "counsel" ? (
                        <span className="text-caption text-muted-foreground">
                          Advocate on record
                        </span>
                      ) : null}
                    </div>
                    {/* Named for the person, not the state: four controls whose options
                      all read "Present" have to be distinguishable to anyone driving
                      this by voice or hearing it read out. */}
                    <SegmentedControl
                      type="single"
                      value={local[appearance.id] ?? "unmarked"}
                      onValueChange={(value) => {
                        /* Radix clears a single toggle group when the active item is
                         pressed again. "Not marked" is already a choice here, so an
                         empty value is dropped rather than being a fourth state that
                         only appears by accident. */
                        if (!value) return;
                        setLocal((current) => ({
                          ...current,
                          [appearance.id]:
                            value === "unmarked"
                              ? undefined
                              : (value as AttendanceMark),
                        }));
                      }}
                      aria-label={`${appearance.role}, ${appearance.name}`}
                      /* The DS well is left alone. It was overridden to white for half a
                       day, on the reasoning that a sunken control on a sunken card has
                       no edge of its own — true, and it cost more than it bought: **the
                       DS selection cue *is* a white lifted pill**, so a white well left
                       the marked answer reading only by weight and a faint shadow. The
                       well is the ground the pill has to lift off. What actually
                       delineates the group is the hairline the primitive already draws
                       around it. */
                      className="shrink-0"
                    >
                      <SegmentedControlItem value="unmarked">
                        Not marked
                      </SegmentedControlItem>
                      <SegmentedControlItem value="present">
                        Present
                      </SegmentedControlItem>
                      <SegmentedControlItem value="absent">
                        Absent
                      </SegmentedControlItem>
                    </SegmentedControl>
                  </li>
                ))}
              </ul>
            </fieldset>
          </div>
        ))}

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onApply(local)}>
          Apply to order
        </Button>
      </div>
    </div>
  );
}

/**
 * When the matter is next listed, and what for.
 *
 * Held and applied the same way as the roll above it, and phrased the same way round:
 * **"List it again"**, not the reference's "Skip scheduling next hearing". Scheduling is
 * the ordinary end of a §138 listing and skipping is the exception, so the checkbox asks
 * the common case as a positive (problem 3). Unticked, the two fields go rather than
 * sitting disabled — a control you cannot use is a question the screen is still asking.
 */
function NextHearingEditor({
  draft,
  onCancel,
  onApply,
}: {
  draft: OrderDraft;
  onCancel: () => void;
  onApply: (
    next: Pick<OrderDraft, "next" | "nextPurpose" | "nextDate">,
  ) => void;
}) {
  const [local, setLocal] = React.useState<
    Pick<OrderDraft, "next" | "nextPurpose" | "nextDate">
  >({
    next: draft.next,
    nextPurpose: draft.nextPurpose,
    nextDate: draft.nextDate,
  });
  const listId = React.useId();
  const listing = local.next === "list";

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-lg bg-surface-sunken p-4">
      <p className="text-body-compact font-semibold">
        When is it listed again?
      </p>

      <div className="flex min-w-0 items-start gap-2">
        <Checkbox
          id={listId}
          className="mt-1"
          checked={listing}
          onCheckedChange={(checked) =>
            setLocal((current) => ({
              ...current,
              next: checked === true ? "list" : "none",
            }))
          }
        />
        <Label
          htmlFor={listId}
          className="text-body-compact min-w-0 font-normal"
        >
          List it again
        </Label>
      </div>

      {listing ? (
        <>
          <Field className="min-w-0">
            <FieldLabel className="text-body-compact font-medium">
              Purpose of hearing
            </FieldLabel>
            <Select
              value={local.nextPurpose || undefined}
              onValueChange={(value) =>
                setLocal((current) => ({
                  ...current,
                  nextPurpose: value as CourtHearingPurposeId,
                }))
              }
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

          {/* `DatePicker` owns its trigger and takes no `id`, so the visible label names
              a group around it rather than pointing `htmlFor` at a control that does not
              exist. Same pattern as today's hearings filter. */}
          <div className="flex min-w-0 flex-col gap-2">
            <span
              id={`${listId}-date`}
              className="text-body-compact w-fit font-medium"
            >
              Next date of hearing
            </span>
            <div role="group" aria-labelledby={`${listId}-date`}>
              <DatePicker
                value={local.nextDate ? parseIsoDay(local.nextDate) : undefined}
                onValueChange={(next) =>
                  setLocal((current) => ({
                    ...current,
                    nextDate: next ? isoDay(next) : null,
                  }))
                }
                placeholder="Pick a date"
                className="w-full"
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={() => onApply(local)}>
          Apply to order
        </Button>
      </div>
    </div>
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
  onRemove,
}: {
  number: number;
  heading: string;
  value: RichTextValue;
  onChange: (value: RichTextValue) => void;
  onRemove: () => void;
}) {
  const labelId = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/* Taking an order out belongs where the order is, beside the paragraph the
          typist is reading — not only in a list two columns away that names it and
          nothing else (owner, 2026-09-14).

          Same text button as the page's edit affordances, and deliberately not a red
          Delete: nothing here is issued, so removing a paragraph from a draft is not a
          destructive act, and a destructive mark on every paragraph of a list the typist
          builds is the alarm fatigue the Laws ration colour to avoid. */}
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span id={labelId} className="text-body-compact font-semibold">
          <span className="tabular-nums">{number}.</span> {heading}
        </span>
        <Button
          type="button"
          variant="link"
          size="sm"
          /* Same text button and same 40px target as Mark attendance — see `PaperBlock`.
             The `after:` rule is the hit area. */
          className="relative after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-['']"
          onClick={onRemove}
        >
          <XIcon aria-hidden />
          Remove
          {/* The visible word is the same on every paragraph, so the name a voice user
              says is finished by the order it belongs to. */}
          <span className="sr-only"> {heading}</span>
        </Button>
      </div>
      <RichTextField
        value={value}
        onChange={onChange}
        labelId={labelId}
        className="[&_[data-slot=input-group-control]]:min-h-32"
      />
    </div>
  );
}
