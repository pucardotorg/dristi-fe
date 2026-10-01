/**
 * What this sitting is likely to produce — read off the sitting, not just its purpose.
 *
 * `likelyTemplatesFor` in `order-templates.ts` answers one question: what does the
 * source's hearing-purpose table list against the purpose this matter was listed for?
 * That is the right baseline and it stays the baseline here. It is also everything the
 * suggestion knew until now, which meant the first row of the cause list — an evidence
 * listing with a **bail application** standing in it (`listing-applications.ts`) — was
 * offered witness batta and a witness summons, and never the one order the bench was
 * actually about to pass.
 *
 * **What the real chain shows.** `public/case-file/09-orders.pdf` is nine orders from
 * cognizance to sentence, and read end to end it says what a day-order is made of. Every
 * one carries a substantive direction plus the next date — the next date is already its
 * own control on this screen, so what is left is the direction, and *what the direction
 * is* turns on four things the screen already knows:
 *
 * 1. **The application standing in the matter.** "Bail application considered… bail is
 *    granted on execution of bond" (DOC-ORD-003). The order follows the application, and
 *    the bench has the application in front of it on this same screen.
 * 2. **Who appeared.** The same order reads "Accused… appears with counsel", and that is
 *    the branch: an accused who appears is put to plea and bailed; an absent one is
 *    warranted. The bench marks attendance here, so the screen watches it happen.
 * 3. **What is already in this order.** "Cognizance is taken. Issue summons to the
 *    accused" (DOC-ORD-001) is *one* order carrying two items, in that order. Once
 *    cognizance is down, the summons is the next thing written — not a coincidence of
 *    that day but the register's own chain.
 * 4. **What it was listed for.** The source's table, unchanged.
 *
 * **It still suggests and never restricts.** Nothing is removed by a signal and no gate
 * is invented here: a row a signal argues against is ranked lower, never dropped, and
 * availability stays `unavailableReason`'s to decide. The whole catalogue is a search
 * field away underneath, which is why capping the shortcut at `MAX_SUGGESTIONS` hides
 * nothing.
 *
 * **What it will not guess.** An order is a judicial act, so a consequence the source
 * does not tie to the situation is not one this module will infer. The accused's absence
 * promotes `issue-of-warrants` only where the source's own purpose row already lists it
 * (rows 5, 6 and 9 — appearance, bail, examination under S. 351); at a plea hearing the
 * source names no warrant and so neither does this. That gap is real and belongs to
 * product, not to a ranking function — see §12 of the brief.
 */

import {
  courtHearingPurposeLabel,
  partySideLabel,
  type CounselSide,
  type CourtCaseStage,
  type CourtHearingPurposeId,
} from "./hearings";
import type { ListingApplicationDecision } from "./listing-applications";
import { orderItemLabel, type OrderItemTypeId } from "./order-items";
import type { OtherApplicationType } from "./other-applications";
import {
  LIKELY_BY_PURPOSE,
  likelyTemplatesFor,
  orderTemplate,
  unavailableReason,
  type OrderCatalogueContext,
  type OrderTemplate,
  type OrderTemplateId,
} from "./order-templates";

/**
 * The most a shortcut may hold before it stops being one.
 *
 * Five, which is the longest the source's own purpose rows run (row 2 and row 4 list
 * four, and a signalled order can join them). Past that the section is a second
 * catalogue rather than a way past the first, and the first is directly underneath it.
 */
export const MAX_SUGGESTIONS = 5;

/**
 * Why an order is being suggested, strongest first.
 *
 * Ranked rather than weighted: a ground is a *reason*, and a reason either applies or
 * does not. Summing weights would produce an order nobody could explain to a bench, and
 * this list is exactly the explanation — an order suggested because the bench allowed an
 * application outranks one suggested because the purpose table mentions it, always.
 */
export type SuggestionGround =
  | "application-allowed"
  | "party-absent"
  | "order-chain"
  | "application-pending"
  | "purpose";

const GROUND_ORDER: SuggestionGround[] = [
  "application-allowed",
  "party-absent",
  "order-chain",
  "application-pending",
  "purpose",
];

/** One person the bench has marked, reduced to what a suggestion can read. */
export type AttendanceSignal = {
  side: CounselSide;
  kind: "party" | "counsel";
  mark: "present" | "absent";
};

/** One application on this listing, and how the bench has answered it so far. */
export type ApplicationSignal = {
  /** The application's own `CMP/…` number — what the reason line cites. */
  number: string;
  type: OtherApplicationType;
  /** Absent while it is still pending, which is a state and not a default. */
  decision?: ListingApplicationDecision;
};

export type OrderSuggestionSignals = {
  purpose: CourtHearingPurposeId;
  catalogue: OrderCatalogueContext;
  attendance: readonly AttendanceSignal[];
  applications: readonly ApplicationSignal[];
  /** What the draft order already carries, in the order it carries it. */
  chosen: readonly OrderItemTypeId[];
};

