/**
 * The order a cognizance act draws up, before the judge has touched it.
 *
 * The PRD's bargain (§6): an act does not *perform* anything on its own. It opens the
 * order screen with its items already loaded as one composite order, and the judge edits
 * and issues it. So the act's whole meaning is the list below, and each item's sentence
 * is the register's own catalogue entry (`order-templates.ts`) with the facts of this
 * complaint filled into it — never a sentence written here.
 *
 * Three compositions, one per act:
 *
 * | Act | Items, in order |
 * |---|---|
 * | Take cognizance | acceptance of the delay application *(only when late)* · cognizance · issue of summons · scheduling of hearing |
 * | Issue notice | issue of notice · scheduling of hearing |
 * | Dismiss case | dismiss case |
 *
 * **Two of those are automatic and the judge does not add them.** Summons follows
 * cognizance by law, and on a late complaint the acceptance of the condonation
 * application comes *ahead* of the cognizance item, so the delay is disposed of in the
 * same order that takes cognizance rather than in a second one nobody remembers to pass.
 * Its wording is the generic *Accept application* template, which is what the PRD names.
 *
 * **Both positive acts schedule a hearing and neither may decline to.** A dismissal
 * carries no scheduling item at all: the complaint ends, so there is no next date.
 */

import { CURRENT_STAFF, PRESIDING_MAGISTRATE } from "./content";
import {
  delayDays,
  hasDelay,
  type CognizanceAct,
  type CognizanceCase,
} from "./cognizance";
import {
  causeTitle,
  courtHearingPurposeLabel,
  formatOrderDate,
  type CourtHearingPurposeId,
} from "./hearings";
import {
  fillGeneralVariables,
  openSlots,
  orderTemplate,
  type OrderTemplateFacts,
  type OrderTemplateId,
} from "./order-templates";

/* ──────────────────────────── the delay application ─────────────────────────── */

/**
 * How the condonation application is named in the order that accepts it.
 *
 * The head alone, lower-cased, because the template supplies the rest of the sentence:
 * *"Application [Application Number] for [Application Type] is accepted."* A type that
 * read "Application for condonation of delay" would make the order say *Application
 * CMP/1629/2025 for Application for condonation of delay* — the word twice, which is
 * how the first build of this read.
 *
 * It has no row of its own anywhere: `OtherApplicationType` does not carry condonation
 * of delay, so a late complaint's application cannot be represented as a
 * `ListingApplication` today. The head is written out here and the number is derived
 * from the filing number the way `cnrFor` derives a CNR — fixture arithmetic, stable as
 * the fixture sits, and marked as the gap it is rather than hidden behind a guess.
 */
export const DELAY_APPLICATION_TYPE = "condonation of delay";

export function delayApplicationNumber(matter: CognizanceCase): string {
  const serial = matter.filingNumber.replace(/\D/g, "").slice(2, 6);
  return `CMP/${serial}/${matter.filingNumber.slice(-4)}`;
}

/* ─────────────────────────────────── the facts ──────────────────────────────── */

/**
 * The values the catalogue's tokens are filled from, for a complaint at cognizance.
 *
 * The sibling of `orderTemplateFacts`, which builds the same shape from a hearing and
 * its draft. Two of them rather than one function taking both, because the facts differ
 * in kind and not only in source: there is no sitting this order is passed at, so
 * `[Current Hearing Date]` is today — the day the order is drawn — and nothing else.
 */
export function cognizanceTemplateFacts(
  matter: CognizanceCase,
  today: string,
  next?: { date?: string; purpose?: string },
): OrderTemplateFacts {
  return {
    court: CURRENT_STAFF.court,
    caseName: causeTitle(matter),
    caseNumber: matter.caseNumber,
    currentDate: formatOrderDate(today),
    judgeName: PRESIDING_MAGISTRATE.name,
    judgeDesignation: PRESIDING_MAGISTRATE.designation,
    complainant: matter.parties.complainant,
    accused: matter.parties.accused,
    currentHearingDate: formatOrderDate(today),
    applicationNumber: hasDelay(matter)
      ? delayApplicationNumber(matter)
      : undefined,
    applicationType: hasDelay(matter) ? DELAY_APPLICATION_TYPE : undefined,
    hearingPurpose: next?.purpose,
    hearingDate: next?.date ? formatOrderDate(next.date) : undefined,
  };
}

