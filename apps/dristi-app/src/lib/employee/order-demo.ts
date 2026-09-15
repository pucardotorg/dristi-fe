/**
 * The order a listing the bench has finished already carries.
 *
 * End hearing says the matter was heard. Until now the orders icon on that row opened
 * an empty composer, which said the opposite — a sitting that produced nothing. So a
 * completed listing opens on a written order: the roll taken, the applications that were
 * pending answered, the item dictated, and the matter posted on.
 *
 * **It is demo text, and it is not a transcript.** Nothing in this build listens to a
 * courtroom, and no word here was said by anybody. It is the same bargain the rest of
 * `/employee` makes (`hearings.ts`, `order-drafts.ts`): the draft dies on a reload, and
 * nothing is filed, signed or notified. The screen says as much where it acts — the
 * Add-signature overlay's own warning, and the note read out when a signature is
 * recorded — rather than in a standing line of footer prose, which it has never had. What this module buys is a screen that can be walked through end to end —
 * call a matter, end it, open the order — without somebody having to type an order first.
 *
 * It is the listing's *opening* draft, not a lock on it: the moment the bench changes
 * anything the edit is kept over this, and a listing that was dictated on during the
 * sitting keeps every word of that instead (`order-drafts.ts` holds the real one).
 */

import { addDays } from "./bulk-reschedule";
import {
  hearingById,
  parseIsoDay,
  type CourtHearing,
  type CourtHearingPurposeId,
  type CourtHearingStatus,
} from "./hearings";
import {
  applicationsForListing,
  listingApplicationSentence,
} from "./listing-applications";
import {
  appearancesFor,
  EMPTY_ORDER_DRAFT,
  orderTemplateFacts,
  type AttendanceMark,
  type OrderDraft,
} from "./order-draft";
import {
  appendRichText,
  createOrderItem,
  richTextFromPlain,
  type OrderItemDraft,
  type OrderItemTypeId,
} from "./order-items";
import type { OrderTemplateFacts } from "./order-templates";
/* Type-only, as everywhere else in `/employee`: a value import here would drag a
   client component into a module a node test reads. */
import type { RichTextValue } from "@/components/cases/rich-text-field";

/**
 * The item, as the bench would have dictated it on this listing.
 *
 * One paragraph per purpose, because the purpose is what the sitting was for: an order
 * on a plea listing reads nothing like an order on a judgement listing, and a single
 * generic passage repeated down the board would be the tell that none of it is real.
 *
 * None of them names the next date. The order closes with the next listing as its own
 * block (`assembleNextListing`), and an item that also said it would print the date
 * twice on the same page.
 */
const ITEM_TEXT: Record<CourtHearingPurposeId, string> = {
  admission:
    "The complaint under Section 138 of the Negotiable Instruments Act, 1881 was taken up for admission. Counsel for the complainant was heard on maintainability, and the sworn statement of the complainant was recorded.",
  appearance:
    "The accused appeared before the court and was furnished with a copy of the complaint and of the documents filed along with it. The accused shall remain present on every posting date unless exempted.",
  arguments:
    "Counsel for the complainant advanced final arguments and relied on the documents already marked. Counsel for the accused was heard in part, and the arguments in reply are to be continued.",
  bail: "The application for bail was taken up and both sides were heard. The accused, who has appeared on every posting date so far, is released on bail on executing a bond with one surety to the satisfaction of this court.",
  cognizance:
    "The complaint, the sworn statement of the complainant and the documents produced were perused. There is sufficient ground to proceed, and cognizance is taken of the offence under Section 138 of the Negotiable Instruments Act, 1881.",
  "delay-condonation":
    "The petition to condone the delay in presenting the complaint was taken up and heard. The reasons stated are sufficient, and the delay in presenting the complaint stands condoned.",
  "evidence-of-complainant":
    "The complainant was examined in chief as PW-1 and the documents produced were marked. Cross-examination was taken up and could not be completed for want of time.",
  "examination-of-accused-351":
    "The accused was examined under Section 351 of the Bharatiya Nagarik Suraksha Sanhita, 2023. The circumstances appearing in the evidence against the accused were put, and the answers were recorded separately.",
  "for-reports":
    "The report called for has not been received. The office is directed to send a reminder and to place the report on the file as soon as it is received.",
  judgement:
    "Judgement was pronounced in open court and the operative portion was read out. The judgement, signed and dated, is placed on the file.",
  plea: "The substance of the accusation was read over and explained to the accused in a language known to the accused. The accused pleaded not guilty and claimed to be tried.",
};

