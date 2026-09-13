/**
 * The court's order-template catalogue.
 *
 * Transcribed from the **Order Template Catalogue** the owner supplied on 2026-09-13
 * (`docs/product/order-templates.md`, sourced from a spreadsheet dated 2026-09-07). This
 * replaces the seventeen English sentences this app wrote for itself in
 * `order-items.ts` — those were a placeholder with a note on them saying so, and §12 of
 * the brief carried "where do the standing words come from?" as its largest open
 * question. This file is the answer, and the words in it are the court's.
 *
 * **The template text is the Business of the Day line** — the short operative sentence
 * that reaches the cause list and the business record. The source is explicit that the
 * magistrate separately composes the longer order, and that the template "is a starting
 * point, not a constraint": it seeds the order and is then edited freely.
 *
 * **Variables are not decoration.** A locked variable is one the workflow behind the
 * order needs in order to function — the summons workflow cannot raise the right task
 * without knowing which party is summoned and which party takes steps — so it cannot be
 * removed from a template. An optional one enriches the record and nothing depends on
 * it. General variables (court, case, parties, dates) are available to every template
 * and are filled from case data without anyone typing them.
 *
 * Several templates use `[Party Type]` **twice, meaning different people** — the party
 * summoned and the party taking steps; the paying party and the receiving party. They
 * are positional, which is why `locked` is an ordered list with a `role` on each entry
 * rather than a set of names.
 */

export type OrderTemplateId =
  | "order-under-section-202"
  | "mandatory-submissions"
  | "accept-extension"
  | "reject-extension"
  | "referral-to-adr"
  | "scheduling-of-hearing"
  | "rescheduling-of-hearing"
  | "accept-application"
  | "reject-application"
  | "case-transfer"
  | "case-settlement"
  | "issue-of-summons"
  | "issue-of-warrants"
  | "withdrawal-of-case"
  | "issue-of-notice"
  | "acceptance-of-bail"
  | "cognizance"
  | "judgement"
  | "dismiss-case"
  | "bail"
  | "cost"
  | "witness-batta"
  | "issue-of-proclamation"
  | "issue-of-attachment"
  | "move-to-lp-register"
  | "move-out-of-lp-register"
  | "abate-case";

/**
 * When a type may be chosen from the catalogue the typist browses.
 *
 * The source's "In dropdown" column, made explicit. `context` types are never browsed —
 * they are reached from the thing that produces them, which is always an application.
 * The rest are gated on the state of the case, and the gate is shown rather than hidden:
 * a type the matter cannot take is listed with the reason beside it, because on a screen
 * where the wrong omission is a missed order, a silently shorter list is the worse
 * failure.
 */
export type OrderDropdownRule =
  | "always"
  | "context"
  | "on-file"
  | "cognizance-due"
  | "hearing-not-ongoing"
  | "case-is-st"
  | "case-is-lp";

export type OrderGroupId =
  | "process"
  | "accept-reject"
  | "progression"
  | "directives";

export type OrderVariable = {
  /** The token as it appears in the template, without brackets. */
  name: string;
  /** Which of a repeated token this one is — the source distinguishes them in prose. */
  role?: string;
};

export type OrderTemplate = {
  id: OrderTemplateId;
  /** The catalogue's own number, so a reader can find the row in the source. */
  number: number;
  label: string;
  group: OrderGroupId;
  dropdown: OrderDropdownRule;
  /** The BOTD line. Empty where the source gives no template. */
  botd: string;
  locked: OrderVariable[];
  optional: OrderVariable[];
  /** What the order sets in motion, where the source names it. */
  workflow?: string;
};