/* ─────────────────────────────────── the items ──────────────────────────────── */

/**
 * One item of the composite, as the composer holds it while the judge works on it.
 *
 * `text` starts as the catalogue's sentence with this complaint's facts filled in and
 * becomes whatever the judge makes of it. A token the system could not resolve is left
 * standing in brackets rather than blanked — a hole a reader can see, in the place the
 * value goes (`order-templates.ts`).
 */
export type CognizanceOrderItem = {
  id: string;
  template: OrderTemplateId;
  label: string;
  text: string;
  /**
   * Whether the item may be taken out.
   *
   * The act's own item cannot be: an order headed *Take cognizance* with the cognizance
   * item removed is an order that does not take cognizance, and the way to not take it
   * is to leave without passing this. Everything else the act loaded is the judge's.
   */
  fixed: boolean;
  /** The item that carries the next hearing date, and the only one that does. */
  schedules?: boolean;
};

/** Which act each composition is headed by — the item that cannot be removed. */
const ACT_TEMPLATE: Record<CognizanceAct, OrderTemplateId> = {
  cognizance: "cognizance",
  notice: "issue-of-notice",
  dismiss: "dismiss-case",
};

/** The templates each act loads, in the order the PRD lists them. */
function templatesFor(
  matter: CognizanceCase,
  act: CognizanceAct,
): OrderTemplateId[] {
  if (act === "dismiss") return ["dismiss-case"];
  if (act === "notice") return ["issue-of-notice", "scheduling-of-hearing"];
  return [
    /* Ahead of cognizance, so the delay is disposed of before the act that depends on
       it having been. Only on a late complaint — there is no application otherwise. */
    ...(hasDelay(matter) ? (["accept-application"] as OrderTemplateId[]) : []),
    "cognizance",
    "issue-of-summons",
    "scheduling-of-hearing",
  ];
}

/**
 * The party tokens, which at cognizance are not a choice anybody makes.
 *
 * `fillGeneralVariables` resolves the tokens that mean the same thing on every order —
 * the court, the cause, the judge. `[Party Type]` and `[Party Name]` are *locked*
 * variables: on a hearing the composer collects them, because who is being summoned at
 * the fourth hearing of a case is a real question. At cognizance it is not. Summons and
 * notice both go to the accused, and it is the complainant who pays and takes the steps
 * — that is what taking cognizance of a §138 complaint does. Leaving three brackets
 * standing in a sentence the system could finish would make every cognizance order open
 * with blanks the judge has to fill by rote.
 *
 * `[Notice Type]` is the court's own, and it is the notice this act issues: a DCA
 * notice, the one the process line already writes (`sign-process.ts`) — the accused
 * being heard on the condonation application before the delay is decided.
 *
 * Both tokens repeat in their template with different roles, so they are filled in
 * order of appearance rather than by name: the first `[Party Type]` is the person
 * summoned, the second is the party taking steps.
 */
function fillPartyVariables(
  text: string,
  matter: CognizanceCase,
  template: OrderTemplateId,
): string {
  if (template !== "issue-of-summons" && template !== "issue-of-notice") {
    return text;
  }
  const roles = ["accused", matter.parties.accused, "complainant"];
  let at = 0;
  return text
    .replace(/\[Notice Type\]/g, "DCA")
    .replace(/\[Party Type\]|\[Party Name\]/g, () => roles[at++] ?? "");
}

/**
 * The composite one act draws up, ready for the judge to edit.
 *
 * Ids are the template's own, so re-composing the same act twice gives the same ids and
 * an edit survives a re-render. No template appears twice in any composition, so there
 * is nothing to disambiguate with a counter.
 */
