"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CalendarDaysIcon,
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
import { CURRENT_STAFF, PRESIDING_MAGISTRATE } from "@/lib/employee/content";
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
  isoDay,
  parseIsoDay,
  withHearingSession,
  type CourtHearing,
  type CourtHearingPurposeId,
} from "@/lib/employee/hearings";
import { initialOrderDraft } from "@/lib/employee/order-demo";
import {
  appearancesFor,
  buildOrderDocument,
  nextUnhandledListing,
  orderTemplateFacts,
  type Appearance,
  type AttendanceMark,
  type OrderDocument,
  type ItemText,
  type OrderDraft,
} from "@/lib/employee/order-draft";
import {
  appendRichText,
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
 * Two regions under a band that names the matter. The left panel holds the sitting as
 * four sections with one of them open, in the order the bench works them — the
 * applications standing in the matter, the present and absent rolls, when it is next
 * listed, and last the catalogue of what the court passed — and every closed row still
 * says what it got to. The right column is the order itself, on paper: the court's own
 * furniture around one ruled band that the typist writes. A bar across the top carries
 * the cause and the way on to the next matter; a bar across the bottom carries the
 * signature.
 *
 * **This build issues nothing.** The draft is held for this sitting and dies on a
 * reload. The paper on the page is the order as it will read. Send to sign order opens the
 * same Add-signature overlay the signing queues already run — e-sign or upload —
 * and Submit records that choice here only. Next hearing ends this listing and
 * calls the next one on the board — the same screen marks the cause list already
 * makes. Nothing files, notifies, or signs, and answering an application draws no
 * order.
 */
/**
 * Which section of the left panel is open.
 *
 * **Back to the four sections, on the owner's instruction (2026-09-14).** They were
 * replaced by two tabs earlier the same day, when attendance and the next listing moved
 * onto the page as inline editors (D45); the owner has reversed that, and the editors
 * come back here. What the tabs could not carry is the reason the accordion was built in
 * the first place: the sitting is a **sequence** — the applications standing in the
 * matter are disposed of, the roll is called, the matter is posted on, and what the court
 * passed is set down last — and a pair of tabs presents alternatives, not an order of
 * work. It also gives the page back the height the two open editors were taking, which
 * was the owner's other standing complaint about this screen.
 */
type SectionId = "applications" | "attendance" | "next" | "orders";

type SectionEntry = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

/**
 * What a closed section says it got to.
 *
 * This is the part that makes one-at-a-time bearable. A section you cannot see is a
 * question you cannot answer, so every row states its own answer — and states it as the
 * fact, never as a tick. "Not marked" and "Not set" are real answers about a sitting; a
 * green check would claim the typist agreed to something they never touched.
 */
function sectionSummary(
  id: SectionId,
  draft: OrderDraft,
  pendingCount: number,
  answeredCount: number,
): string {
  if (id === "applications") {
    if (pendingCount > 0) return `${pendingCount} pending`;
    /* Answered is not the same fact as none, and the row is the only place a closed
       section can say which (D53). */
    return answeredCount > 0 ? "All answered" : "None pending";
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

/**
 * The panel's sections, in the order the bench works them.
 *
 * **No section gates the next.** An application can stand over, a roll can go unmarked, a
 * date can be left unset; all three genuinely happen, and the page says so in its muted
 * voice rather than the panel refusing to move. What a court record must not do is
 * quietly imply a fact nobody entered.
 */
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
  /* Opens on the applications when one is standing in the matter, because that is the
     thing on this screen with a party waiting on the answer. With none pending there is
     nothing to answer, and the panel opens where the sitting actually starts. */
  const [section, setSection] = React.useState<SectionId | null>(() =>
    applicationsForListing(hearing.id).length > 0
      ? "applications"
      : "attendance",
  );
  const [announcement, setAnnouncement] = React.useState("");

  /**
   * Open a section and put the reader in it.
   *
   * Focus goes to the section's own heading rather than to the first control in it: the
   * heading says which section you are now in, and a keyboard user who has just been
   * moved needs to hear *where* before they hear *what*. The heading sits outside
   * `CollapsibleContent` and is therefore always mounted, so this needs no frame to wait
   * for — the element is there whether the section is open or shut.
   */
  function showSection(id: SectionId) {
    setSection(id);
    document.getElementById(`order-section-${id}`)?.focus();
  }
  const [openApplication, setOpenApplication] =
    React.useState<ListingApplication | null>(null);
  const signRef = React.useRef<HTMLButtonElement>(null);
  const signature = useSignatureChoice("order");

  const appearances = React.useMemo(() => appearancesFor(hearing), [hearing]);
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

  /* What is still waiting on the bench. The reference labels every row "Pending — …",
     so an answered application does not belong under that heading. */
  const pending = React.useMemo(
    () =>
      applicationsForListing(hearing.id).filter(
        (application) => !draft.applications[application.id],
      ),
    [hearing.id, draft.applications],
  );

  /**
   * And what has been answered, which until 2026-09-14 left the panel without a trace.
   *
   * The old reading was that the answer is in the order and the order is where the bench
   * reads what it has done. That is true of the *sentence* and false of the *panel*: an
   * application answered — by a press here, or by `initialOrderDraft` answering all of
   * them the moment a listing is completed (D23) — took its row out of the strip, dropped
   * the count off the tab, and left "No application is standing in this matter." on a
   * matter where two had been standing a second earlier. Owner, 2026-09-14: *"why did the
   * pending applications got removed from the application tab."* Nothing had removed
   * them; answering them had, and a panel that erases the thing you just acted on is
   * indistinguishable from one that lost it.
   */
  const answered = React.useMemo(
    () =>
      applicationsForListing(hearing.id)
        .map((application) => ({
          application,
          decision: draft.applications[application.id],
        }))
        .filter(
          (
            row,
          ): row is {
            application: ListingApplication;
            decision: ListingApplicationDecision;
          } => row.decision !== undefined,
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
    const open = openSlots(item.text.text);
    /* **Appended, not added as a box** (owner, 2026-09-15). The template's words join
       what is already written and stop being a thing of their own; `items` keeps the
       record that it was pulled in, which is what the catalogue's gates read. */
    setDraft((current) => ({
      ...current,
      items: [...current.items, item],
      body: appendRichText(current.body, item.text),
    }));
    /* The announcement says what is left to do, because after the auto-fill pass that is
       the fact that changed: an order can now arrive part-written, and "its text is
       written" would tell a screen-reader user it is finished when three brackets are
       still standing in it. */
    setAnnouncement(
      item.text.text
        ? open.length === 0
          ? `${orderItemLabel(type)} added to the order, complete. Its text is at the end of the order and can be edited.`
          : `${orderItemLabel(type)} added to the order with ${open.length === 1 ? "one detail" : `${open.length} details`} still to fill: ${open.join(", ")}.`
        : `${orderItemLabel(type)} added to the order. It has no standing text — write it in the order.`,
    );
  }

  /**
   * The order, as the typist is writing it.
   *
   * There is no per-item Remove any more and there is nothing for one to do: the words
   * are one passage, so taking a direction back out is deleting the sentence that says
   * it — which is what a typist does on paper and what the editor already does here.
   */
  function setBody(body: ItemText) {
    setDraft((current) => ({ ...current, body }));
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

    /* **The sitting is a sequence, so the panel walks it** (owner, 2026-09-15): answering
       the last application opens the roll, and completing the roll opens the next posting.
       Edge-triggered inside the action, never derived in an effect — "is this section
       finished" is a *state*, and an effect reading it would re-open the next section on
       every render, pinning the typist out of the one they had just come back to. The
       question asked here is "did this press finish it", which only an event can answer.

       Guarded on `section`, so it only ever moves someone standing in the section that
       just finished. A typist who has gone back to Applications from Orders to change an
       answer is not asking to be marched forward again. */
    const remaining = pending.filter((entry) => entry.id !== application.id);
    const advancing = remaining.length === 0 && section === "applications";
    if (advancing) showSection("attendance");

    setAnnouncement(
      `${listingApplicationLabel(application)}, ${application.number}, is ${decision}. The order records it.${
        advancing ? " Nothing is left pending; attendance is now open." : ""
      }`,
    );
  }

  /**
   * Mark one appearance, and open the next posting once the roll is complete.
   *
   * Complete means **every** appearance has an answer, present or absent — not the first
   * mark, which would throw the typist out of the roll after one press. Unmarking never
   * advances, because the roll stops being complete.
   *
   * *Known and accepted:* correcting a mark on a finished roll completes it a second time
   * and so advances again — untick, tick the other answer, and the panel moves on. The
   * rule then reads the same every time it fires, which is worth more than a hidden "only
   * the first time" that would make the panel look broken on the second.
   */
  function mark(id: string, value: AttendanceMark | undefined) {
    /* The write goes through the updater so it merges into whatever the draft holds at
       the time it lands; the local copy below is only what the completeness test reads,
       and it never becomes the value written. */
    setDraft((current) => ({
      ...current,
      marks: { ...current.marks, [id]: value },
    }));

    const marks = { ...draft.marks, [id]: value };
    const complete = appearances.every((appearance) => marks[appearance.id]);
    if (complete && section === "attendance") {
      showSection("next");
      setAnnouncement(
        "The roll is complete. When the matter is next listed is now open.",
      );
    }
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
            {/* No space before the colon — it was there, and it is the same fault the
                line below had in the other direction. */}
            Order: {causeTitle(hearing)}
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
          {/* Four sections, one open at a time, and **the closed ones say where they got
              to**. That is the whole reason this beat an icon rail: a rail can show you
              four marks but not one fact, so the panel had nothing in it and the way on
              ended up below the fold. A row that reads "Attendance — Not marked" is the
              state and the way back to it in the same line.

              `Collapsible` and not `Accordion`: the DS `Accordion` renders its header as
              a fixed `h3`, which would skip a level under this page's `h1` (D16 on this
              screen made the same call for the same reason).

              Not D16's mechanism, which was reversed. That folded the roll *for you* once
              every appearance was marked, and bought nothing on arrival because the
              screen opens unmarked. This is the navigation itself: it moves when you
              move, never on its own.

              **The rows are the only way through, and they are enough.** A "Next" inside
              each open section was a second control doing what the row below it already
              did, on a panel where all four rows are always in view. Nothing gates the
              move either way: an application can stand over, a roll can go unmarked, a
              date can be left unset, and the page prints the gap rather than the panel
              refusing to move on. */}
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
                     every row carries its own answer, so the collapsed panel is the whole
                     sitting at a glance rather than an empty screen. An earlier revision
                     refused the last close on the grounds that it showed nothing; that
                     was true of a rail with no summaries on it and has not been true
                     since the rows started carrying them (owner, 2026-09-13). */
                  onOpenChange={(next) => setSection(next ? entry.id : null)}
                  /* `py-2`, not `py-1`. The trigger is a 40px target and the rows are
                     ruled apart, so 4px a side put each hairline almost against the words
                     above and below it — four rows reading as one block of text with
                     lines through it. 8px gives every rule its own air and makes a closed
                     row a 56px list row, which is what it is. */
                  className="min-w-0 py-2"
                >
                  <h2 id={headingId} tabIndex={-1} className="min-w-0">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-h-10 w-full min-w-0 items-center gap-3 rounded-lg px-2 text-start transition-colors hover:bg-surface-sunken focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring"
                      >
                        {/* **A teal tile behind each section's icon** (owner,
                            2026-09-15), to separate the row's own identity from the
                            chrome around it.

                            Recorded as a **departure from Ration teal**, which lists
                            "decorative teal icons or fills" under Don't: four tinted
                            tiles are four marks that do not change with state, so they
                            are identity rather than emphasis. It is the owner's call and
                            the second one on this screen — the search buttons took the
                            same override — and the reading it answers is real: bare
                            muted glyphs left the four rows reading as one block of text.

                            `brand-muted` / `brand-muted-foreground`, never `primary`:
                            the sanctioned tint pair, contrast vetted in the DS and
                            inverting properly in dark (a deep teal plate under a bright
                            glyph). A solid `bg-primary` would have put four full-strength
                            brand blocks against the one primary action on the screen.

                            `size-8 rounded-lg` is the DS's own icon-tile metric
                            (`EmptyMedia variant="icon"`) and the same square the home
                            screen's list rows wear, so this is the app's existing tile at
                            the size a 40px row can carry — not a new one. `aria-hidden`
                            sits on the tile: the plate and the glyph are both decoration,
                            and the row is named by its text. */}
                        <span
                          aria-hidden
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand-muted-foreground"
                        >
                          <Icon className="size-4" />
                        </span>
                        <span
                          className={cn(
                            "text-body-compact min-w-0 flex-1",
                            open ? "font-semibold" : "font-medium",
                          )}
                        >
                          {entry.title}
                        </span>
                        {/* The fact, not a second name for the section. Closed, this is
                            the only thing the row is for. */}
                        <span className="text-caption shrink-0 text-muted-foreground">
                          {sectionSummary(
                            entry.id,
                            draft,
                            pending.length,
                            answered.length,
                          )}
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
                    {/* Symmetric. `pb-2` under `pt-4` left the last card 8px off the
                        rule below it while its own heading sat 16px clear above — so an
                        open section read as leaning into the next one rather than as a
                        body between two rows. */}
                    <div className="flex min-w-0 flex-col gap-6 px-2 pt-4 pb-4">
                      <SectionBody
                        entry={entry}
                        draft={draft}
                        pending={pending}
                        answered={answered}
                        appearances={appearances}
                        items={draft.items}
                        purpose={hearing.purpose}
                        suggestions={suggestions}
                        catalogue={catalogue}
                        onOpen={setOpenApplication}
                        onDecide={decide}
                        onMark={mark}
                        onAdd={addItem}
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
        </Card>

        {/* No surround. The page lies on the canvas directly and carries its own lift,
            which it could not do inside the old panel — a raised sheet inside a raised
            card flattens both. */}
        <OrderPaper
          className="lg:col-span-2"
          document={orderDocument}
          hearing={hearing}
          draft={draft}
          onBody={setBody}
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
            Send to sign order
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
        /* The row that opened the overlay is gone by the time it closes — answering takes
           it out of the strip — so focus goes to a heading rather than to a control that
           no longer exists. **Which heading is no longer fixed.** Answering the last
           application advances the panel, and this runs *after* that, because Radix
           restores focus on close: a hard-coded Applications heading would have dragged
           the reader straight back out of the section the answer had just opened. It
           follows the panel instead, and falls back to the strip's own heading when
           everything is shut. */
        onReturnFocus={() => {
          document
            .getElementById(`order-section-${section ?? "applications"}`)
            ?.focus();
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
 * One open section's contents.
 *
 * Split out so the four rows above stay readable as a list of four rows. Each branch is
 * the same content the tabs were holding an hour ago — nothing here was rebuilt, it was
 * moved — with the two editors now writing straight into the draft rather than holding a
 * local copy behind an Apply.
 *
 * **No heading inside a branch.** The section row *is* the heading: an `h2` carrying the
 * name, the state, and the way in. "Pending applications" over a list that already sits
 * under a row reading "Applications — 2 pending" is the same word twice.
 *
 * It took a `headingId` until 2026-09-15, for the branches to send focus to when a row
 * left a list under them. The order list was the last one that removed rows; with Remove
 * gone from it, nothing in here empties under the cursor any more. The row still carries
 * the id — answering an application still returns focus to it — so this is one prop less,
 * not one behaviour less.
 */
function SectionBody({
  entry,
  draft,
  pending,
  answered,
  appearances,
  items,
  purpose,
  suggestions,
  catalogue,
  onOpen,
  onDecide,
  onMark,
  onAdd,
  onSkip,
  onPurpose,
  onDate,
}: {
  entry: SectionEntry;
  purpose: CourtHearingPurposeId;
  suggestions: readonly OrderSuggestion[];
  catalogue: OrderCatalogueContext;
  draft: OrderDraft;
  pending: ListingApplication[];
  answered: readonly {
    application: ListingApplication;
    decision: ListingApplicationDecision;
  }[];
  appearances: Appearance[];
  items: readonly OrderItemDraft[];
  onOpen: (application: ListingApplication) => void;
  onDecide: (
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) => void;
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
  onAdd: (
    type: OrderItemTypeId,
    application?: Pick<ListingApplication, "number" | "type">,
  ) => void;
  onSkip: (skip: boolean) => void;
  onPurpose: (purpose: CourtHearingPurposeId | "") => void;
  onDate: (day: string | null) => void;
}) {
  if (entry.id === "applications") {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex min-w-0 flex-col gap-3">
          {/* The owner's own subheader, asked for twice (2026-09-14). It is not the same
              word as the section row above it: that row says **Applications** and how
              many are waiting, this names the group the rows in it belong to — which is
              what lets the second group, *Answered in this sitting*, sit under the same
              section without either list being ambiguous. Sentence case, like every other
              heading on this screen. Its other effect is the reason the rows could shrink:
              with the status stated once over the list, each card stops repeating it. */}
          <h3 className="text-caption font-semibold text-muted-foreground">
            Pending applications
          </h3>
          {pending.length > 0 ? (
            <PendingApplications
              applications={pending}
              onOpen={onOpen}
              onDecide={onDecide}
            />
          ) : (
            /* Two different facts, and one sentence for both told the wrong one half the
             time: a matter that never had an application, and a matter whose applications
             have all been answered, are not the same empty (D53). */
            <p className="text-body-compact text-muted-foreground">
              {answered.length > 0
                ? "Every application in this matter has been answered."
                : "No application is standing in this matter."}
            </p>
          )}
        </div>

        {answered.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-3">
            <h3 className="text-caption font-semibold text-muted-foreground">
              Answered in this sitting
            </h3>
            <AnsweredApplications rows={answered} onOpen={onOpen} />
          </div>
        ) : null}
      </div>
    );
  }

  if (entry.id === "attendance") {
    return (
      <AttendanceEditor
        appearances={appearances}
        marks={draft.marks}
        onMark={onMark}
      />
    );
  }

  if (entry.id === "next") {
    return (
      <NextHearingEditor
        draft={draft}
        onSkip={onSkip}
        onPurpose={onPurpose}
        onDate={onDate}
      />
    );
  }

  return (
    <OrderItems
      items={items}
      body={draft.body}
      onAdd={onAdd}
      purpose={purpose}
      suggestions={suggestions}
      catalogue={catalogue}
    />
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
  /* `gap-3` between cards, where the tiles in the Orders section keep `gap-2`: these are
     106px objects with three controls in them, and 8px between two of those reads as one
     block rather than as two decisions. Spacing between items scales with the items. */
  return (
    <ul className="flex min-w-0 flex-col gap-3">
      {applications.map((application) => (
        <li
          key={application.id}
          className="flex min-w-0 flex-col gap-2 rounded-lg border-s-4 border-warning bg-surface-sunken p-3"
        >
          {/* **The Pending chip is gone, and that is most of the height back** (owner,
              2026-09-14: the cards were "ridiculously huge"). It was a line of its own
              plus a gap — around a third of the card — to state a fact three other things
              already state: the heading over the list, the count on the section row, and
              the amber bar down this card's own leading edge. A status chip repeated on
              every row of a list *named* for that status is the alarm-fatigue failure, not
              a status. Nothing is lost to colour alone either (ACCESSIBILITY §3): the word
              "Pending" is still on the screen, once, where it belongs — over the group.

              It was on its own line at the owner's instruction, for a real reason:
              "Pending — Application to reschedule/adjournment" had been one run of text
              doing two jobs, wrapping the title under a word that was not part of it. That
              reason is satisfied better by removing the prefix than by giving it a row. */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-body-compact min-w-0 font-medium">
              {listingApplicationLabel(application)}
            </p>
            <p className="text-caption tabular-nums text-muted-foreground">
              {application.number}
            </p>
          </div>

          {/* All three acts in one row, as the owner set them out: Accept, Reject, and the
              way in beside them. Accept leads because it is the order the bench reaches
              for more often, and the destructive weight should not be the first control
              under the reader's hand.

              **One filled control per card now, where there were two.** `destructive` is
              a pink wash, and two washed buttons on every row of a list was the other half
              of what made this strip loud — the owner has objected to the colour here
              twice. `destructive-ghost` keeps Reject's word in destructive ink with no
              fill at rest, so the decision is still plainly the destructive one, and its
              hover *is* `destructive-muted` — which means it has a real hover on this
              sunken card, unlike plain `ghost` (1.03:1, ds-requests #21).

              `size="sm"` on all three: 36px controls under a 14px title, rather than the
              40px default that had the actions out-weighing the application they act on.
              Not `xs` — §8 cautions against it for a row's primary action, and Accept is
              exactly that. View stays `link`, the DS's text button, whose hover is an
              underline and so reads on any ground. */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onDecide(application, "allowed")}
            >
              Accept
            </Button>
            <Button
              type="button"
              variant="destructive-ghost"
              size="sm"
              onClick={() => onDecide(application, "dismissed")}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
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
 * The same applications, after the bench has answered them.
 *
 * **The row stays; only the reason to look at it changes.** So it keeps the title, the
 * number and the way in, and gives up the two things that meant "this needs you": the
 * amber bar down the leading edge, and Accept / Reject. What replaces the Pending chip is
 * the outcome as a word in its own ink — the treatment this screen already uses for
 * Absent, and the reason there is no second badge family here. One chip in the panel, and
 * it is the one that means somebody is waiting.
 *
 * **"Allowed" and "Dismissed", not "Accepted" and "Rejected".** The split
 * `ListingApplicationDecision` documents: the controls carry the reference's Accept /
 * Reject, and everything that reports an outcome carries the court's own two words,
 * because that is what the order beside this panel prints.
 *
 * The leading edge keeps a `border-s-4`, transparent, so the title starts on the same
 * pixel as a pending row's. Without it the two groups would sit 4px out of line, which
 * reads as a mistake rather than as a difference.
 *
 * *Not here, and worth the owner's decision: no way back.* An answered row cannot be
 * un-answered, so a mis-press is corrected by editing the sentence in the order rather
 * than by the control that wrote it.
 */
function AnsweredApplications({
  rows,
  onOpen,
}: {
  rows: readonly {
    application: ListingApplication;
    decision: ListingApplicationDecision;
  }[];
  onOpen: (application: ListingApplication) => void;
}) {
  return (
    <ul className="flex min-w-0 flex-col gap-3">
      {rows.map(({ application, decision }) => (
        <li
          key={application.id}
          className="flex min-w-0 flex-col gap-2 rounded-lg border-s-4 border-transparent bg-surface-sunken p-3"
        >
          <p
            className={cn(
              "text-caption font-semibold",
              decision === "allowed"
                ? "text-success-ink"
                : "text-destructive-ink",
            )}
          >
            {decision === "allowed" ? "Allowed" : "Dismissed"}
          </p>

          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-body-compact min-w-0 font-medium">
              {listingApplicationLabel(application)}
            </p>
            <p className="text-caption tabular-nums text-muted-foreground">
              {application.number}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
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
  body,
  onAdd,
  purpose,
  suggestions,
  catalogue,
}: {
  items: readonly OrderItemDraft[];
  /** What the box actually says now — the only honest source for what is left to fill. */
  body: RichTextValue;
  onAdd: (
    type: OrderItemTypeId,
    application?: Pick<ListingApplication, "number" | "type">,
  ) => void;
  /** Only to word the note when the court's table has nothing to suggest. */
  purpose: CourtHearingPurposeId;
  /** Ranked, most likely first, and already gated. Built by the screen. */
  suggestions: readonly OrderSuggestion[];
  catalogue: OrderCatalogueContext;
}) {
  const [query, setQuery] = React.useState("");
  const [openGroup, setOpenGroup] = React.useState<OrderGroupId | null>(null);
  const [source, setSource] = React.useState<CatalogueSourceId>("system");

  const openCount = openSlots(body.text).length;

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
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-caption font-semibold text-muted-foreground">
          Likely at this hearing
        </p>
        {suggestions.length === 0 ? (
          <p className="text-body-compact text-muted-foreground">
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
        {/* The panel's label voice, not the DS field default. See the prop's own note:
            16px here was louder than "Likely at this hearing" directly above it. */}
        <QueueSearchField
          label="Search orders"
          value={query}
          onChange={setQuery}
          placeholder="Search the catalogue"
          className="w-full"
          labelClassName="text-caption font-semibold text-muted-foreground"
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
              <p className="text-body-compact py-1 text-muted-foreground">
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

      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-caption font-semibold text-muted-foreground">
          Pulled into this order
        </p>
        {items.length === 0 ? (
          <p className="text-body-compact text-muted-foreground">
            Nothing has been pulled in yet. Choose an order and its words are
            written into the page beside you — or write the order there
            yourself.
          </p>
        ) : (
          <>
            {/* **A record of what was pulled in, and no Remove** (owner, 2026-09-15).
                Its words are part of one passage the moment they land, so a Remove here
                would either have to guess which sentences were once this template's or
                quietly take out text the typist has since rewritten. Deleting a
                direction is deleting the sentence that carries it, in the box, the way
                it is done on paper. */}
            <ol className="flex min-w-0 flex-col gap-2">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex min-h-10 min-w-0 items-center gap-3 rounded-lg bg-surface-sunken px-3 py-2"
                >
                  <p className="text-body-compact min-w-0">
                    <span className="tabular-nums">{index + 1}.</span>{" "}
                    {orderItemLabel(item.type)}
                  </p>
                </li>
              ))}
            </ol>
            {/* What the auto-fill pass could not resolve, **read off the box rather than
                off the templates**. It used to be a count per row, taken from the words
                each template arrived with — which went stale the moment the typist filled
                one in, the row still claiming a hole that was no longer there. One count,
                measured on what the order actually says now. The brackets themselves are
                visible in the page beside this, so this carries the number and the
                document carries the places. */}
            {openCount > 0 ? (
              <p className="text-caption tabular-nums text-muted-foreground">
                {openCount === 1
                  ? "1 detail still to fill in the order"
                  : `${openCount} details still to fill in the order`}
              </p>
            ) : null}
          </>
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
      /* **"Purpose", not "Today for".** The colons are what forced it: "Today for:
         Evidence of complainant" is a preposition wearing a label's punctuation, and the
         row cannot have three label:value pairs and one sentence fragment. Nothing is
         lost with "today" — the composer only opens on a listing from today's board, and
         the page beside it prints the date in its own masthead. */
      label: "Purpose",
      value: courtHearingPurposeLabel(hearing.purpose),
      figures: false,
    },
  ];
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1">
      {rows.map((row) => (
        <p
          key={row.label}
          className="flex min-w-0 items-baseline gap-2 text-body-compact"
        >
          {/* The colon is in the markup, not in the label, because the label is the
              *name of a fact* and the punctuation is how this line chooses to show it —
              the same split the next-listing block on the page already makes. Without it
              the pair read as two loose words: "Case ST/241/2026" makes the reader work
              out that the first is a heading for the second (owner, 2026-09-15). `gap-2`
              stays, matching that block, and the pairs keep `gap-x-6` between them, so
              the 3:1 ratio is what groups a label with its own value. */}
          <span className="font-medium text-muted-foreground">{`${row.label}:`}</span>
          <span className={cn(row.figures && "tabular-nums")}>{row.value}</span>
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
 * **One writable region, ruled off, and always there.** Between the attendance line and
 * the next posting sits the one part of the page that is composed rather than known: a
 * single editor holding the whole of what the court passed. It was a band carrying one
 * bordered well per template, which grew the page a box at a time and made a document
 * read as a stack of forms (owner, 2026-09-15) — so the wells collapsed into one editor.
 * The rules above and below it stayed: they are the reference's own, and they say where
 * the court's standing furniture stops and the typist's work begins.
 */
function OrderPaper({
  className,
  document: order,
  hearing,
  draft,
  onBody,
}: {
  className?: string;
  document: OrderDocument;
  hearing: CourtHearing;
  draft: OrderDraft;
  onBody: (value: RichTextValue) => void;
}) {
  return (
    <article
      className={cn(
        PANEL_CLASS,
        "flex min-w-0 flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground md:p-8",
        className,
      )}
      aria-labelledby="order-paper"
    >
      {/* The cause heading, the roll and the offence are held back to 60% so the page
          opens on ORDER and what follows it. None of this block is typed — court, case,
          parties, counsel and the section are all already known to the listing — and on
          paper that standing furniture is printed lighter than the operative part. It is
          one group rather than three dimmed siblings so the reading stays uniform: a
          half-lit heading over a fully-lit roll would read as an error, not a hierarchy. */}
      <div className="flex flex-col gap-4 opacity-60">
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
      </div>

      <h2
        id="order-paper"
        tabIndex={-1}
        className="text-body-compact text-center font-semibold uppercase tracking-wide"
      >
        {order.title}
      </h2>

      <PaperBlock id="order-attendance" label="Attendance">
        <AttendanceRolls document={order} />
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

      {/* The composed region: one box, always here, whether or not a template has been
          pulled into it, and **ruled top and bottom**.

          The rules were dropped with the per-template wells on the argument that the
          editor's own border already said where the writing began — and on the page that
          reading was wrong (owner, 2026-09-15). A lone framed field floating between the
          roll and the next posting reads as a control that has landed on the sheet; the
          rules are what make the same field read as the passage this document is for.
          They are the reference's own, and they are doing the job they were drawn for:
          separating what the typist composes from the court's standing furniture around
          it. Two borders here are not one statement twice — the outer pair belongs to the
          page and the inner one to the control. */}
      <div className="flex min-w-0 flex-col border-y border-hairline py-6">
        <OrderBody
          value={draft.body}
          revision={draft.items.length}
          onChange={onBody}
        />
      </div>

      <PaperBlock id="order-next" label="Next hearing">
        <NextHearingLines document={order} draft={draft} />
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

  /* **An unmarked roll has to say so.** While the editor sat in this block it filled the
     gap by being there; with the editing back in the panel (D55) an unmarked sitting left
     the page printing the word "Attendance" over nothing at all, which reads as a
     rendering fault rather than as a fact. Same muted voice the next-listing block uses
     for "Not set", and the same principle: a gap stays a gap and is never a blank. */
  if (rolls.length === 0) {
    return (
      <p className="text-body-compact text-muted-foreground">Not marked</p>
    );
  }

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
 * The order, as one box.
 *
 * **One editor, not one per template** (owner, 2026-09-15). The page grew a second
 * bordered well every time an order was pulled from the catalogue, which is not how a
 * sheet of paper behaves and made the paper read as a form stack rather than a document.
 * The templates are now where words *come from*: pressing one appends its direction to
 * the end of this box and the typist shapes the result — joining two into a sentence,
 * splitting one, numbering them with the editor's own list marks, deleting what the
 * court did not pass.
 *
 * **It is here whether or not anything has been added**, which is the other half of the
 * owner's instruction. A bench that wants to write the order straight out, without
 * touching the catalogue at all, can: the box does not have to be summoned into being
 * first, and there is no empty-state sentence standing where the writing goes.
 *
 * `RichTextField` rather than a plain `Textarea`: an order carries emphasis and numbered
 * directions, the editor already exists for exactly this (`rich-text-field.tsx`), and the
 * catalogue's own text arrives as markup. `labelId` is the page's `ORDER` heading — a
 * contentEditable region cannot be labelled by a `<label>`, and the sheet already names
 * this: a second eyebrow over the box would say "Order" twice.
 *
 * **`revision` is load-bearing.** The editor keeps the markup it opened on and never
 * rewrites its own DOM while it is mounted — that is what stops it eating the caret
 * mid-word — so an append from the panel would otherwise land in the draft and never
 * appear on the page. Keying it on how many templates have been pulled in remounts it on
 * exactly those events and on no others: typing does not change the count, so the caret
 * is safe, and what the typist has already written is preserved because it is in `value`
 * by then.
 */
function OrderBody({
  value,
  revision,
  onChange,
}: {
  value: RichTextValue;
  revision: number;
  onChange: (value: RichTextValue) => void;
}) {
  return (
    <RichTextField
      key={revision}
      value={value}
      onChange={onChange}
      labelId="order-paper"
      className="[&_[data-slot=input-group-control]]:min-h-48"
    />
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
 * is — nothing on this screen signs anything (D10), and the Send to sign order control in the
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
 * A labelled region of the sheet whose contents came from somewhere else. Attendance
 * and the next listing are entered in the panel section that owns each, so the block's
 * whole job is to state what was entered — which is what keeps the right column reading
 * as a document rather than as a second copy of the questions the panel is already
 * asking. Its heading is what lets a screen reader land here and hear which part of the
 * order it has landed in.
 */
function PaperBlock({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-2">
      {/* An eyebrow and nothing else. It carried a teal **Mark attendance** / **Set next
          hearing** text button until 2026-09-14, when the editors it opened went back to
          the panel on the owner's instruction — so the page is output again and the way
          in is the panel row that owns the fact. The affordance is not missed twice: two
          entry points to one editor is the thing that made the paper carry ~400px of form
          on arrival, and the block's own heading keeps the page's furniture intact
          without it.

          **No `tabIndex={-1}`, because nothing focuses this heading.** The `id` is here
          to name the region through `aria-labelledby`, and naming wants no tabindex. It
          said `stays` on the strength of the editors that used to live on the paper;
          grep the file now and the one place it sends focus after the thing you were on
          disappears is the panel section that held the application. A focusable element
          nothing focuses is a claim the next reader has to disprove before they dare
          move anything near it, so whoever adds that flow adds the attribute with
          it. */}
      <h3
        id={id}
        className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </h3>
      {children}
    </section>
  );
}

/**
 * Who appeared, as two rolls the bench calls: who is present, then who is absent.
 *
 * **Organised by the answer, not by the person** (owner, 2026-09-15). It was one
 * three-state control per person, which was correct and read as four identical rows of
 * chrome — the roll's shape was invisible, and each answer cost a trip along a segmented
 * track. A court calls a roll the other way round: it asks who is here and hears names.
 * So the two states are the groups, and the four parts of the cause are the options in
 * each.
 *
 * **This is not the 1.0 screen's two grids, and the difference is the whole reason that
 * design was thrown out.** There, present and absent were two independent maps, so the
 * complainant could be ticked in both and the order would have said so. Here both groups
 * read and write **one** mark per appearance: a tick under *present* sets it to present,
 * which leaves the box under *absent* unchecked because they are the same fact asked
 * twice. Unticking clears the mark rather than flipping it — unmarked is a real state and
 * it is what the roll starts on. Contradiction is not prevented by validation; it is not
 * representable.
 *
 * **Labels are the parts of the cause, not the names on the vakalat.** The owner's own
 * four: Complainant, Complainant's advocate, Accused, Accused's advocate. Short because
 * they are control labels, and the same split `ListingApplicationDecision` documents —
 * the order beside this panel keeps the sentence register ("Advocate for the complainant
 * is present"), and the paper's own party roll carries the names. A side with two counsel
 * on record would give two identical rows, so in that one case the name comes back onto
 * the label.
 *
 * A side with no vakalat has no advocate row at all; the list is built from the
 * appearances rather than from the owner's four, so it cannot offer a box for counsel who
 * do not exist.
 */
function rollLabel(appearance: Appearance, appearances: Appearance[]): string {
  /* Off `side` and `kind`, never by reading `role` — which is copy, will be translated,
     and is the reason `Appearance` carries both fields explicitly. */
  const side = appearance.side === "complainant" ? "Complainant" : "Accused";
  if (appearance.kind === "party") return side;
  const label = `${side}'s advocate`;
  const counsel = appearances.filter(
    (entry) => entry.side === appearance.side && entry.kind === "counsel",
  );
  return counsel.length > 1 ? `${label} — ${appearance.name}` : label;
}

function AttendanceEditor({
  appearances,
  marks,
  onMark,
}: {
  appearances: Appearance[];
  marks: OrderDraft["marks"];
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
}) {
  const rolls: { mark: AttendanceMark; legend: string }[] = [
    { mark: "present", legend: "Who is present" },
    { mark: "absent", legend: "Who is absent" },
  ];
  const rollId = React.useId();

  /* Each tick lands in the draft; there is no Apply. See the note the next-listing editor
     carries — the section row's summary ("2 present, 1 absent") can only be true if the
     mark is already there, and the owner has ruled out the per-section press. */
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* **`role="group"` and a heading, not `fieldset`/`legend`** — the third time that
          pair has cost something on this screen and the last. A rendered `<legend>` is
          placed in its fieldset's *border* area rather than in the content flow, so it is
          not a flex item: `display:flex` and `gap-3` on the fieldset separated the list
          from nothing and the heading sat flush on the first checkbox, which is what the
          owner saw as the rolls looking *"cut off abruptly"* (2026-09-15). The same quirk
          had already forced the divider onto a wrapper, because `border-t` there drew the
          rule *under* the heading. A labelled group gets the same semantics — the heading
          names the set of boxes for a screen reader through `aria-labelledby` — and obeys
          the layout it is given.

          Sentence case and no tracking, matching *Pending applications* and *Answered in
          this sitting* one section above: one treatment for a group label inside the
          panel. The uppercase eyebrow belongs to the paper, which is a different
          surface. */}
      {rolls.map((roll, index) => (
        <div
          key={roll.mark}
          role="group"
          aria-labelledby={`${rollId}-${roll.mark}`}
          className={cn(
            "flex min-w-0 flex-col gap-3",
            index > 0 && "border-t border-hairline pt-6",
          )}
        >
          <h3
            id={`${rollId}-${roll.mark}`}
            className="text-caption font-semibold text-muted-foreground"
          >
            {roll.legend}
          </h3>
          {/* **Rows the height of the target, and no gap between them.** Each box draws
              at 16px and claims its 40x40 hit area with an `after:` inset, per the DS's
              accessibility rules; the row it sat in was 20px tall, so across a `gap-3`
              list the eight claims *overlapped* — a tap aimed at the white between two
              roles landed on whichever box won, and marking the advocate present when
              the party was meant is a false line in a court record. A 40px row makes the
              eight tile instead of fight. The gap is what pays for the height: it was
              there to hold 20px rows apart and a row that is itself the target delimits
              itself, so the two rolls cost +88px rather than the +160px the height alone
              would have. Same list metric as the cases filter sheet. */}
          <ul className="flex min-w-0 flex-col">
            {appearances.map((appearance) => {
              const id = `${roll.mark}-${appearance.id}`;
              return (
                <li
                  key={appearance.id}
                  className="flex min-h-10 min-w-0 items-center gap-2"
                >
                  <Checkbox
                    id={id}
                    /* One cursor for one target. The row is a 40px press and the label
                       carries `cursor-pointer` for it, but a `<button>` takes its cursor
                       from the UA sheet rather than from the row it sits in, so without
                       this the 16px box in the middle of the press showed an arrow. */
                    className="cursor-pointer"
                    /* **The word on screen, then the roll it stands under.** The same
                       four appearances are asked twice, so *Complainant* is the visible
                       label of two different controls and the group's own
                       `aria-labelledby` names the group rather than the box in it. A
                       voice user saying "click Complainant" had two identical targets
                       and a screen reader's list of controls read as four duplicate
                       pairs. Naming each box "Complainant Who is present" keeps the
                       spoken name starting with the word that is actually on screen —
                       which is what makes it sayable — and finishes it with the only
                       thing that tells the pair apart. Deliberately not an `aria-label`:
                       a name invented in the markup and not shown is the same defect
                       turned around. */
                    aria-labelledby={`${id}-label ${rollId}-${roll.mark}`}
                    checked={marks[appearance.id] === roll.mark}
                    onCheckedChange={(checked) =>
                      onMark(
                        appearance.id,
                        checked === true ? roll.mark : undefined,
                      )
                    }
                  />
                  {/* The label *is* the row — full height, rest of the width — so the
                      thing you press is the whole line and not the box plus however wide
                      the words happen to be. `htmlFor` stays: that is what makes pressing
                      the words tick the box. */}
                  <Label
                    id={`${id}-label`}
                    htmlFor={id}
                    className="text-body-compact min-h-10 min-w-0 flex-1 cursor-pointer font-normal"
                  >
                    {rollLabel(appearance, appearances)}
                  </Label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
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
  onSkip,
  onPurpose,
  onDate,
}: {
  draft: OrderDraft;
  onSkip: (skip: boolean) => void;
  onPurpose: (purpose: CourtHearingPurposeId | "") => void;
  onDate: (day: string | null) => void;
}) {
  const listId = React.useId();
  const listing = draft.next === "list";

  /* Live, and for the same reasons as the roll above it: the row's summary is the date
     itself, and the owner has ruled out the per-section press. */
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* A 40px row, for the reason the roll above it carries in full: the box is 16px
          and the hit area it claims needs the row to be as tall as the claim. The `mt-1`
          that nudged the box down onto the first line of the label goes with it —
          centring inside a row the height of the target does that job, and keeps doing it
          when a longer script wraps the label onto a second line. */}
      <div className="flex min-h-10 min-w-0 items-center gap-2">
        <Checkbox
          id={listId}
          /* As on the roll: the box would otherwise be the one arrow-cursor spot in a
             row the label has made a pointer. */
          className="cursor-pointer"
          checked={listing}
          onCheckedChange={(checked) => onSkip(checked !== true)}
        />
        <Label
          htmlFor={listId}
          className="text-body-compact min-h-10 min-w-0 flex-1 cursor-pointer font-normal"
        >
          List it again
        </Label>
      </div>

      {listing ? (
        <>
          <Field className="min-w-0">
            {/* **The panel has two type sizes and this is the smaller one** (owner,
                2026-09-15: the next-listing fields "suddenly" differed). Anything that
                labels a group or a control wears the caption voice — *Who is present*,
                *Pending applications*, *Likely at this hearing*, and these two — and
                everything that *is* content sits at `text-body-compact`. It is a step
                under the DS's own `FieldLabel` (14px, medium, foreground), which is right
                on a full-width form and was the loudest thing in a 410px column. Applies
                to this panel only: the paper and every other screen keep the default. */}
            <FieldLabel className="text-caption font-semibold text-muted-foreground">
              Purpose of hearing
            </FieldLabel>
            <Select
              value={draft.nextPurpose || undefined}
              onValueChange={(value) =>
                onPurpose(value as CourtHearingPurposeId)
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
              className="text-caption w-fit font-semibold text-muted-foreground"
            >
              Next date of hearing
            </span>
            <div role="group" aria-labelledby={`${listId}-date`}>
              <DatePicker
                value={draft.nextDate ? parseIsoDay(draft.nextDate) : undefined}
                onValueChange={(next) => onDate(next ? isoDay(next) : null)}
                placeholder="Pick a date"
                className="w-full"
              />
            </div>
          </div>
        </>
      ) : null}
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