export const ORDER_TEMPLATES: OrderTemplate[] = [
  {
    id: "order-under-section-202",
    number: 1,
    label: "Order under section 202 CrPC",
    group: "directives",
    dropdown: "always",
    botd: "",
    locked: [],
    optional: [],
  },
  {
    id: "mandatory-submissions",
    number: 2,
    label: "Mandatory submissions and responses",
    group: "directives",
    dropdown: "always",
    botd: "It is directed that the [Party Type] files a [Document Type] for [Document Name] before the court by [Deadline for Submission]. Additionally, the [Party Type] must submit a response by [Deadline for Response].",
    locked: [
      { name: "Party Type" },
      { name: "Document Type" },
      { name: "Document Name" },
      { name: "Deadline for Submission" },
      { name: "Deadline for Response", role: "conditional" },
    ],
    optional: [],
    workflow: "Creates a submission task and a response task",
  },
  {
    id: "accept-extension",
    number: 3,
    label: "Accept extension for submission deadline",
    group: "accept-reject",
    dropdown: "context",
    botd: "Application [Application Number] for extension of deadline of submission of [Document Type] for [Document Name] is accepted. The [Party Type] is required to submit the same by [New Submission Date].",
    locked: [
      { name: "Application Number" },
      { name: "Document Type" },
      { name: "Document Name" },
      { name: "Party Type" },
      { name: "New Submission Date" },
    ],
    optional: [],
    workflow: "Updates the submission deadline",
  },
  {
    id: "reject-extension",
    number: 4,
    label: "Reject extension for submission deadline",
    group: "accept-reject",
    dropdown: "context",
    botd: "Application [Application Number] for extension of deadline of submission of [Document Type] for [Document Name] is rejected.",
    locked: [
      { name: "Application Number" },
      { name: "Document Type" },
      { name: "Document Name" },
    ],
    optional: [],
  },
  {
    id: "referral-to-adr",
    number: 5,
    label: "Referral of case to ADR",
    group: "directives",
    dropdown: "always",
    botd: "Both the Parties have voluntarily agreed to seek resolution through [Mode of ADR]. The parties are hereby referred to [Mode of ADR] to resolve their dispute by [Date of End of ADR].",
    locked: [],
    optional: [
      { name: "Mode of ADR", role: "mediation / arbitration / etc." },
      { name: "Date of End of ADR", role: "deadline" },
    ],
  },
  {
    id: "scheduling-of-hearing",
    number: 6,
    label: "Scheduling of hearing date",
    group: "progression",
    dropdown: "hearing-not-ongoing",
    botd: "Next hearing is scheduled on [Hearing Date] for [Hearing Purpose].",
    locked: [{ name: "Hearing Date" }, { name: "Hearing Purpose" }],
    optional: [],
    workflow: "Schedules the hearing",
  },
  {
    id: "rescheduling-of-hearing",
    number: 7,
    label: "Rescheduling of hearing date",
    group: "progression",
    dropdown: "context",
    botd: "Next hearing scheduled on [Original Hearing Date] for [Hearing Purpose] has been rescheduled to [New Hearing Date].",
    locked: [
      { name: "Original Hearing Date" },
      { name: "Hearing Purpose" },
      { name: "New Hearing Date" },
    ],
    optional: [],
    workflow: "Reschedules the hearing",
  },
  {
    id: "accept-application",
    number: 8,
    label: "Accept application",
    group: "accept-reject",
    dropdown: "context",
    botd: "Application [Application Number] for [Application Type] is accepted.",
    locked: [{ name: "Application Number" }, { name: "Application Type" }],
    optional: [],
    workflow: "The application type's own workflow, not this order's",
  },
  {
    id: "reject-application",
    number: 9,
    label: "Reject application",
    group: "accept-reject",
    dropdown: "context",
    botd: "Application [Application Number] for [Application Type] is rejected.",
    locked: [{ name: "Application Number" }, { name: "Application Type" }],
    optional: [],
  },
  {
    id: "case-transfer",
    number: 10,
    label: "Case transfer",
    group: "progression",
    dropdown: "always",
    botd: "The case is transferred to another court for further proceedings.",
    locked: [],
    optional: [],
  },
  {
    id: "case-settlement",
    number: 11,
    label: "Case settlement",
    group: "progression",
    dropdown: "always",
    botd: "The settlement records have been accepted by the court. Case closed.",
    locked: [],
    optional: [],
  },
  {
    id: "issue-of-summons",
    number: 12,
    label: "Issue of summons",
    group: "process",
    dropdown: "on-file",
    botd: "Issue summons to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps to issue summons.",
    locked: [
      { name: "Party Type", role: "person summoned" },
      { name: "Party Name" },
      { name: "Party Type", role: "party taking steps" },
    ],
    optional: [],
    workflow: "Triggers the summons workflow",
  },
  {
    id: "issue-of-warrants",
    number: 13,
    label: "Issue of warrants",
    group: "process",
    dropdown: "on-file",
    botd: "Issue warrant to the [Party Type] [Party Name]. The [Party Type] is directed to take steps to issue warrant.",
    locked: [
      { name: "Party Type" },
      { name: "Party Name" },
      { name: "Party Type", role: "party taking steps" },
    ],
    optional: [],
    workflow: "Triggers the warrant workflow",
  },
  {
    id: "withdrawal-of-case",
    number: 14,
    label: "Withdrawal of case",
    group: "progression",
    dropdown: "always",
    botd: "As per application [Application Number] complainant has sought to withdraw the complaint. Permission under Section 280 of the BNSS is granted and the Accused is acquitted.",
    locked: [{ name: "Application Number" }],
    optional: [],
  },
  {
    id: "issue-of-notice",
    number: 15,
    label: "Issue of notice",
    group: "process",
    dropdown: "always",
    botd: "Issue [Notice Type] notice to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps.",
    locked: [
      { name: "Notice Type", role: "type of notice" },
      { name: "Party Type" },
      { name: "Party Name" },
      { name: "Party Type", role: "party taking steps" },
    ],
    optional: [],
    workflow: "Triggers the notice workflow",
  },
  {
    id: "acceptance-of-bail",
    number: 16,
    label: "Acceptance of bail",
    group: "accept-reject",
    dropdown: "context",
    botd: "Application [Application Number] is accepted.",
    locked: [{ name: "Application Number" }],
    optional: [],
    workflow: "Optionally triggers the bail bond submission workflow",
  },
  {
    id: "cognizance",
    number: 17,
    label: "Cognizance",
    group: "progression",
    dropdown: "cognizance-due",
    botd: "Considering the materials produced before the Court, I am prima facie satisfied that the offence punishable under S. 138 of NI Act is made out. Accordingly cognizance of the offence is taken and the case is taken on file.",
    locked: [],
    optional: [],
  },
  {
    id: "judgement",
    number: 18,
    label: "Judgement",
    group: "progression",
    dropdown: "always",
    botd: "",
    locked: [],
    optional: [],
  },
  {
    id: "dismiss-case",
    number: 19,
    label: "Dismiss case",
    group: "progression",
    dropdown: "cognizance-due",
    botd: "The case is dismissed.",
    locked: [],
    optional: [],
  },
  {
    id: "bail",
    number: 20,
    label: "Bail",
    group: "directives",
    dropdown: "on-file",
    botd: "Accused is released on bail. Particulars of offences u/s.138 of NI Act were read over and explained to the Accused to which he pleaded [Plea] and claimed to be tried.",
    locked: [],
    optional: [{ name: "Plea", role: "guilty / not guilty" }],
    workflow: "Triggers the bail workflow",
  },
  {
    id: "cost",
    number: 21,
    label: "Cost",
    group: "directives",
    dropdown: "always",
    botd: "The [Party Type] is directed to pay [Amount] to the [Party Type] as costs by [Date].",
    locked: [
      { name: "Party Type", role: "paying party" },
      { name: "Amount", role: "in rupees" },
      { name: "Party Type", role: "receiving party" },
      { name: "Date", role: "deadline" },
    ],
    optional: [],
    workflow: "Creates a payment task",
  },
  {
    id: "witness-batta",
    number: 22,
    label: "Witness batta",
    group: "directives",
    dropdown: "always",
    botd: "The [Party Type] is directed to pay [Amount] to the [Party Type] as witness batta by [Date].",
    locked: [
      { name: "Party Type", role: "paying party" },
      { name: "Amount", role: "in rupees" },
      { name: "Party Type", role: "receiving party" },
      { name: "Date", role: "deadline" },
    ],
    optional: [],
    workflow: "Creates a payment task",
  },
  {
    id: "issue-of-proclamation",
    number: 23,
    label: "Issue of proclamation",
    group: "process",
    dropdown: "on-file",
    botd: "Issue proclamation to the [Party Type] [Party Name]. Complainant is directed to make the appropriate payments and take steps.",
    locked: [{ name: "Party Type" }, { name: "Party Name" }],
    optional: [],
    workflow: "Triggers the proclamation workflow",
  },
  {
    id: "issue-of-attachment",
    number: 24,
    label: "Issue of attachment",
    group: "process",
    dropdown: "on-file",
    botd: "Issue attachment against the [Party Type] [Party Name]. Complainant is directed to make the appropriate payments and take steps.",
    locked: [{ name: "Party Type" }, { name: "Party Name" }],
    optional: [],
    workflow: "Triggers the attachment workflow",
  },
  {
    id: "move-to-lp-register",
    number: 25,
    label: "Moving case to long pending register",
    group: "progression",
    dropdown: "case-is-st",
    botd: "As per sanction given by Honourable CJM the case is moved to the Long Pending Register and is marked as LP.",
    locked: [],
    optional: [],
  },
  {
    id: "move-out-of-lp-register",
    number: 26,
    label: "Moving case out of long pending register",
    group: "progression",
    dropdown: "case-is-lp",
    botd: "The case is moved out of the Long Pending Register and is to be considered and renumbered as a ST case.",
    locked: [],
    optional: [],
  },
  {
    id: "abate-case",
    number: 27,
    label: "Abate case",
    group: "progression",
    dropdown: "always",
    botd: "The case is abated following the death of the Accused party.",
    locked: [],
    optional: [],
  },
];

