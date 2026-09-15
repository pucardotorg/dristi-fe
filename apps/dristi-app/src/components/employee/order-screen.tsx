"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CalendarDaysIcon,
  CalendarX2Icon,
  InboxIcon,
  PencilIcon,
  ScrollTextIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  LISTING_APPLICATION_DECISIONS,
  listingApplicationLabel,
  listingApplicationSentence,
  type ListingApplication,
  type ListingApplicationDecision,
} from "@/lib/employee/listing-applications";
import {
  causeTitle,
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
  upsertRichTextSentence,
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
 * Two regions under a band that names the matter. **The left panel is one open column**
 * (owner, 2026-09-15): the applications standing in the matter, the present and absent
 * rolls, when it is next listed, and the catalogue of what the court passed, all in view
 * at once with a rule between them. It was four accordion sections with one open, which
 * put a press between the typist and every part of a sitting they were already in the
 * middle of. The right column is the order itself, on paper: the court's own furniture
 * around one ruled band that the typist writes. A bar across the top carries the cause
 * and the way on to the next matter; a bar across the bottom carries the signature.
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
 * **Back to the four sections, and this is the second time the owner has asked for
 * them.** On 2026-09-14 they came back from a pair of tabs; on 2026-09-15 they came back
 * from one open column, which had scrolled all four regions into a single scroll on the
 * argument that the summaries were answering questions the typist could simply read.
 * What neither replacement carried is the reason the accordion exists: the sitting is a
 * **sequence** — the applications standing in the matter are disposed of, the roll is
 * called, the matter is posted on, and what the court passed is set down last. Tabs
 * present alternatives; a single column presents four regions at once and says nothing
 * about which is next. Only this shape walks the work, and it keeps the panel short
 * beside a page that is now as tall as the order on it.
 */
type SectionId = "applications" | "orders";

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
  { id: "orders", title: "Orders", icon: ScrollTextIcon },
];

/**
 * Has the matter been posted on?
 *
 * Both answers count: a date with the purpose it is for, or a decision not to list the
 * matter again. A date on its own is not a posting — it is half of one — which is why
 * setting the date first leaves the block open rather than setting it down over an
 * unanswered purpose.
 */
function postingSettled(
  draft: Pick<OrderDraft, "next" | "nextPurpose" | "nextDate">,
): boolean {
  if (draft.next === "none") return true;
  return Boolean(draft.nextPurpose && draft.nextDate);
}

/**
 * Which edges of a scrolled box have content past them.
 *
 * With no scrollbar there is nothing to say a region scrolls (owner, 2026-09-16), so the
 * box says it itself: the content fades out at an edge it continues past, and the fade is
 * gone at an edge it does not. That is the whole reason this is measured rather than
 * drawn permanently — a fade over the last row of a list that has ended is a lie about
 * there being more, which is worse than no affordance at all.
 *
 * Measured on three signals, because the box's content changes under all three: scrolling
 * it, filtering it (the search shortens the list), and opening a group inside it (the
 * `Collapsible` mounts rows). The `ResizeObserver` on the content covers the last two
 * without this needing to know what changed — it watches the *height*, which is the only
 * thing that matters here.
 *
 * `1` rather than `0` as the threshold: `scrollTop` is fractional on a trackpad and at
 * non-integer zoom, so an exact comparison leaves a 0.4px scroll reading as "scrolled"
 * and flickers the top fade on for the rest of the sitting.
 */
