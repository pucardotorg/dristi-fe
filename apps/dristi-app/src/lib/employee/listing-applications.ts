/**
 * The applications waiting on a matter the bench has called — as data.
 *
 * An interlocutory application is answered *in* the hearing it is pending on: the
 * accused asks for bail, counsel asks for an adjournment, and the bench disposes of
 * both from the bench before it dictates the rest of the item. Until now the court side
 * could only meet those in the review queues (`other-applications.ts`), which is where
 * a bench works through paper *between* sittings — never while the matter is standing
 * in front of it.
 *
 * So this module is the same body of work, indexed the other way round: by listing
 * rather than by queue. The vocabulary is not restated — the heads of application, their
 * labels, what each one asks for and the prayer it ends on all come from
 * `other-applications.ts`, because an application for bail is asking for the same thing
 * whichever screen the bench meets it on.
 *
 * **There is no backend.** `LISTING_APPLICATIONS` is demo data keyed to `CAUSE_LIST`,
 * shaped so the composer has to survive the three cases that matter: a listing with two
 * applications pending (the reference's own), a listing with one, and — for most of the
 * board — a listing with none at all, which is the ordinary case and the one the screen
 * must not clutter for.
 *
 * **Answering one performs no judicial act.** Allowing or dismissing an application here
 * writes a sentence into the draft order and nothing else. No bail is granted, no
 * hearing moves, nothing is filed, signed, or notified — the same bargain
 * `order-draft.ts` and `hearing-session.ts` already make.
 */

import type { CourtApplicationDocument } from "@/components/employee/application-review-dialog";

import { CURRENT_STAFF } from "./content";
import {
  applicationFiler,
  causeTitle,
  counselFor,
  courtCaseStageLabel,
  formatCourtDay,
  partySideLabel,
  type CounselSide,
  type CourtHearing,
} from "./hearings";
import {
  applicationAsk,
  applicationPrayer,
  otherApplicationTypeLabel,
  type OtherApplicationType,
} from "./other-applications";

/**
 * How an application leaves the bench.
 *
 * The court's own two words, not the queue's. A review queue's buttons say Accept and
 * Reject because a clerk is triaging paper; an order says the application "is allowed"
 * or "is dismissed", because that is what the document has to read. The screen keeps
 * the reference's Accept / Reject on the controls and the order prints these — the same
 * split `applicationFiler` already makes between what a column shows and what a
 * sentence says.
 */
export type ListingApplicationDecision = "allowed" | "dismissed";

export type ListingApplication = {
  id: string;
  /**
   * The court's serial on the application itself, which is *not* the case number: an
   * application carries a `CMP/…` number of its own even after the complaint it sits in
   * has been numbered `ST/…`. Both appear on the composer, which is why neither can
   * borrow the other's.
   */
  number: string;
  type: OtherApplicationType;
  /** The side that filed it — either may apply, whatever the case is about. */
  filedFor: CounselSide;
  /** ISO day the application reached the court. */
  filedOn: string;
  /** Why the application is made, in the filer's words. */
  reason: string;
};

/** What is pending on this listing. Most listings have nothing. */
export function applicationsForListing(hearingId: string): ListingApplication[] {
  return LISTING_APPLICATIONS[hearingId] ?? [];
}

/** The head the application was filed under — "Bail". */
export function listingApplicationLabel(
  /* The head only. Widened from `ListingApplication` so the order composer can name the
     application a suggestion arrived from without that module holding a whole one. */
  application: Pick<ListingApplication, "type">,
): string {
  return otherApplicationTypeLabel(application.type);
}

/** Who put it in — counsel on record for that side, or the party without one. */
export function listingApplicationFiler(
  hearing: CourtHearing,
  application: ListingApplication,
): string {
  return applicationFiler(hearing, application.filedFor);
}

/**
 * The application as a court-form document — the paper the bench reads before it
 * answers.
 *
 * The same `CourtApplicationDocument` the three review queues compose, so the bail
 * application a magistrate opens mid-sitting is the same paper it would have been in
 * the queue. Imported as a type only: this module is read by a node test, and a value
 * import would drag a client component into it — the convention `order-draft.ts` set.
 */