/**
 * The browsing groups.
 *
 * **Provisional.** The source names "grouping for the order-issuance screen" as one of
 * two things it still has to add, so these four are the owner's reference screen's own
 * headings with the catalogue's twenty-seven sorted into them by meaning. The reference
 * shows counts of 5 / 7 / 10 / 6, which total twenty-eight — one more than the
 * catalogue — so the reference and the source do not describe quite the same list, and
 * only **Process orders** lands on its count exactly. When product supplies the real
 * grouping it supersedes this.
 */
export const ORDER_GROUPS: { id: OrderGroupId; label: string }[] = [
  { id: "process", label: "Process orders" },
  { id: "accept-reject", label: "Accept / reject" },
  { id: "progression", label: "Case progression" },
  { id: "directives", label: "Directives" },
];

export function orderTemplate(id: OrderTemplateId): OrderTemplate {
  const found = ORDER_TEMPLATES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown order template: ${id}`);
  return found;
}

/** The state of the matter that the dropdown rules are read against. */
export type OrderCatalogueContext = {
  /** Cognizance has not been taken yet, so the case is not on file. */
  cognizanceDue: boolean;
  /** The case stands on the Long Pending Register. */
  longPending: boolean;
  /** The bench is sitting on this matter right now. */
  hearingOngoing: boolean;
};

/**
 * Why a type cannot be chosen on this matter, or `null` when it can.
 *
 * A reason, not a boolean, because the list shows what it cannot offer. "Not available"
 * beside a greyed row teaches a typist to distrust the catalogue; "Only before
 * cognizance" tells them the case has moved past it.
 */
export function unavailableReason(
  template: OrderTemplate,
  context: OrderCatalogueContext,
): string | null {
  switch (template.dropdown) {
    case "always":
      return null;
    case "context":
      return "Comes from an application";
    case "on-file":
      return context.cognizanceDue ? "Only once the case is on file" : null;
    case "cognizance-due":
      return context.cognizanceDue ? null : "Only before cognizance";
    case "hearing-not-ongoing":
      return context.hearingOngoing
        ? "Set the next date under Next hearing"
        : null;
    case "case-is-st":
      return context.longPending ? "The case is already long pending" : null;
    case "case-is-lp":
      return context.longPending ? null : "Only for a long-pending case";
  }
}

/** Everything the typist may browse — every type the source does not mark context-only. */
export function browsableTemplates(): OrderTemplate[] {
  return ORDER_TEMPLATES.filter((entry) => entry.dropdown !== "context");
}

/**
 * Available at every hearing, whatever it was listed for.
 *
 * The source lists these separately and does not repeat them against any purpose.
 */
export const GENERIC_TEMPLATE_IDS: OrderTemplateId[] = [
  "scheduling-of-hearing",
  "cost",
  "mandatory-submissions",
  "withdrawal-of-case",
  "case-transfer",
  "move-to-lp-register",
  "move-out-of-lp-register",
  "abate-case",
];

/**
 * What this hearing is likely to produce, by what it was listed for.
 *
 * The source's hearing-purpose table, restricted to the eleven purposes this app knows.
 * It **suggests and never restricts**: a bench passes unusual orders, and a shortcut row
 * that quietly hid the rest would be a wall rather than a shortcut.
 */
export const LIKELY_BY_PURPOSE: Record<string, OrderTemplateId[]> = {
  "delay-condonation": ["dismiss-case", "order-under-section-202"],
  admission: [
    "cognizance",
    "dismiss-case",
    "issue-of-summons",
    "order-under-section-202",
  ],
  cognizance: [
    "cognizance",
    "dismiss-case",
    "issue-of-summons",
    "order-under-section-202",
  ],
  appearance: [
    "issue-of-summons",
    "issue-of-warrants",
    "bail",
    "issue-of-notice",
  ],
  bail: ["bail", "issue-of-warrants"],
  plea: ["bail", "referral-to-adr", "issue-of-notice"],
  "evidence-of-complainant": ["witness-batta", "issue-of-summons"],
  "examination-of-accused-351": ["issue-of-warrants"],
  arguments: ["referral-to-adr", "case-settlement"],
  judgement: ["judgement"],
  "for-reports": ["referral-to-adr"],
};

export function likelyTemplatesFor(
  purpose: string,
  context: OrderCatalogueContext,
): OrderTemplate[] {
  return (LIKELY_BY_PURPOSE[purpose] ?? [])
    .map((id) => orderTemplate(id))
    .filter((entry) => unavailableReason(entry, context) === null);
}

/** The general variables, which come from case and court data and are never typed. */
export type OrderTemplateFacts = {
  court: string;
  caseNumber: string;
  matter: string;
  complainant: string;
  accused: string;
  today: string;
};

const GENERAL: { token: string; from: keyof OrderTemplateFacts }[] = [
  { token: "[Court Name]", from: "court" },
  { token: "[Case Name]", from: "matter" },
  { token: "[Case Number]", from: "caseNumber" },
  { token: "[Current Date]", from: "today" },
  { token: "[Complainant Name]", from: "complainant" },
  { token: "[Accused Name]", from: "accused" },
];

/**
 * The auto-fill pass: general variables resolved, everything else left standing.
 *
 * A variable the system cannot resolve stays in the text as its own bracketed token, and
 * that is deliberate. It is a hole the reader can see, in the place the value will go —
 * where a blank, a guess, or a silently dropped clause would each produce an order that
 * reads as finished and is not.
 */
export function fillGeneralVariables(
  botd: string,
  facts: OrderTemplateFacts,
): string {
  return GENERAL.reduce(
    (text, entry) => text.split(entry.token).join(facts[entry.from]),
    botd,
  );
}

/** The bracketed tokens still standing in a filled line, in the order they appear. */
export function openSlots(text: string): string[] {
  return text.match(/\[[^\]]+\]/g) ?? [];
}