/**
 * Which item of the catalogue the sitting actually passed.
 *
 * The purpose is what the day was listed for; the item is what came out of it, and the
 * two are not the same fact — a cognizance listing passes two items, the finding and the
 * summons that follows from it, while an evidence listing passes an order the catalogue
 * has no name for. `others` is the honest answer there, and it is the answer the
 * catalogue was built with (`order-items.ts`); inventing a type to avoid it would put a
 * name on the day-order that no court gave it.
 *
 * The first item carries the paragraph this sitting produced; anything after it opens on
 * its own standing words.
 */
const ITEM_TYPES: Record<CourtHearingPurposeId, OrderItemTypeId[]> = {
  admission: ["others"],
  appearance: ["others"],
  arguments: ["others"],
  bail: ["bail"],
  cognizance: ["cognizance", "issue-of-summons"],
  "delay-condonation": ["others"],
  "evidence-of-complainant": ["others"],
  "examination-of-accused-351": ["others"],
  /* The old catalogue had a "miscellaneous process" of this app's own invention; the
     court's twenty-seven have no such type, so a report that has not arrived is an order
     the catalogue cannot name — which is what `others` is for. */
  "for-reports": ["others"],
  judgement: ["judgement"],
  plea: ["others"],
};

/**
 * What the matter is posted on for.
 *
 * The ordinary progression of a §138 complaint, one step at a time — cognizance brings
 * the accused in, appearance leads to the plea, the plea opens the evidence. Two of them
 * point back at themselves on purpose: cross-examination that ran out of time resumes
 * for the same purpose, and a report that has not arrived is called for again.
 *
 * `null` is a real answer and not a gap: after judgement there is no next date, which is
 * what the composer's own "no next date" choice says.
 */
const NEXT_PURPOSE: Record<
  CourtHearingPurposeId,
  CourtHearingPurposeId | null
> = {
  admission: "cognizance",
  appearance: "plea",
  arguments: "judgement",
  bail: "plea",
  cognizance: "appearance",
  "delay-condonation": "cognizance",
  "evidence-of-complainant": "evidence-of-complainant",
  "examination-of-accused-351": "arguments",
  "for-reports": "for-reports",
  judgement: null,
  plea: "evidence-of-complainant",
};

/** Three weeks on, and never on a weekend the court does not sit. */
const NEXT_LISTING_DAYS = 21;

/** The next day this court would sit — Saturday and Sunday roll forward to Monday. */
export function nextSittingDay(from: string, days = NEXT_LISTING_DAYS): string {
  let day = addDays(from, days);
  while ([0, 6].includes(parseIsoDay(day).getDay())) {
    day = addDays(day, 1);
  }
  return day;
}

/** Everyone on the roll, present. */
function attendanceOf(hearing: CourtHearing): Record<string, AttendanceMark> {
  return Object.fromEntries(
    appearancesFor(hearing).map((appearance) => [appearance.id, "present"]),
  );
}

/**
 * Every application that was pending on this listing, allowed.
 *
 * One answer rather than a spread of them, because the answer has to agree with the item
 * above it: the demo item on an evidence listing says the cross-examination could not be
 * finished, so the adjournment asking for the balance to be taken later is allowed and
 * the next listing is where it goes. An order that recorded the opposite would be a
 * screen arguing with itself. Both sentences the document can print are still reachable
 * — the bench answers these itself from the composer, and either way is one click.
 */
/**
 * The disposals, as the order's own opening sentences.
 *
 * A completed sitting answered its applications before it passed anything, and the
 * sentences that record that live in the passage now rather than in a band above it —
 * so the fixture writes them where the live screen writes them (`decide`), ahead of the
 * directions the templates contribute. A draft that answered the applications without
 * the words being in the order would be showing a state the composer cannot reach.
 */