export type OrderSuggestion = {
  template: OrderTemplate;
  ground: SuggestionGround;
  /**
   * The caption under the row — why this order is here, or `null` for the baseline.
   *
   * `null` on purpose rather than a sentence. The section is headed "Likely at this
   * hearing", so a row that is there *because* the purpose table lists it has already
   * been explained by the heading, and captioning it again buys a line of text and no
   * information. Only a signal the reader cannot see from the heading earns a sentence.
   */
  reason: string | null;
  /**
   * Which items of the draft order are already of this type, by paragraph number.
   *
   * Not a boolean, because the row says the number: "Already item 2" tells a typist
   * where to look, and "already added" tells them to go hunting. Empty is the ordinary
   * case.
   */
  alreadyAt: number[];
  /**
   * The application this suggestion arrived from, where one did.
   *
   * Carried so that clicking the row *fills* the order with that application's number —
   * the spec's application-context pass: *"the Application Number and Application Type
   * are already known, because the judge arrived at this order from the application
   * itself."* The row already says which one ("Follows CMP/330/2026, allowed at this
   * hearing"), so an order that then opened on a bare `[Application Number]` would be
   * the screen asking the typist to retype what it just told them.
   *
   * It also resolves the ambiguous case that a count cannot: with two applications
   * standing on one listing, "exactly one candidate" fails, but *this* row still knows
   * which of the two it came from.
   */
  fromApplication?: ApplicationSignal;
};

/**
 * The order an allowed application calls for.
 *
 * Each pair is either written into the template's own words or named by the source's
 * purpose table — none is inferred from what an application "ought" to lead to:
 *
 * - **Case withdrawal** → `withdrawal-of-case`, whose BOTD opens "As per application
 *   [Application Number] complainant has sought to withdraw the complaint". The template
 *   takes the application number as a locked variable; it cannot be written without one.
 * - **Production of documents** → `mandatory-submissions`, whose BOTD *is* the direction
 *   to produce: "It is directed that the [Party Type] files a [Document Type]… before the
 *   court by [Deadline for Submission]".
 * - **Bail** → `bail`. DOC-ORD-003 of the chain: "Bail application considered… bail is
 *   granted on execution of bond", and the source's row 6 lists Bail against the Bail
 *   purpose.
 * - **Adding witnesses** → `issue-of-summons` then `witness-batta`. The source's row 8
 *   names "Issue of summons (for witnesses)", and batta is what the summoned witness is
 *   paid.
 * - **Settlement** → `case-settlement` ("The settlement records have been accepted by the
 *   court. Case closed."), which rows 14 and 15 also list.
 * - **Case transfer** → `case-transfer`.
 *
 * The heads that are deliberately absent are as considered as the ones present. An
 * **adjournment** application moves the next date, which is the Next hearing control and
 * not an order item. An **extension of a submission deadline** and **bail documents** are
 * answered by templates the source marks *not in dropdown* — they are reached from the
 * application itself, which on this screen is the Accept / Reject on the row. Neither
 * belongs in a list of orders to add.
 */
const APPLICATION_CONSEQUENCE: Partial<
  Record<OtherApplicationType, OrderTemplateId[]>
> = {
  bail: ["bail"],
  "case-transfer": ["case-transfer"],
  "case-withdrawal": ["withdrawal-of-case"],
  "production-of-documents": ["mandatory-submissions"],
  settlement: ["case-settlement"],
  "adding-witnesses": ["issue-of-summons", "witness-batta"],
};

/**
 * Orders whose whole purpose is to compel an attendance that has already happened.
 *
 * Used only to rank, never to remove. DOC-ORD-003 is the reason: the accused appeared, so
 * the sitting went to plea and bail and issued no process. A summons offered first to a
 * bench whose accused is standing in front of it is the suggestion being wrong in the one
 * position that matters.
 */
const PROCESS_AGAINST_ABSENCE: OrderTemplateId[] = [
  "issue-of-summons",
  "issue-of-warrants",
  "issue-of-notice",
  "issue-of-proclamation",
  "issue-of-attachment",
];

/**
 * Purposes at which the source's own row answers the accused's absence with a warrant.
 *
 * Rows 5, 6 and 9 of the hearing-purpose table. Kept as a list rather than a rule so that
 * adding a purpose to it is a product decision somebody has to make on purpose.
 */
const WARRANT_ON_ABSENCE: CourtHearingPurposeId[] = [
  "appearance",
  "bail",
  "examination-of-accused-351",
];

/** The one chain the order pack shows inside a single order: cognizance, then summons. */
const ORDER_CHAIN: { after: OrderTemplateId; then: OrderTemplateId } = {
  after: "cognizance",
  then: "issue-of-summons",
};