function useScrollEdges() {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ top: false, bottom: false });

  const measure = React.useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const top = box.scrollTop > 1;
    const bottom = box.scrollTop + box.clientHeight < box.scrollHeight - 1;
    /* Same object back when nothing moved: this runs on every scroll frame, and a fresh
       object each time would re-render the whole catalogue as the reader scrolls it. */
    setEdges((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom },
    );
  }, []);

  React.useEffect(() => {
    measure();
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  return { boxRef, contentRef, edges, measure };
}

/**
 * No bar at all — the region scrolls, and nothing draws a rail for it.
 *
 * Three passes at this. The platform default drew a full-height track with a grey thumb
 * flush inside the panel's rounded edge; thinning it and clearing the track left a
 * shorter, quieter rail, and the rail was still the wrong object (owner, 2026-09-15: make
 * the bar itself about 16px).
 *
 * **A 16px bar is not reachable through the platform scrollbar, and saying so is part of
 * the decision.** A thumb's *length* is not a CSS property: the browser sizes it as the
 * ratio of the visible box to the scrolled content, so the only ways to shorten it are to
 * shrink the box or lengthen the content, and neither is a design decision anyone would
 * make about a catalogue. A fixed 16px mark would mean drawing a scroll indicator of our
 * own — new UI, and a DS's job rather than a screen's. So the bar goes instead of being
 * miniaturised, which is the same end the ask was reaching for.
 *
 * This is the DS's own intent: `combobox`, `command` and `sidebar` all apply a
 * `no-scrollbar` class — which is defined nowhere in the DS or here, so those three draw
 * the platform bar in spite of it. The properties are held in this constant rather than
 * as a local utility of that name: the missing utility is the DS's to add, and a local
 * copy under the same name would be a second kit answering to no one.
 *
 * Nothing becomes unreachable. The region's content is rows and controls — suggestion
 * tiles, the search field, the group triggers — so a keyboard user moves through it by
 * Tab and the browser scrolls each one into view; wheel, trackpad and touch are
 * untouched; and the content is visibly cut off at the boundary, which is the affordance
 * a rail was adding little to.
 */
const NO_SCROLLBAR = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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
  /**
   * How many times the screen has written the order for the typist.
   *
   * **The editor reads its HTML once, on mount** (`rich-text-field.tsx`: rewriting
   * `innerHTML` while somebody is typing eats the caret), so `OrderBody` remounts it on a
   * new `key` whenever the words change from outside. That key used to be
   * `draft.items.length`, which was true while the catalogue was the only thing that
   * wrote: pulling a template changed the count, so the editor re-read.
   *
   * Answering an application writes a sentence too now, and it changes no count —
   * re-deciding one changes not even the number of answers — so the disposal landed in
   * `draft.body` and never reached the box (owner, 2026-09-16: the answers "are not
   * appearing in the text box"). The tests were green throughout, because what broke was
   * not the draft but the one place that does not read it continuously.
   *
   * So the key is a count of the writes themselves. Every programmatic write bumps it and
   * nothing else does — in particular `setBody`, which is the editor reporting its own
   * typing, must never touch it, or the box would remount under each keystroke.
   */
  const [bodyWrites, setBodyWrites] = React.useState(0);
  const [signOpen, setSignOpen] = React.useState(false);
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
  /**
   * Whether the roll has been set down, which is what decides if the page shows the
   * controls or the lines they produce (owner, 2026-09-15).
   *
   * The roll is the one block on this sheet whose form is bigger than its output: four
   * rows of controls print as one or two lines. Leaving the form standing after the roll
   * is called costs the page ~130px permanently and, worse, leaves the sheet reading as a
   * form for the rest of the sitting — the typist's remaining work is the *writing*, and
   * the document should look like one by then.
   *
   * It is composer state, not a fact of the order: nothing about `draft.marks` changes
   * when it flips, and it dies with the composer like the rest of the draft. A listing
   * that arrives with every appearance already answered — a completed sitting, whose
   * draft `initialOrderDraft` fills in (D23) — opens set down, because the roll was
   * called before this screen was ever opened.
   *
   * **It flips on the last answer, not on a press** (owner, 2026-09-15: once everything
   * is selected it should just be done). An `Apply attendance` button stood here for part
   * of the day, on the reasoning that only the typist can say when a roll with an
   * unaccountable office is finished. That case does not pay for a confirmation on every
   * ordinary sitting: the marks were always live in the draft, so the press was
   * confirming a record that was already written, and `Edit` was always the way back. Its
   * one real consequence is stated plainly — a roll left deliberately part-called keeps
   * its controls, which is the page saying the roll has not been called.
   *
   * The panel's roll had no Apply either, for a related reason that still holds there: a
   * section row promising "2 present, 1 absent" cannot be true unless the mark is already
   * in the draft. This only ever governed how the block *renders*, never the record.
   */
  const [rollApplied, setRollApplied] = React.useState(() =>
    appearances.every((appearance) => draft.marks[appearance.id]),
  );
  /**
   * And the same for the posting: once it holds a purpose and a date the block is the two
   * lines it produces, with the way back on its eyebrow.
   */
  const [postingApplied, setPostingApplied] = React.useState(() =>
    postingSettled(draft),
  );
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
   * Where the panel opens: on the applications when one is standing, on the order when
   * none is.
   *
   * The sitting is still a sequence — applications disposed of, the roll called, the
   * matter posted on, the order set down last — but only its first and last steps are
   * sections now. The roll and the posting are on the sheet (owner, 2026-09-15,
   * exploration), in view from the moment the screen loads and needing nothing opened,
   * so the panel opens on the first step it still owns that has anything in it. With
   * nothing pending that is the order itself, which is the work this screen exists for.
   *
   * Read once, on the first render of this listing's composer: it is where the panel
   * *opens*, not a rule about where it must be.
   */
  const [section, setSection] = React.useState<SectionId | null>(
    pending.length > 0 ? "applications" : "orders",
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
    setBodyWrites((count) => count + 1);
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
   * Where the walk points, and it points at the first step of the sitting that has no
   * answer yet.
   *
   * With the roll and the posting on the page, "walk the panel on" is no longer the
   * right description of this: the move is sometimes a focus on the sheet and sometimes
   * a section opening. Stated once, here, rather than at each call site — and it returns
   * the sentence the live region reads out, because the announcement and the move have to
   * agree about where the typist has just been sent.
   *
   * **It does not answer for the roll.** Every caller is a roll that has just been called
   * or set down, so a branch sending the reader back up to attendance could only ever
   * fire on the one press that had just finished with it — which is how setting down a
   * part-called roll used to bounce focus back onto the block it had just closed.
   *
   * Takes the posting as arguments rather than reading the draft: every caller is inside
   * the action that just changed it, where `draft` is still the value from the render
   * being replaced.
   */
  function walkOn(
    next: OrderDraft["next"],
    purpose: OrderDraft["nextPurpose"],
    nextDate: string | null,
  ): string {
    if (!postingSettled({ next, nextPurpose: purpose, nextDate })) {
      document.getElementById("order-next")?.focus();
      return "The next posting, on the order, is next.";
    }
    showSection("orders");
    return "What the court passed is now open.";
  }

  /**
   * Set the roll down as it stands, complete or not.
   *
   * **Back on the owner's instruction (2026-09-15), and the case is a real one:** the
   * accused's advocate was not required to attend, so they are neither present nor
   * absent — there is no answer to give, and a record that says "absent" would be a
   * false line in a court order. A roll like that never becomes complete, so the block
   * would stand open as a form for the rest of the sitting with no way to close it.
   *
   * It does not replace the automatic set-down, it backstops it: a roll where every
   * office has an answer still closes on the last mark, so the ordinary sitting never
   * presses this. Which is also why it is enabled irrespective of what has been marked —
   * the press exists precisely for the rolls the rule cannot finish, and a control
   * disabled exactly when someone needs it is worse than one rarely used. The order
   * prints the gap in its own muted voice, as it always did.
   */
  function applyRoll() {
    setRollApplied(true);
    const marked = appearances.filter(
      (appearance) => draft.marks[appearance.id],
    ).length;
    const gap =
      marked === appearances.length
        ? ""
        : marked === 0
          ? " No appearance has an answer, and the order says the roll was not marked."
          : " Not every appearance has an answer, and the order prints the gap.";
    setAnnouncement(
      `Attendance is set down on the order.${gap} ${walkOn(draft.next, draft.nextPurpose, draft.nextDate)}`,
    );
  }

  /** Back to the controls, with the reader put on the block they just reopened. */
  function editRoll() {
    setRollApplied(false);
    document.getElementById("order-attendance")?.focus();
    setAnnouncement("Attendance is open for correction.");
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
    /* **The disposal is written into the order, not printed beside it** (owner,
       2026-09-15). It used to be a band of sentences above the editor, derived from the
       decisions and not editable — so the one part of the order the screen wrote for
       itself was the one part a typist could not correct, and the page carried two
       regions of prose where an order has one passage.

       `upsertRichTextSentence` is what makes changing an answer safe: re-deciding an
       application replaces the sentence it wrote rather than leaving the order carrying
       both, and pressing the same answer twice writes nothing new. */
    setDraft((current) => ({
      ...current,
      applications: { ...current.applications, [application.id]: decision },
      body: upsertRichTextSentence(
        current.body,
        listingApplicationSentence(hearing, application, decision),
        LISTING_APPLICATION_DECISIONS.map((earlier) =>
          listingApplicationSentence(hearing, application, earlier),
        ),
      ),
    }));
    setBodyWrites((count) => count + 1);
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
    /* **The next step is on the sheet, so focus goes there rather than to a section.**
       With the roll on the page the walk still runs applications, roll, posting — only
       its middle step is no longer something to open. The panel stays where it is,
       showing what was just answered, and the reader is put on the roll's own heading;
       `PaperBlock` takes `focusable` for exactly this, which is the flow its own note
       said would one day want the tabindex.

       Every other answer moves focus to the section heading instead: Accept and Reject
       sit *inside* the row, answering takes the row off the strip, and a focus left on a
       destroyed button restarts the next Tab at the top of the page. Harmless on the
       overlay path either way — Radix restores focus after close and `onReturnFocus`
       lands on the same heading. */
    /* **The last answer closes this section and opens the order** (owner, 2026-09-15).
       One section is open at a time, so opening Orders folds Applications away by itself
       — and Applications has nothing left to do: the answers are in the passage, the
       answered list stays a row away behind its own summary, and the roll and the posting
       are on the sheet where they need no opening. What the panel is *for* from here is
       the catalogue.

       Every other answer keeps the section and moves focus to its heading, because
       Accept and Reject sit inside the row and answering takes the row off the strip —
       focus left on a removed button restarts the next Tab at the top of the page. */
    if (advancing) {
      showSection("orders");
    } else {
      document
        .getElementById(`order-section-${section ?? "applications"}`)
        ?.focus();
    }

    setAnnouncement(
      `${listingApplicationLabel(application)}, ${application.number}, is ${decision}. The sentence recording it is written into the order, where it can be edited.${
        advancing
          ? " Nothing is left pending. What the court passed is now open."
          : ""
      }`,
    );
  }

  /**
   * Mark one appearance, and hand over the moment the roll is complete.
   *
   * One mark per person — the control on the page is single-choice, so present and absent
   * cannot both be true of the same appearance, which is not a state a court record can
   * be in. Pressing the answer that is already given clears it, and the roll goes back to
   * being incomplete.
   *
   * **On the transition, not on the state.** It fires when this press *finishes* the roll
   * — incomplete before, complete after — and never again. The roll is on the page now,
   * so a mark can be corrected at any point in the sitting, including while the typist is
   * writing the order; re-firing there would take focus off the words under their hands.
   * This also retires a quirk the panel version accepted: untick, tick the other answer,
   * and the screen moved on a second time.
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
    /* **A complete roll on an open block sets itself down** (owner, 2026-09-15): every
       office has an answer, so there is nothing left for a confirmation to confirm, and
       `Edit` is the way back if one of them is wrong. It mirrors the posting, which
       settles the moment it holds a purpose and a date.

       **The test is the block's state, not the roll's transition.** It read "was
       incomplete, is now complete", which is true exactly once and left a corrected roll
       standing open for the rest of the sitting: after `Edit` the roll is already
       complete, so switching one office from present to absent changed nothing the
       condition could see (owner, 2026-09-15 — the block "remains the way it is instead
       of going back"). Asking whether the block is open instead answers both the first
       calling and every correction after it, and it cannot re-fire while the roll is set
       down, because the controls are not on the page then.

       The walk has to run here, not merely because it is the next step, but because the
       control that was just pressed unmounts with the form — focus left on a removed
       segment falls to the body and the next Tab restarts at the top of the page. */
    if (complete && !rollApplied) {
      setRollApplied(true);
      setAnnouncement(
        `Attendance is set down on the order. ${walkOn(draft.next, draft.nextPurpose, draft.nextDate)}`,
      );
    }
  }

  /**
   * Post the matter on, or decide not to, from the page.
   *
   * The three writes are one region's worth of work, so they sit together: the purpose
   * alone settles nothing, while a date or a decision not to list is the last fact the
   * posting needs. When that lands and the roll is already called, the walk moves on to
   * the order — and when the roll is *not* called it stays where it is rather than
   * dragging the typist back up the sheet to a roll they have chosen to leave for later.
   */
  function postNext(
    change: Partial<Pick<OrderDraft, "next" | "nextPurpose" | "nextDate">>,
  ) {
    setDraft((current) => ({ ...current, ...change }));
    /* The posting as it stands *after* this change. `draft` is the value from the render
       being replaced, and `nextDate` can legitimately be set to `null`, so the merge
       tests for `undefined` rather than falling back on truthiness. */
    const posting = {
      next: change.next ?? draft.next,
      nextPurpose: change.nextPurpose ?? draft.nextPurpose,
      nextDate:
        change.nextDate !== undefined ? change.nextDate : draft.nextDate,
    };
    if (!postingSettled(posting)) return;
    setPostingApplied(true);
    /* Set down either way; the walk only moves when there is somewhere sensible to move
       to. A typist who has posted the matter before calling the roll is not dragged back
       up the sheet to the roll they chose to leave for later. */
    const rollCalled = appearances.every(
      (appearance) => draft.marks[appearance.id],
    );
    if (!rollCalled) return;
    setAnnouncement(
      walkOn(posting.next, posting.nextPurpose, posting.nextDate),
    );
  }

  /** Back to the two fields, with the reader put on the block they just reopened. */
  function editPosting() {
    setPostingApplied(false);
    document.getElementById("order-next")?.focus();
    setAnnouncement("The next posting is open for correction.");
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

      {/* The split the owner drew. Left: what the court did at this sitting and what it
          passed, one section at a time. Right: the order those entries make, on paper.

          **Thirds, and the page takes two of them** (owner, 2026-09-15). It was half and
          half for part of a day, to give an open column room for a roll four checkboxes
          across; the page won instead, because it is the artefact this screen exists to
          produce and the thing a typist reads back. The roll asks for no such width in
          this shape — one section is open at a time, and its two rolls are single columns
          of 40px rows. Below two columns the order of the DOM stands and the page sits
          under the panel.

          The column between the white header and footer is the scoped work canvas:
          `bg-muted` in light so the panels read against the same tone as the rail; dark
          stays `bg-background` because muted sits *above* card there (FilingMain). */}
      <div className="grid min-w-0 flex-1 gap-8 bg-muted p-6 md:p-8 lg:grid-cols-3 dark:bg-background">
        {/* Two surfaces on the canvas, not one container holding two columns (owner,
            2026-09-14). The panel and the page are both white and both lifted, so the
            beige canvas is the ground and each reads as a thing lying on it — which is
            what the reference screen does and what a shared card was flattening into one
            object with an internal seam.

            `self-start` on both: each surface is as tall as its own contents. The page
            held the canvas height while it carried a signature at its foot, which gave
            the sheet somewhere to end; without one it was just a long empty margin.

            The columns stay 1/3 and 2/3, as they were before the container was removed.
            Narrowing the panel *and* unwrapping it in one step moved both surfaces at
            once, and the layout stopped being recognisable (owner, 2026-09-14). Only one
            of those was asked for. */}
        {/* **Four sections, one open at a time, and the closed ones say where they got
            to** — the panel as it was designed, restored on the owner's instruction
            (2026-09-15) after a day spent as one open column. That is the whole reason
            this beat an icon rail: a rail can show you four marks but not one fact, so
            the panel had nothing in it and the way on ended up below the fold. A row that
            reads "Attendance — Not marked" is the state and the way back to it in the
            same line.

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
        <Card className={cn(PANEL_CLASS, "min-w-0 gap-6 self-start p-6")}>
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
                        items={draft.items}
                        purpose={hearing.purpose}
                        suggestions={suggestions}
                        catalogue={catalogue}
                        onOpen={setOpenApplication}
                        onDecide={decide}
                        onAdd={addItem}
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
          appearances={appearances}
          marks={draft.marks}
          draft={draft}
          bodyRevision={bodyWrites}
          onBody={setBody}
          onMark={mark}
          rollApplied={rollApplied}
          onApplyRoll={applyRoll}
          onEditRoll={editRoll}
          postingApplied={postingApplied}
          onEditPosting={editPosting}
          onSkip={(skip) => postNext({ next: skip ? "none" : "list" })}
          onPurpose={(nextPurpose) => postNext({ nextPurpose })}
          onDate={(nextDate) => postNext({ nextDate })}
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
        warning="This records how the order is to be signed. Nothing is issued from this screen."
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
 * the content the panel was holding when it ran as one column — nothing here was
 * rebuilt, it was moved back — with the two editors writing straight into the draft
 * rather than holding a local copy behind an Apply.
 *
 * **No heading inside a branch.** The section row *is* the heading: an `h2` carrying the
 * name, the state, and the way in. "Pending applications" over a list that already sits
 * under a row reading "Applications — 2 pending" is the same word twice.
 */
function SectionBody({
  entry,
  draft,
  pending,
  answered,
  items,
  purpose,
  suggestions,
  catalogue,
  onOpen,
  onDecide,
  onAdd,
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
  items: readonly OrderItemDraft[];
  onOpen: (application: ListingApplication) => void;
  onDecide: (
    application: ListingApplication,
    decision: ListingApplicationDecision,
  ) => void;
  onAdd: (
    type: OrderItemTypeId,
    application?: Pick<ListingApplication, "number" | "type">,
  ) => void;
}) {
  if (entry.id === "applications") {
    /* **A matter that never carried one.** The only case that wants a sentence, and it is
       still its own fact rather than the same empty as an answered matter (D53) — which
       is now told by showing what was answered. */
    if (pending.length === 0 && answered.length === 0) {
      return (
        <p className="text-body-compact text-muted-foreground">
          No application is standing in this matter.
        </p>
      );
    }

    /* **Everything answered: the list, and nothing else** (owner, 2026-09-15). This
       carried three pieces of chrome over one list — a *Pending applications* heading
       above an empty group, a sentence saying every application had been answered, and an
       *Answered in this sitting* heading under it — which between them said "all
       answered" three times and left the section reading as two groups, one of them
       missing. The section row already says it once, in the place built for exactly this:
       "Applications — All answered". A group heading earns its line when there are two
       groups to tell apart, and only then. */
    if (pending.length === 0) {
      return <AnsweredApplications rows={answered} onOpen={onOpen} />;
    }

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
          <PendingApplications
            applications={pending}
            onOpen={onOpen}
            onDecide={onDecide}
          />
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
 * What this sitting has already answered.
 *
 * **Rows, not cards** (owner, 2026-09-15: the answered cards "look really weird"). They
 * were the pending card with its decisions taken out — a filled sunken box, 106px tall,
 * holding a status word on its own line, a title, a number, and one text button floating
 * where three controls used to be. A card is the right object for a decision the bench
 * has to make, and the wrong one for a decision it has already made: there is nothing to
 * act on here, so what the list owes the reader is *what was answered and how*, as
 * briefly as that can be said.
 *
 * So: the decision as a `Badge` in the DS's own status pair — `success` for allowed,
 * `destructive` for dismissed, muted fill against muted-foreground, never the ink alone —
 * then the application and its serial, then the way in. Hairline rules between rows
 * rather than four boxes on the panel's own white, which is the separation the section
 * rows above already use. The word is in the badge, so the status is never colour alone
 * (ACCESSIBILITY §3).
 *
 * `View` keeps `link`, the DS's text button, and the row centres it rather than aligning
 * it to the top (owner, 2026-09-15). At the top it sat level with the decision pill,
 * which read as a control *on* the badge — and the badge is a state, not something to
 * act on. Centred, it lands between the application and its serial: level with the pair
 * it opens, and it stays there whether the name takes one line or three, which an
 * alignment to any single line does not.
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
    <ul className="flex min-w-0 flex-col divide-y divide-hairline">
      {rows.map(({ application, decision }) => (
        <li
          key={application.id}
          /* `py-3`, not `py-2`. A row here is two lines — the application over its
             serial — and 8px a side put 16px between one row's serial and the next row's
             badge while the pair inside a row sits 4px apart. Four to sixteen is not
             enough of a step for the eye to group by, so two answers read as one block of
             text with a line through it (owner, 2026-09-15: "cramped"). 12px makes it 4
             to 24, which is the same ratio the panel's own section rows use. */
          className="flex min-w-0 items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
        >
          {/* **The pill takes its own line, and the application sits under it** (owner,
              2026-09-15). Beside the chip, a short name like "Bail" read as one line and
              "Application to reschedule/adjournment" broke into a narrow two-line column
              next to its badge — the same list drawing rows of two different shapes,
              which is what looked broken. Above it, every row is the same three lines:
              the decision, the application, its serial. It costs a line per row and buys
              a list that can hold any length of name.

              `self-start` on the badge because a `Badge` is an inline-flex span, and a
              flex column stretches its children — without it the pill would run the full
              width of the row as a bar.

              Two gaps, not one: 6px under the decision, 2px between the application and
              its serial. The name and the number are one fact about one application; the
              decision is a different fact about it, so the spacing groups them that
              way. */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Badge
              variant={decision === "allowed" ? "success" : "destructive"}
              className="self-start"
            >
              {decision === "allowed" ? "Allowed" : "Dismissed"}
            </Badge>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-body-compact min-w-0 font-medium">
                {listingApplicationLabel(application)}
              </p>
              <p className="text-caption tabular-nums text-muted-foreground">
                {application.number}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="link"
            size="sm"
            className="shrink-0"
            onClick={() => onOpen(application)}
          >
            View
          </Button>
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
  const { boxRef, contentRef, edges, measure } = useScrollEdges();

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
    /* **The catalogue scrolls, the panel does not** (owner, 2026-09-15). This region is
       the only thing in the panel with unbounded height — twenty-seven orders in nine
       groups, plus the shortcuts above them — so it was what pushed the panel past the
       viewport and made reading down the catalogue drag the whole surface, section rows
       and all, up off the screen. Capped and scrolled in place, the panel stays as tall
       as the screen can hold and *Likely at this hearing* and the search scroll within
       it, which is what the reader is actually moving through.

       `svh` rather than `vh`: on a phone `vh` is the viewport with the browser's chrome
       *hidden*, so a `vh` box is taller than what anyone can see until they scroll
       (RESPONSIVE.md). `overscroll-contain` stops the page taking over when the list
       reaches its end — a scroll that jumps to the document the moment a list bottoms
       out is the same fault as the panel moving in the first place.

       `NO_SCROLLBAR` takes the bar away; with no thumb over the words, the `pe-1` that
       kept them apart goes with it. What says the region scrolls instead is the fade at
       whichever edge it continues past — see `useScrollEdges`. The fades are laid over
       the box rather than inside it, so they stay at its edges while the content moves
       under them, and they run from `card` to `card/0` because the panel they sit on is
       `card`: a fade has to end in the colour behind it or it reads as a band of its own.
       `card/0` rather than `transparent` — CSS interpolates a gradient towards
       `transparent` through transparent *black*, which greys the middle of a fade on a
       light panel; the same colour at zero alpha fades in the one hue it should.

       `aria-hidden` and `pointer-events-none`: it is a shadow of the content, not content
       of its own, and a scroll region you cannot click through is worse than one with no
       fade. */
    <div className="relative min-w-0">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-card to-card/0 transition-opacity motion-reduce:transition-none",
          edges.top ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-card to-card/0 transition-opacity motion-reduce:transition-none",
          edges.bottom ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={boxRef}
        onScroll={measure}
        className={cn(
          "flex max-h-[50svh] min-w-0 flex-col gap-6 overflow-y-auto overscroll-contain",
          NO_SCROLLBAR,
        )}
      >
        <div ref={contentRef} className="flex min-w-0 flex-col gap-6">
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
                          add(
                            suggestion.template.id,
                            suggestion.fromApplication,
                          )
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
                Nothing has been pulled in yet. Choose an order and the
                court&rsquo;s standing words for it are written into the page
                beside you, ready to be corrected — and where the catalogue
                gives none, write the order there yourself.
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
 * page. The furniture around the writing is the court's own — the title, attendance,
 * the next posting, the signature — and none of it is typed, because every one of those
 * facts is already known to the listing.
 *
 * **No cause block.** The page opened on a printed heading held back to 60% — the court,
 * the case number, the matter, the date, a roll of the parties with their counsel, and
 * the offence. It came out (owner, 2026-09-15). All of it is already on screen: the
 * strip above this column names the case and the matter, and the column beside it
 * carries the item and the purpose. The copy that leaves this court is not short of a
 * cause title either — the signing queue renders the same document with its own heading,
 * from the same `court`, `matter` and `dated` fields. Repeating it here spent a third of
 * the sheet before the first line of what the court actually passed.
 *
 * `paper` is the DS family for exactly this and for nothing else: a fixed facsimile that
 * does not invert in dark, because a printed page does not change colour with the
 * product palette. It is the same treatment the signing queue uses on the same artefact,
 * so what the bench reads back here is what it will see when it comes to sign.
 *
 * **One writable region, ruled off at the top, and always there.** Below attendance
 * and the next posting sits the one part of the page that is composed rather than known:
 * a single editor holding the whole of what the court passed. It was a band carrying one
 * bordered well per template, which grew the page a box at a time and made a document
 * read as a stack of forms (owner, 2026-09-15) — so the wells collapsed into one editor.
 * The top rule stayed: it is the reference's own, and it says where the court's standing
 * furniture stops and the typist's work begins. The matching rule below did not: with
 * nothing under the writing, it was a leftover divider (owner, 2026-09-15).
 */
function OrderPaper({
  className,
  document: order,
  appearances,
  marks,
  draft,
  bodyRevision,
  onBody,
  onMark,
  rollApplied,
  onApplyRoll,
  onEditRoll,
  postingApplied,
  onEditPosting,
  onSkip,
  onPurpose,
  onDate,
}: {
  className?: string;
  document: OrderDocument;
  appearances: Appearance[];
  marks: OrderDraft["marks"];
  draft: OrderDraft;
  /** Bumped by every write the screen makes to the order — see `bodyWrites`. */
  bodyRevision: number;
  onBody: (value: RichTextValue) => void;
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
  rollApplied: boolean;
  onApplyRoll: () => void;
  onEditRoll: () => void;
  postingApplied: boolean;
  onEditPosting: () => void;
  onSkip: (skip: boolean) => void;
  onPurpose: (purpose: CourtHearingPurposeId | "") => void;
  onDate: (day: string | null) => void;
}) {
  return (
    <article
      className={cn(
        PANEL_CLASS,
        /* `self-start`, as the panel beside it has: with the signature gone from the
           foot (owner, 2026-09-15) there is nothing left to hold down there, and a sheet
           stretched to the canvas was a tall pale container with its writing bunched at
           the top. The page is now as tall as the order on it, and the writable region's
           own minimum height is what keeps it reading as a page rather than a slip. */
        "flex min-w-0 flex-col gap-4 self-start rounded-xl bg-card p-6 text-card-foreground md:p-8",
        className,
      )}
      aria-labelledby="order-paper"
    >
      <h2
        id="order-paper"
        tabIndex={-1}
        className="text-body-compact text-center font-semibold uppercase tracking-wide"
      >
        {order.title}
      </h2>

      {/* **Framed while it is work, plain once it is set down.** The well is what makes
          the roll read as a section of its own rather than four loose rows on a sheet
          (owner, 2026-09-15); the printed lines it becomes are a passage of the order,
          and a box drawn round them would say the opposite of what Apply just did. */}
      {/* **The sitting's two facts, side by side** (owner, 2026-09-15). The posting used
          to sit at the foot of the sheet, below the writing, which put the two things a
          typist settles before composing anything at opposite ends of the page — and cost
          the sheet two full-width blocks of form where one row of two would do.

          Two columns from `md` up and one below it: each block holds a label beside a
          control, and at a phone's width there is no room for two of those across.
          `items-start` so a four-row roll does not stretch the two-field posting to match
          its height — they are neighbours, not a table. */}
      <div className="grid min-w-0 gap-4 md:grid-cols-2 md:items-start">
        <PaperBlock
          id="order-attendance"
          label="Attendance"
          focusable
          framed={!rollApplied}
          action={
            rollApplied ? (
              /* **Brand teal and a pencil** (owner, 2026-09-15). `text-primary` is the
               app's action colour and the one this page's own text buttons wore before
               2026-09-14 — not `success`, which is a true green reserved for an outcome
               and would claim something had succeeded. `hover:text-primary` because
               `ghost` otherwise takes the label to `foreground` on hover, which would
               drop the brand exactly when the pointer is on it.

               The icon is fine here and would not be on the footer's Send to sign order:
               that rule is about the screen's primary CTA, whose label carries the act on
               its own. This is a 32px affordance on an eyebrow, where the pencil is what
               makes "Edit" findable at a glance in a page of printed lines. `data-icon`
               is the DS's own hook for the tighter leading padding an icon wants, and
               `aria-hidden` because the label already says it. */
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="shrink-0 text-primary hover:text-primary"
                onClick={onEditRoll}
              >
                <PencilIcon data-icon="inline-start" aria-hidden />
                Edit
              </Button>
            ) : null
          }
        >
          {rollApplied ? (
            <AttendanceRolls document={order} />
          ) : (
            <PaperAttendance
              appearances={appearances}
              marks={marks}
              onMark={onMark}
              onApply={onApplyRoll}
            />
          )}
        </PaperBlock>

        <PaperBlock
          id="order-next"
          label="Next hearing"
          focusable
          framed={!postingApplied}
          action={
            postingApplied ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="shrink-0 text-primary hover:text-primary"
                onClick={onEditPosting}
              >
                <PencilIcon data-icon="inline-start" aria-hidden />
                Edit
              </Button>
            ) : null
          }
        >
          {postingApplied ? (
            <NextHearingLines document={order} draft={draft} />
          ) : (
            <PaperNextHearing
              draft={draft}
              onSkip={onSkip}
              onPurpose={onPurpose}
              onDate={onDate}
            />
          )}
        </PaperBlock>
      </div>

      {/* The composed region: one box, always here, whether or not a template has been
          pulled into it, and **ruled at the top**.

          The top rule is what makes the editor read as the passage this document is for
          rather than a control that has landed on the sheet. The matching rule below was
          dropped (owner, 2026-09-15): with the next posting now beside attendance, nothing
          sits under the writing, so a bottom hairline was a leftover divider over empty
          card. The editor's own border already closes the writable region. */}
      <div className="flex min-w-0 flex-col border-t border-hairline py-6">
        <OrderBody
          value={draft.body}
          revision={bodyRevision}
          onChange={onBody}
        />
      </div>
    </article>
  );
}

/**
 * Attendance as the order prints it once the roll is set down: two lines, not a running
 * sentence.
 *
 * The offices are listed, not the names — an order sheet's Present line names offices,
 * and the block was a table of them a press ago. A side that has nobody on it prints no
 * line at all rather than an empty one: "Absent: —" is a sentence about nothing, and an
 * unmarked roll says so in the muted voice rather than leaving the eyebrow over nothing.
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
 * The roll, called on the sheet itself.
 *
 * **An exploration, opened on the owner's ask (2026-09-15):** can attendance live on the
 * paper rather than in the panel? It has been tried once — D45 put the roll and the next
 * posting on the page as inline editors on 2026-09-14 and the owner reversed it the same
 * day, because two editors on the sheet met the typist with ~400px of form before the
 * first line of the order. What answers that objection here is not the size of the
 * control: the form is how the roll is *called*, and the moment every office has an
 * answer the block is two printed lines again.
 *
 * **Rebuilt after the first attempt looked, in the owner's words, poorly made
 * (2026-09-15).** Three faults, all of them layout rather than primitive:
 *
 * 1. `justify-between` in a column of its own stranded each control in the middle of a
 *    two-thirds-wide sheet, tethered to its label by 200px of nothing. It is a grid now —
 *    one column for the offices, one for their answers — sized `w-fit`, so the answers
 *    line up directly after the longest office and the pair reads as a row of a table.
 *    That is what an attendance roll is, and it is why the roll needed no second change
 *    when the block moved into half the sheet's width: a table that hugs its content fits
 *    whatever column it is given.
 * 2. Four full-height wells stacked down the page were the loudest objects on a sheet
 *    whose whole point is the writing. `size="compact"` is the DS's answer for exactly
 *    this — a 32px well that keeps its 40px hit target — so the wells stop being slabs
 *    without any of them becoming a smaller target than the Laws allow.
 * 3. Nothing ended it, so the controls read as furniture rather than as work with an
 *    end. The last answer closes the block now: four offices answered is the whole of
 *    the question, and the printed lines are what the sheet shows from then on.
 *
 * `SegmentedControl`, not the panel's two checkbox rolls: one question per person with
 * one answer, so *Present | Absent* beside the office is the shortest true form of it,
 * and a person cannot be ticked into both rolls at once. It carries state as weight
 * rather than as brand colour, which is what keeps four of them quiet on paper.
 */
function PaperAttendance({
  appearances,
  marks,
  onMark,
  onApply,
}: {
  appearances: Appearance[];
  marks: OrderDraft["marks"];
  onMark: (id: string, mark: AttendanceMark | undefined) => void;
  onApply: () => void;
}) {
  const rollId = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* `w-fit` with `max-w-full`: the table is as wide as its two columns need and no
          wider, and on a narrow screen the office column takes the squeeze by wrapping
          rather than pushing the answers off the sheet. */}
      <div className="grid w-fit max-w-full grid-cols-[auto_auto] items-center gap-x-6 gap-y-1">
        {appearances.map((appearance) => {
          const labelId = `${rollId}-${appearance.id}`;
          const mark = marks[appearance.id];
          return (
            <React.Fragment key={appearance.id}>
              {/* The office, and it names the control beside it rather than labelling it
                  twice: the segments say *Present* and *Absent*, which are the answers,
                  and this says whose. `wrap-break-word` because this app ships per state
                  and a Malayalam role label is longer than the English one. */}
              <span
                id={labelId}
                className="text-body-compact min-w-0 wrap-break-word"
              >
                {rollLabel(appearance, appearances)}
              </span>
              <SegmentedControl
                type="single"
                size="compact"
                value={mark ?? ""}
                /* Pressing the answer that is already given clears it — Radix hands back
                   an empty string — and the roll goes back to incomplete. A court record
                   with no answer for a person is a real state; one that cannot be
                   corrected is not. */
                onValueChange={(next) =>
                  onMark(
                    appearance.id,
                    next === "present" || next === "absent" ? next : undefined,
                  )
                }
                aria-labelledby={labelId}
                className="justify-self-start"
              >
                <SegmentedControlItem value="present">
                  Present
                </SegmentedControlItem>
                <SegmentedControlItem value="absent">
                  Absent
                </SegmentedControlItem>
              </SegmentedControl>
            </React.Fragment>
          );
        })}
      </div>

      {/* **Outline, not the page's one primary.** Send to sign order is the act this
          screen builds towards and it sits in the footer; a second filled button on the
          sheet would compete with it for the same meaning.

          Never disabled. The roll that needs this press is the one an office cannot
          answer — an advocate who was not required to attend is neither present nor
          absent — and such a roll can be in any state, including untouched. A gate here
          would withhold the control from exactly the sitting it exists for. */}
      <Button
        id="order-attendance-apply"
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={onApply}
      >
        Apply attendance
      </Button>
    </div>
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
 * The posting as the order prints it once it is settled: the two facts, as lines.
 *
 * The same two labels the fields wore a press ago, which is the point — nothing moves
 * between asking and printing, so the block reads as one thing in two states rather than
 * as a form that was swapped for a summary. A matter that is not being listed again
 * prints the closing sentence the order itself carries.
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
          {/* A gap stays a gap. The block only prints once both facts are in, so this is
              for the matter reopened and half-cleared rather than for the ordinary
              path. */}
          <dd
            className={cn(
              "text-body-compact min-w-0",
              line.value ? "text-foreground" : "text-muted-foreground",
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
 * Where the matter is posted to, settled on the sheet.
 *
 * **The second half of the same exploration** (owner, 2026-09-15): the two lines this
 * block printed — *Purpose of next hearing* and *Date of next hearing* — are the labels
 * of the controls that set them, and once both are answered they are those lines again.
 *
 * **The labels sit above their controls, and the controls fill the column.** They were
 * a label beside a `w-48` control while this block had the sheet's whole width; in half
 * of it, a long label and a fixed control wrapped into an accidental stack — the same
 * layout, arrived at by running out of room, which is how a field ends up with its
 * control in a different place on every row. Stated instead: two full-width fields, and
 * the pair reads down the column rather than across it.
 *
 * **The exception keeps its own line and its own polarity.** *List it again* is the
 * ordinary end of a §138 listing and the reference's "Skip scheduling next hearing"
 * asked it backwards; the panel's version fixed that and this keeps the fix. It sits
 * above the two rows because unticking it takes them away — a control that removes what
 * is under it does not belong beneath them.
 *
 * **The calendar is owned here rather than taken from `DatePicker`** (owner, 2026-09-15:
 * the date "dropdown is not working properly"; open it upward so the whole month is
 * visible). `DatePicker` renders its own `Popover` and hardcodes `align="start"` with no
 * side, no collision padding and no way to close the surface when a day is chosen — a
 * screen using it cannot reach any of that, in props or in CSS, which is `ds-requests`
 * 19 and the same reason the bulk-reschedule filter owns its own popover. Owning it buys
 * three things this block needs:
 *
 * - `side="top"`. This block is the last thing on a long sheet, so a calendar opening
 *   downward opens into the sticky footer and the viewport edge. Above the trigger it has
 *   the whole page to sit in. `collisionPadding` keeps it off the edge if it does flip,
 *   and the available-width ceiling keeps it from hanging off a narrow screen
 *   (RESPONSIVE.md 9).
 * - **It closes when a day is chosen.** The primitive leaves the surface standing over
 *   the sheet after the answer has been given, which is most of what "not working
 *   properly" was: the date *was* set, underneath a calendar still covering the page.
 * - The trigger is named by the printed label beside it rather than by a repeated one.
 */
function PaperNextHearing({
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
  const fieldId = React.useId();
  const listing = draft.next === "list";
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const chosen = draft.nextDate ? parseIsoDay(draft.nextDate) : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-10 min-w-0 items-center gap-2">
        <Checkbox
          id={`${fieldId}-list`}
          /* As on the panel's own checkboxes: the box would otherwise be the one
             arrow-cursor spot in a row the label has made a pointer. */
          className="cursor-pointer"
          checked={listing}
          onCheckedChange={(checked) => onSkip(checked !== true)}
        />
        <Label
          htmlFor={`${fieldId}-list`}
          className="text-body-compact min-h-10 min-w-0 flex-1 cursor-pointer font-normal"
        >
          List it again
        </Label>
      </div>

      {listing ? (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            {/* The printed label, naming the control rather than being repeated inside
                it: `SelectValue`'s placeholder asks for the answer ("Choose a purpose")
                and this says what the answer is about. */}
            <span
              id={`${fieldId}-purpose`}
              className="text-body-compact min-w-0 wrap-break-word"
            >
              Purpose of next hearing
            </span>
            <Select
              value={draft.nextPurpose || undefined}
              onValueChange={(value) =>
                onPurpose(value as CourtHearingPurposeId)
              }
            >
              <SelectTrigger
                aria-labelledby={`${fieldId}-purpose`}
                className="w-full"
              >
                {/* The label, rendered rather than left to the primitive. `SelectValue`
                    resolves its own text from the mounted item on the client, so a
                    trigger with a value server-renders empty and fills in on hydration.
                    In the panel that flash never showed — the section arrived collapsed,
                    and by the time anyone opened it the page had hydrated. On the sheet
                    the control is always mounted, and a completed listing arrives with a
                    purpose already chosen (`order-demo.ts`), so the first paint would
                    have been an empty box on a page that does have an answer. Children
                    win over the primitive's lookup; the placeholder still shows when
                    there is no value, which is what `|| undefined` on the value is
                    for. */}
                <SelectValue placeholder="Choose a purpose">
                  {draft.nextPurpose
                    ? courtHearingPurposeLabel(draft.nextPurpose)
                    : null}
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
                {/* Named by the label beside it *and* by its own content, the way a
                    combobox is: "Date of next hearing, October 6th, 2026". The label
                    alone would drop the date; the content alone would drop what the date
                    is of. */}
                <Button
                  id={`${fieldId}-date-trigger`}
                  variant="outline"
                  aria-labelledby={`${fieldId}-date ${fieldId}-date-trigger`}
                  className={cn(
                    "w-full justify-start gap-2 text-left font-normal",
                    !chosen && "text-muted-foreground",
                  )}
                >
                  <CalendarDaysIcon data-icon="inline-start" aria-hidden />
                  <span className="truncate">
                    {draft.nextDate
                      ? formatListingDate(draft.nextDate)
                      : "Pick a date"}
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
                  onSelect={(day) => {
                    onDate(day ? isoDay(day) : null);
                    /* The answer given, the surface goes. Leaving it standing over the
                       sheet is what made choosing a date feel like nothing had
                       happened. */
                    if (day) setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      ) : null}
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
  focusable,
  framed,
  action,
  children,
}: {
  id: string;
  label: string;
  /** Sends focus here from elsewhere on the screen — see the note below. */
  focusable?: boolean;
  /**
   * Draws the block as its own section on the sheet — a nested well, for a block that is
   * a *form* rather than a passage of the order.
   *
   * The DS's rule for content that must read as its own unit inside a card (FAQ, form
   * section, case facts) is a hairline edge, never a fill difference — and for something
   * nested *inside* a card, `surface-sunken` with a hairline, because it holds
   * interactive content. Not a second `Card`: the sheet is already `shadow-raised`, and a
   * raised box inside a raised box flattens both, which is the same reading that took the
   * page out of its old panel.
   *
   * The recess also does the control states a favour. A `SegmentedControl`'s own well is
   * `surface-sunken` too, so inside this it reads by its hairline rather than by its
   * fill — and the selected pill, which is `card` plus a raised shadow, now lifts off a
   * recessed ground instead of sitting on the same white. Marked and unmarked are further
   * apart here than they were on the bare sheet.
   */
  framed?: boolean;
  /**
   * One control on the eyebrow's own line — the way back into a block that has been set
   * down. This is *not* the teal **Mark attendance** button removed on 2026-09-14: that
   * one opened an editor living somewhere else, which is why two entry points to one
   * editor was the fault. The editor is on this page now, and what this carries is the
   * switch between the block as a form and the block as the document it produces.
   */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-2",
        framed && "rounded-lg border border-hairline bg-surface-sunken p-4",
      )}
    >
      {/* An eyebrow and nothing else. It carried a teal **Mark attendance** / **Set next
          hearing** text button until 2026-09-14, when the editors it opened went back to
          the panel on the owner's instruction — so the page is output again and the way
          in is the panel row that owns the fact. The affordance is not missed twice: two
          entry points to one editor is the thing that made the paper carry ~400px of form
          on arrival, and the block's own heading keeps the page's furniture intact
          without it.

          **`tabIndex` only where something focuses the heading**, which is now the
          attendance block: answering the last application hands the typist the roll, and
          the roll is on this page. Every other block leaves the attribute off — the `id`
          is there to name the region through `aria-labelledby`, and naming wants no
          tabindex. A focusable element nothing focuses is a claim the next reader has to
          disprove before they dare move anything near it. */}
      {/* The eyebrow keeps its line to itself when there is no control: a flex row with
          one child lays out exactly as the heading did. */}
      <div className="flex min-w-0 items-center justify-between gap-4">
        <h3
          id={id}
          tabIndex={focusable ? -1 : undefined}
          className="text-caption font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * What one roll calls each appearance.
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