function disposalsOf(hearing: CourtHearing): RichTextValue {
  return applicationsForListing(hearing.id).reduce<RichTextValue>(
    (written, application) =>
      appendRichText(
        written,
        richTextFromPlain(
          listingApplicationSentence(hearing, application, "allowed"),
        ),
      ),
    { html: "", text: "" },
  );
}

function decisionsOf(hearing: CourtHearing): OrderDraft["applications"] {
  return Object.fromEntries(
    applicationsForListing(hearing.id).map((application) => [
      application.id,
      "allowed" as const,
    ]),
  );
}

/**
 * The items this sitting passed, with the day's own paragraph in the first of them.
 *
 * Ids are built from the listing rather than from the catalogue's counter, so the same
 * completed matter opens on the same items every time — the editors are keyed on them,
 * and an id that changed between renders would restart the typist's cursor.
 */
function itemsOf(
  hearing: CourtHearing,
  /* The same auto-fill pass a live add runs (`orderTemplateFacts`). Without it a
     completed listing would open on raw `[…]` tokens while clicking the identical order
     on a live one opened on filled text — one screen with two answers to what an order
     opens on. It changes nothing visible on today's fixtures, because the only item any
     of them carries past the first is the cognizance summons and its tokens are all
     parties, which stay the judge's to choose. That is the point: it is wired so it
     cannot drift, not because it currently shows. */
  facts: OrderTemplateFacts,
): OrderItemDraft[] {
  return ITEM_TYPES[hearing.purpose].map((type, index) => {
    const item = createOrderItem(
      type,
      `${hearing.id}-item-${index + 1}`,
      facts,
    );
    if (index > 0) return item;
    return { ...item, text: richTextFromPlain(ITEM_TEXT[hearing.purpose]) };
  });
}

/**
 * The draft this listing opens on.
 *
 * Empty until the sitting is over. A matter that has not been called has nothing to
 * record, and one the bench is *in* is the one case where a pre-written order would be
 * actively wrong — the whole point of the composer is that the bench dictates it while
 * the matter is standing there. Passed-over and rescheduled listings were never heard,
 * so nothing came out of today's sitting on them either.
 *
 * `status` is the live one — the sitting's own mark laid over the fixture
 * (`withHearingSession`), not the day's starting position. A matter the bench ended a
 * moment ago is `completed` in the session and still `scheduled` in the data.
 */
export function initialOrderDraft(
  hearing: CourtHearing,
  status: CourtHearingStatus,
  today: string,
): OrderDraft {
  if (status !== "completed") return EMPTY_ORDER_DRAFT;

  const nextPurpose = NEXT_PURPOSE[hearing.purpose];

  /* The sitting without its items, so the auto-fill pass can read the next listing this
     draft is about to claim — the facts depend on the draft and the items depend on the
     facts, so the draft is assembled in that order rather than all at once. */
  const sitting: OrderDraft = {
    marks: attendanceOf(hearing),
    applications: decisionsOf(hearing),
    next: nextPurpose ? "list" : "none",
    nextPurpose: nextPurpose ?? "",
    nextDate: nextPurpose ? nextSittingDay(today) : null,
    body: { html: "", text: "" },
    items: [],
  };

  /* The same two passes a live sitting makes, in the same order: the templates are
     chosen, then their words land in the one box. `items` stays the record of what was
     pulled in and `body` is what the bench would be reading — a fixture that filled one
     without the other would be showing a state the composer cannot actually reach. */
  const items = itemsOf(hearing, orderTemplateFacts(hearing, sitting, today));
  return {
    ...sitting,
    items,
    /* Disposals first, then the directions — the order a court takes them in, and the
       order the live screen produces them in when the panel opens on the applications. */
    body: items.reduce(
      (written, item) => appendRichText(written, item.text),
      disposalsOf(hearing),
    ),
  };
}