/**
 * Whether cognizance is still to be taken — read against this order, not only the case.
 *
 * The two halves of the source disagree here, and the order pack settles it.
 * `issue-of-summons` is gated "once the case is on file", while the hearing-purpose table
 * lists Issue of summons against the Admission and Cognizance purposes — at which the
 * case is by definition *not* on file yet. DOC-ORD-001 of `public/case-file/09-orders.pdf`
 * is what the court actually does: **"Cognizance is taken. Issue summons to the accused on
 * payment of process fee."** One order, both directions.
 *
 * So cognizance taken *as an item of this draft* puts the case on file for the rest of the
 * order. It is the only reading under which the register's own first order can be written
 * on this screen at all, and it correctly shuts the two types that are open only before
 * cognizance: a case taken on file at item 1 cannot be dismissed at item 2.
 *
 * Lives here rather than inline in the composer because it is a reading of the source, not
 * a detail of a render — the reasoning and the rule belong in one place.
 */
export function cognizanceDueFor(
  stage: CourtCaseStage,
  chosen: readonly OrderItemTypeId[],
): boolean {
  return stage === "cognizance" && !chosen.includes("cognizance");
}

/**
 * The application on this listing that *this* order type answers, when exactly one does.
 *
 * For the path where no suggestion row was pressed — the typist searched the catalogue
 * and picked an order directly — and the reason it is type-matched rather than counted.
 *
 * **A count is not a safe rule here, and the first build of the auto-fill pass used one.**
 * It filled `[Application Number]` from "the only application standing on the listing",
 * which on the board's own h-245 meant a **withdrawal** order opening on the number of an
 * application for **production of documents**. A wrong application named in an order is
 * the worst thing this pass can do, and it read as perfectly finished text.
 *
 * The spec's condition is not "there is only one" — it is *"the judge arrived at this
 * order from the application itself"*. `APPLICATION_CONSEQUENCE` is exactly that arrival
 * written down, so matching through it means a withdrawal order can only ever take a
 * withdrawal application's number. Two of the same head standing at once is ambiguous
 * again and returns nothing, which leaves the token open.
 */
export function applicationForOrder(
  type: OrderItemTypeId,
  applications: readonly ApplicationSignal[],
): ApplicationSignal | undefined {
  const answering = applications.filter(
    (application) =>
      application.decision !== "dismissed" &&
      (APPLICATION_CONSEQUENCE[application.type] ?? []).includes(
        type as OrderTemplateId,
      ),
  );
  return answering.length === 1 ? answering[0] : undefined;
}

function isAbsent(
  attendance: readonly AttendanceSignal[],
  side: CounselSide,
): boolean {
  return attendance.some(
    (entry) =>
      entry.side === side && entry.kind === "party" && entry.mark === "absent",
  );
}

function isPresent(
  attendance: readonly AttendanceSignal[],
  side: CounselSide,
): boolean {
  return attendance.some(
    (entry) =>
      entry.side === side && entry.kind === "party" && entry.mark === "present",
  );
}

/**
 * The suggestions for this sitting, most likely first.
 *
 * Pure, and takes signals rather than a `CourtHearing` and an `OrderDraft`, so the
 * ranking can be tested against a state the fixtures do not happen to contain — an
 * absent accused at an appearance listing is not on the demo board and is the case the
 * ranking exists for.
 */