export function buildListingApplicationDocument(
  hearing: CourtHearing,
  application: ListingApplication,
): CourtApplicationDocument {
  const side = partySideLabel(application.filedFor);
  const facts: { term: string; value: string }[] = [
    { term: "Complainant", value: hearing.parties.complainant },
    { term: "Accused", value: hearing.parties.accused },
  ];
  const complainantCounsel = counselFor(hearing, "complainant").map(
    (counsel) => counsel.name,
  );
  if (complainantCounsel.length) {
    facts.push({
      term: "Complainant counsel",
      value: complainantCounsel.join(", "),
    });
  }
  const accusedCounsel = counselFor(hearing, "accused").map(
    (counsel) => counsel.name,
  );
  if (accusedCounsel.length) {
    facts.push({ term: "Accused counsel", value: accusedCounsel.join(", ") });
  }
  facts.push(
    { term: "Stage", value: courtCaseStageLabel(hearing.stage) },
    {
      term: "Application type",
      value: otherApplicationTypeLabel(application.type),
    },
    {
      term: "Offence",
      value: "S. 138 of the Negotiable Instruments Act, 1881",
    },
  );

  return {
    court: `Before the ${CURRENT_STAFF.court}`,
    caseNumber: application.number,
    matter: causeTitle(hearing),
    title: otherApplicationTypeLabel(application.type),
    filedFor: `the ${side}`,
    facts,
    paragraphs: [
      `This matter is before this court at the stage of ${courtCaseStageLabel(
        hearing.stage,
      ).toLowerCase()}, in case no. ${hearing.caseNumber}.`,
      `By this application the ${side} seeks ${applicationAsk(application.type)}.`,
      `The application is made for the following reason: ${application.reason}`,
    ],
    prayer: applicationPrayer(application.type),
    dated: formatCourtDay(application.filedOn),
  };
}

/**
 * How the order records the disposal — one sentence, the way an order writes it.
 *
 * Built from the ask rather than the head, because the heads do not read as prose: the
 * label for an adjournment is "Application to reschedule/adjournment", and "the
 * application for application to reschedule/adjournment" is not a sentence anybody
 * would sign. The ask is already a noun phrase for exactly this reason.
 */
export function listingApplicationSentence(
  hearing: CourtHearing,
  application: ListingApplication,
  decision: ListingApplicationDecision,
): string {
  const side = partySideLabel(application.filedFor);
  return `The application of the ${side} for ${applicationAsk(
    application.type,
  )} (${application.number}) is ${decision}.`;
}

/**
 * What is pending on which listing.
 *
 * Deliberately sparse. Most matters called on a given day have no interlocutory
 * application waiting on them, and a screen tuned to the crowded case would carry an
 * empty amber block through twenty-one of twenty-three items. Item 1 carries the
 * reference's pair — a bail application and an adjournment, filed by opposite sides —
 * so the strip's crowded state is the first thing anyone opening the composer meets.
 *
 * Numbers follow the court-side convention the rest of the area uses: `CMP/…` on the
 * application, whatever the complaint it sits in is numbered. They do not collide with
 * the serials in `OTHER_APPLICATIONS_QUEUE` — a queue row and a listing row are not the
 * same application wearing two numbers.
 */
const LISTING_APPLICATIONS: Partial<Record<string, ListingApplication[]>> = {
  "h-241": [
    {
      id: "la-241-1",
      number: "CMP/312/2026",
      type: "bail",
      filedFor: "accused",
      filedOn: "2026-08-28",
      reason:
        "The accused has appeared on every posting date and undertakes to continue to do so. Custody would cost the accused the employment on which the family depends.",
    },
    {
      id: "la-241-2",
      number: "CMP/318/2026",
      type: "reschedule-adjournment",
      filedFor: "complainant",
      filedOn: "2026-09-01",
      reason:
        "PW-2 is under treatment and has been advised rest for three weeks. The complainant asks that the balance of evidence be taken on a later date.",
    },
  ],
  "h-245": [
    {
      id: "la-245-1",
      number: "CMP/305/2026",
      type: "production-of-documents",
      filedFor: "accused",
      filedOn: "2026-08-24",
      reason:
        "The bank's statement of account for the period of the cheque has not been produced, and the accused cannot meet the complainant's case without it.",
    },
  ],
  "h-248": [
    {
      id: "la-248-1",
      number: "CMP/327/2026",
      type: "adding-witnesses",
      filedFor: "complainant",
      filedOn: "2026-09-02",
      reason:
        "The manager who handled the return memo has since been transferred, and the officer who now holds that charge is the person who can speak to it.",
    },
  ],
  /* A withdrawal of the complaint, and the one listing that exercises the auto-fill pass
     end to end (D51). §138 complaints are withdrawn often — the cheque gets paid and the
     complainant no longer wants the prosecution — and `withdrawal-of-case` is the only
     order in the dropdown whose template takes `[Application Number]` as a locked
     variable. Without an application of this head on the board there was no reachable
     path on which an order could open on a filled number, so the pass was correct and
     invisible. Added on a listing that had nothing pending, so no other screen's counts
     move. */
  "h-258": [
    {
      id: "la-258-1",
      number: "CMP/341/2026",
      type: "case-withdrawal",
      filedFor: "complainant",
      filedOn: "2026-09-04",
      reason:
        "The cheque amount and the costs have been paid in full since the last posting, and the complainant does not wish to prosecute the complaint further.",
    },
  ],
  "h-253": [
    {
      id: "la-253-1",
      number: "CMP/298/2026",
      type: "settlement",
      filedFor: "complainant",
      filedOn: "2026-08-19",
      reason:
        "The parties have arrived at terms and ask that the settlement be recorded before the examination of the accused is taken further.",
    },
  ],
};