/**
 * The listings this court already has an order open on when the prototype opens, and
 * how far each one has got.
 *
 * **Why a seed exists at all.** A draft lives for the length of one visit
 * (`order-drafts.ts`), so on a cold load the only order in this court's hands would be
 * the one the finished sitting carries — one row on a screen built to hold a morning's
 * work. Anyone opening the prototype to look at the Draft orders queue would be looking
 * at an empty queue and would have to go and type eleven orders to see it work (owner,
 * 2026-09-16).
 *
 * **What it claims.** Exactly what a draft claims anywhere in this build: somebody at
 * this court has started writing this order and has not sent it for signature. Nothing
 * is filed, signed, notified or written back to a case, and the words are demo text that
 * no court passed — the same bargain the rest of this module makes. A reload puts the
 * court back to these eleven, and every edit made in between is gone.
 *
 * **Two states, because a half-written order is not one thing.** Most of them are
 * dictated: the roll taken, the applications answered, the day's paragraph written. Two
 * are the roll and nothing else — a typist who opened the composer, marked who answered
 * the call, and was pulled away. Both are states the live composer reaches, which is the
 * test a fixture has to pass: a seeded draft the screen could not produce would be a
 * screenshot rather than a demo.
 *
 * **None of them is posted on.** `nextDate` stays null on every seed, so the matter has
 * been heard and not yet given its next date — the one difference from
 * `initialOrderDraft`'s finished order, and the plainest thing an order still being
 * written looks like. It also keeps the seed free of today's date, so the fixture reads
 * the same on the server and in the browser and has nothing to go stale.
 */
const DICTATED: string[] = [
  "h-241",
  "h-243",
  "h-245",
  "h-247",
  "h-248",
  "h-250",
  "h-255",
  "h-260",
  "h-263",
];

/** Opened, the roll taken, nothing dictated yet. */
const ROLL_ONLY: string[] = ["h-252", "h-257"];

/** Where the matter goes next, as far as a draft that has not been posted on says it. */
function postingOf(hearing: CourtHearing): Pick<
  OrderDraft,
  "next" | "nextPurpose" | "nextDate"
> {
  const nextPurpose = NEXT_PURPOSE[hearing.purpose];
  return {
    /* After judgement there is no next date, which is the composer's own "no next date"
       choice rather than an unanswered question. */
    next: nextPurpose ? "list" : "none",
    nextPurpose: nextPurpose ?? "",
    nextDate: null,
  };
}

/**
 * The day's own paragraph as the one item pulled in.
 *
 * Only the first of the purpose's items, and deliberately: the ones after it open on
 * their standing template words, which carry `[…]` tokens until the auto-fill pass runs
 * over them with a case in hand. A fixture that froze those tokens would be showing an
 * order nobody had filled in — so the seed stops at the item that is already prose.
 */
function dictatedItem(hearing: CourtHearing): OrderItemDraft {
  const type = ITEM_TYPES[hearing.purpose][0];
  return {
    ...createOrderItem(type, `${hearing.id}-item-1`),
    text: richTextFromPlain(ITEM_TEXT[hearing.purpose]),
  };
}

function dictatedDraft(hearing: CourtHearing): OrderDraft {
  const item = dictatedItem(hearing);
  return {
    marks: attendanceOf(hearing),
    applications: decisionsOf(hearing),
    ...postingOf(hearing),
    items: [item],
    /* Disposals first, then the direction — the order a court takes them in, and the
       order the live screen produces them in. */
    body: appendRichText(disposalsOf(hearing), item.text),
  };
}

function rollOnlyDraft(hearing: CourtHearing): OrderDraft {
  return {
    ...EMPTY_ORDER_DRAFT,
    marks: attendanceOf(hearing),
    ...postingOf(hearing),
  };
}

function seed(
  ids: string[],
  build: (hearing: CourtHearing) => OrderDraft,
): [string, OrderDraft][] {
  return ids.map((id) => {
    const hearing = hearingById(id);
    /* A seed naming a listing the board does not have is a fixture that has drifted from
       the cause list, and it would show up as a row this court cannot open. */
    if (!hearing) throw new Error(`No listing ${id} on today's cause list`);
    return [id, build(hearing)] as [string, OrderDraft];
  });
}

export const ORDERS_IN_PROGRESS: Readonly<Record<string, OrderDraft>> =
  Object.freeze(
    Object.fromEntries([
      ...seed(DICTATED, dictatedDraft),
      ...seed(ROLL_ONLY, rollOnlyDraft),
    ]),
  );