export function orderSuggestions(
  signals: OrderSuggestionSignals,
): OrderSuggestion[] {
  const { purpose, catalogue, attendance, applications, chosen } = signals;

  /* Collected per template so a template argued for twice keeps its strongest ground and
     that ground's sentence, rather than appearing twice in a list of five. */
  const found = new Map<
    OrderTemplateId,
    {
      ground: SuggestionGround;
      reason: string | null;
      order: number;
      application?: ApplicationSignal;
    }
  >();

  function claim(
    id: OrderTemplateId,
    ground: SuggestionGround,
    reason: string | null,
    order: number,
    application?: ApplicationSignal,
  ) {
    const template = orderTemplate(id);
    /* The gates stay where they are. A suggestion cannot make an order available that
       the state of the case does not allow — it would be a shortcut to a row the
       catalogue below prints with a reason it cannot be used. */
    if (unavailableReason(template, catalogue) !== null) return;
    const held = found.get(id);
    if (held && GROUND_ORDER.indexOf(held.ground) <= GROUND_ORDER.indexOf(ground)) {
      return;
    }
    found.set(id, { ground, reason, order, application });
  }

  /* 1 and 4 — the applications standing in the matter. An allowed one has been decided
     and its order is the next thing to write; a pending one is a conditional, and the
     sentence says so rather than pretending the bench has ruled. */
  applications.forEach((application, index) => {
    if (application.decision === "dismissed") return;
    const consequences = APPLICATION_CONSEQUENCE[application.type] ?? [];
    consequences.forEach((id, position) => {
      const order = index * 10 + position;
      if (application.decision === "allowed") {
        claim(
          id,
          "application-allowed",
          `Follows ${application.number}, allowed at this hearing`,
          order,
          application,
        );
      } else {
        claim(
          id,
          "application-pending",
          `If ${application.number} is allowed`,
          order,
          application,
        );
      }
    });
  });

  /* 2 — who appeared. Absence promotes only what the source's own row for this purpose
     already answers it with, and only against the accused: a warrant is process against
     the person the court has required to attend, so a complainant's absence is not
     answered by borrowing the accused's remedy. What it *is* answered by, the source does
     not say — recorded as an open question rather than guessed. */
  if (
    isAbsent(attendance, "accused") &&
    WARRANT_ON_ABSENCE.includes(purpose) &&
    (LIKELY_BY_PURPOSE[purpose] ?? []).includes("issue-of-warrants")
  ) {
    claim(
      "issue-of-warrants",
      "party-absent",
      `The ${partySideLabel("accused")} is marked absent`,
      0,
    );
  }

  /* 3 — the chain inside one order. DOC-ORD-001 carries both, in this order. */
  const chainAt = chosen.indexOf(ORDER_CHAIN.after);
  if (chainAt !== -1) {
    claim(
      ORDER_CHAIN.then,
      "order-chain",
      `Follows ${orderItemLabel(ORDER_CHAIN.after).toLowerCase()} at item ${chainAt + 1}`,
      0,
    );
  }

  /* 5 — the baseline: the source's hearing-purpose table, in the source's own order, and
     through the same function the screen used before any of this existed. `claim` would
     gate these anyway; going through `likelyTemplatesFor` keeps one definition of "what
     the purpose table offers this matter" rather than a second copy of it here. */
  likelyTemplatesFor(purpose, catalogue).forEach((template, position) => {
    claim(template.id, "purpose", null, position);
  });

  const accusedPresent = isPresent(attendance, "accused");

  const suggestions: OrderSuggestion[] = Array.from(found.entries()).map(
    ([id, held]) => {
      const alreadyAt = chosen
        .map((type, index) => (type === id ? index + 1 : 0))
        .filter((number) => number > 0);
      return {
        template: orderTemplate(id),
        ground: held.ground,
        reason: held.reason,
        alreadyAt,
        fromApplication: held.application,
      };
    },
  );

  return suggestions
    .sort((a, b) => {
      const held = (entry: OrderSuggestion) => found.get(entry.template.id)!;
      /* An order already written into this draft drops below everything still to write.
         It is not removed: a second summons to a second witness is a real second item,
         which is why the row stays and says which item it already is. */
      const written =
        Number(a.alreadyAt.length > 0) - Number(b.alreadyAt.length > 0);
      if (written !== 0) return written;

      const ground =
        GROUND_ORDER.indexOf(a.ground) - GROUND_ORDER.indexOf(b.ground);
      if (ground !== 0) return ground;

      /* Within the baseline only: process against an absence the bench has just
         contradicted sinks. Ranking, not a gate — the row keeps its place in the list. */
      if (a.ground === "purpose" && accusedPresent) {
        const moot = (entry: OrderSuggestion) =>
          Number(PROCESS_AGAINST_ABSENCE.includes(entry.template.id));
        const settled = moot(a) - moot(b);
        if (settled !== 0) return settled;
      }

      return held(a).order - held(b).order;
    })
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * The caption a suggestion row carries, or `null` for none.
 *
 * One place, because the row has three things it might say and only one line to say them
 * in: what the draft already did with this order, why a signal put it here, or what
 * workflow it sets in motion. They are in that order because that is the order a typist
 * needs them — an order already written is the fact that changes what they do next.
 */
export function suggestionCaption(suggestion: OrderSuggestion): string | null {
  if (suggestion.alreadyAt.length > 0) {
    return suggestion.alreadyAt.length === 1
      ? `Already item ${suggestion.alreadyAt[0]}`
      : `Already items ${suggestion.alreadyAt.join(", ")}`;
  }
  return suggestion.reason ?? suggestion.template.workflow ?? null;
}

/**
 * What the section says when a purpose produces nothing and no signal argues for
 * anything.
 *
 * A real state: the source's rows 18 and 20 (review application) list no order at all,
 * and row 19 lists "any order". The section used to render nothing, which reads as a
 * screen that has not loaded rather than a listing the table has nothing to say about.
 */
export function noSuggestionsNote(purpose: CourtHearingPurposeId): string {
  return `The court's table names no usual order for a ${courtHearingPurposeLabel(purpose).toLowerCase()} listing. Search the catalogue below.`;
}