export function cognizanceComposite(
  matter: CognizanceCase,
  act: CognizanceAct,
  facts: OrderTemplateFacts,
): CognizanceOrderItem[] {
  /* The purpose is the act's own and is set before the judge sees the screen, so the
     composition carries it from the start. Only the date is genuinely open. */
  return templatesFor(matter, act).map((id) => ({
    id,
    template: id,
    label: orderTemplate(id).label,
    text: composedText(id, matter, facts),
    fixed: id === ACT_TEMPLATE[act],
    schedules: id === "scheduling-of-hearing" || undefined,
  }));
}

/** One item's sentence: the catalogue's line, with everything cognizance knows in it. */
export function composedText(
  template: OrderTemplateId,
  matter: CognizanceCase,
  facts: OrderTemplateFacts,
): string {
  return fillPartyVariables(
    fillGeneralVariables(orderTemplate(template).botd, facts),
    matter,
    template,
  );
}

/** The blanks still standing in one item's sentence, for the hint under it. */
export function itemOpenSlots(item: CognizanceOrderItem): string[] {
  return openSlots(item.text);
}

/**
 * What stands between this order and the signing queue.
 *
 * Returned as sentences rather than a boolean, because "you cannot send this yet" is
 * only useful with the reason attached — and there may be two at once. An empty list is
 * an order ready to go.
 *
 * `today` is passed in rather than read from the clock: every date on this side of the
 * app is the court's day, and a module that asked `Date.now()` itself would be the one
 * place that disagreed with it.
 */
export function cognizanceOrderBlockers(
  items: CognizanceOrderItem[],
  nextDate: string | null,
  today: string,
): string[] {
  const blockers: string[] = [];
  const scheduling = items.find((item) => item.schedules);
  if (scheduling && !nextDate) {
    blockers.push("The next hearing needs a date.");
  }
  /* A date already gone is caught here rather than barred in the picker, because the
     DS `DatePicker` takes no earliest date — it mounts a bare `Calendar` with no
     `disabled` matcher. Composing `Popover` + `Calendar` ourselves would be a second
     copy of a primitive, which is the one thing we do not do, so the rule lives beside
     the other thing that stands between this order and the queue. Raised with the DS. */
  if (scheduling && nextDate && nextDate <= today) {
    blockers.push("The next hearing must be a later date.");
  }
  /* The scheduling item is never scanned for blanks. Its only tokens are the date and
     the purpose, and both are owned by the fields under it — the two rules above are
     what stands over that sentence. Counting its date a second time would tell the
     bench two things are wrong when one is, and fixing the one would silently fix the
     other. */
  const blanks = items.filter(
    (item) => !item.schedules && itemOpenSlots(item).length > 0,
  );
  if (blanks.length > 0) {
    blockers.push(
      blanks.length === 1
        ? `${blanks[0].label} still has a blank to fill.`
        : `${blanks.length} items still have blanks to fill.`,
    );
  }
  return blockers;
}

/**
 * What the next hearing is for, before the judge changes it.
 *
 * Cognizance summons the accused, so the next thing the court needs is their
 * appearance. A notice is issued so the accused can be heard on the delay, and the
 * hearing it schedules is the one where that happens.
 */
export function defaultNextPurposeFor(
  act: CognizanceAct,
): CourtHearingPurposeId | null {
  if (act === "dismiss") return null;
  return act === "notice" ? "delay-condonation" : "appearance";
}

/** The default purpose as the order words it — the same value the field is set to. */
export function defaultNextPurposeLabel(act: CognizanceAct): string | undefined {
  const purpose = defaultNextPurposeFor(act);
  return purpose ? courtHearingPurposeLabel(purpose) : undefined;
}

/**
 * The line that says what this act does to the complaint, under the title.
 *
 * Not the chip's words again: the state is on the chip, and this is what follows from
 * it — the split the file's own act dialog already makes.
 */
export function cognizanceOrderOutcome(
  matter: CognizanceCase,
  act: CognizanceAct,
): string {
  if (act === "dismiss") return "This complaint ends here.";
  if (act === "notice") {
    return "The accused is heard on the delay before the court decides it.";
  }
  const late = delayDays(matter);
  return late === null
    ? "The case is taken on file and proceeds to summons."
    : "The delay is condoned, the case is taken on file, and it proceeds to summons.";
}
