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
  | "mandatory-submissions"
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
  | "issue-of-miscellaneous-process"
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
  | "filings"
  | "disposal"
  | "case-management"
  | "process"
  | "misc"
  | "accept-reject";

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
    id: "mandatory-submissions",
    number: 2,
    label: "Mandatory submissions and responses",
    group: "filings",
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
    id: "referral-to-adr",
    number: 5,
    label: "Referral of case to ADR",
    group: "disposal",
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
    group: "case-management",
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
    group: "case-management",
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
    group: "case-management",
    dropdown: "always",
    botd: "The case is transferred to another court for further proceedings.",
    locked: [],
    optional: [],
  },
  {
    id: "case-settlement",
    number: 11,
    label: "Case settlement",
    group: "disposal",
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
    group: "disposal",
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
    group: "case-management",
    dropdown: "cognizance-due",
    botd: "Considering the materials produced before the Court, I am prima facie satisfied that the offence punishable under S. 138 of NI Act is made out. Accordingly cognizance of the offence is taken and the case is taken on file.",
    locked: [],
    optional: [],
  },
  {
    id: "judgement",
    number: 18,
    label: "Judgement",
    group: "disposal",
    dropdown: "always",
    botd: "",
    locked: [],
    optional: [],
  },
  {
    id: "dismiss-case",
    number: 19,
    label: "Dismiss case",
    group: "case-management",
    dropdown: "cognizance-due",
    botd: "The case is dismissed.",
    locked: [],
    optional: [],
  },
  {
    id: "bail",
    number: 20,
    label: "Bail",
    group: "filings",
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
    group: "misc",
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
    group: "misc",
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
  /**
   * Row 25 of `order-template-catalogue.md`, missing from this file until 2026-09-25 —
   * the source has words for it, but nobody had wired it in. Numbered 28, past the
   * original twenty-seven, because that numbering is the older spreadsheet's own order
   * and this type never had a place in it; the doc's row number is 25.
   */
  {
    id: "issue-of-miscellaneous-process",
    number: 28,
    label: "Issue of miscellaneous process",
    group: "process",
    dropdown: "on-file",
    botd: "Issue [Process Type] to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps.",
    locked: [
      { name: "Process Type" },
      { name: "Party Type" },
      { name: "Party Name" },
      { name: "Party Type", role: "party taking steps" },
    ],
    optional: [],
    workflow: "Triggers the miscellaneous process workflow",
  },
  {
    id: "move-to-lp-register",
    number: 25,
    label: "Moving case to long pending register",
    group: "case-management",
    dropdown: "case-is-st",
    botd: "As per sanction given by Honourable CJM the case is moved to the Long Pending Register and is marked as LP.",
    locked: [],
    optional: [],
  },
  {
    id: "move-out-of-lp-register",
    number: 26,
    label: "Moving case out of long pending register",
    group: "case-management",
    dropdown: "case-is-lp",
    botd: "The case is moved out of the Long Pending Register and is to be considered and renumbered as a ST case.",
    locked: [],
    optional: [],
  },
  {
    id: "abate-case",
    number: 27,
    label: "Abate case",
    group: "disposal",
    dropdown: "always",
    botd: "The case is abated following the death of the Accused party.",
    locked: [],
    optional: [],
  },
];

/**
 * The browsing groups.
 *
 * The owner's own grouping (2026-09-25), replacing the four provisional headings this
 * file used before product supplied the real one. These are the catalogue's own
 * `Category` column, plus **Accept / Reject** — a residual group this screen keeps for
 * the handful of types the source marks *not in dropdown* (see `unavailableReason`'s
 * `"context"` case): the source says a contextual type has no category because it is
 * never browsed, but this screen still lists it, disabled, so the catalogue does not go
 * silent where a typist might expect the type to be.
 *
 * **Cognizance and Judgment folded in the same day.** The first cut of this grouping
 * gave Cognizance its own heading (Cognizance, Dismiss case) and Judgment another
 * (Judgement alone) — the owner's correction merges them: Cognizance and Dismiss case
 * now sit under **Case management**, and Judgement under **Disposal**, an order that
 * ends the case like the rest of that category's rows.
 */
export const ORDER_GROUPS: { id: OrderGroupId; label: string }[] = [
  { id: "filings", label: "Filings" },
  { id: "disposal", label: "Disposal" },
  { id: "case-management", label: "Case management" },
  { id: "process", label: "Process" },
  { id: "misc", label: "Miscellaneous" },
  { id: "accept-reject", label: "Accept / Reject" },
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
 * Whether the source gives this type any words at all.
 *
 * One of the twenty-five carries no BOTD line — **Judgement** — and the source says what
 * that means rather than leaving it as a hole: "If an order type has **no template** ...
 * the judge writes the order text from scratch — or a dedicated screen handles it (e.g.
 * Judgement)." It is still the court's own type and still choosable. What it is not is
 * *worded*.
 *
 * (Order under section 202 CrPC was the other wordless type, and also carried no BOTD;
 * removed 2026-09-25 along with the two extension orders, all three marked "Not in V1"
 * in `order-template-catalogue.md`.)
 *
 * Read off the text rather than kept as a fixed id, so a template the court later fills
 * in stops being a write-it-yourself order without anyone remembering to move it.
 */
export function hasTemplateText(entry: OrderTemplate): boolean {
  return entry.botd.trim().length > 0;
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
  "delay-condonation": ["dismiss-case"],
  admission: ["cognizance", "dismiss-case", "issue-of-summons"],
  cognizance: ["cognizance", "dismiss-case", "issue-of-summons"],
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

/**
 * Everything the auto-fill pass can resolve without asking anybody.
 *
 * **The spec's general-variables table has thirteen rows, not six.** The first version of
 * this type carried the six *name* variables and concluded from their absence that the
 * catalogue references no general variable at all (D40). That was half the table. The
 * spec also lists `[Party Type]`, `[Party Name]`, `[Document Type]`, `[Hearing Purpose]`
 * and `[Current Hearing Date]` as general — *"Available to every template.
 * Auto-populated — the judge never types these"* — and four of those five are the most
 * common tokens in the twenty-five.
 *
 * **So the reconciliation is the load-bearing part of this type, not the field list.**
 * The spec says two things that look contradictory: those variables are auto-populated,
 * *and* "the system cannot fill a variable that requires a **choice among options**". It
 * resolves itself once you read what kind of value each one is:
 *
 * - **A single-valued fact resolves.** There is one court, one cause title, one case
 *   number, one presiding magistrate, one today. These fill, always.
 * - **A choice does not.** `[Party Type]` is complainant *or* accused *or* witness, and
 *   the spec's own rule is that with multiple candidates the system offers a selector.
 *   `[Party Name]` follows the type, so it cannot resolve before it.
 *   `[Document Type]` is a master-data dropdown the judge picks. **These are absent from
 *   this type on purpose** — filling them is what D40 was written to stop, and guessing
 *   "Issue summons to the accused" would put a party in an order that nobody chose.
 * - **A choice already made elsewhere on this screen is context, not a guess.** The spec
 *   calls this out separately: *"Workflow context — when an order is the output of a
 *   workflow… variables the workflow already collected are pre-filled"*, and
 *   *"Application context — when acting on an application, the Application Number and
 *   Application Type are already known, because the judge arrived at this order from the
 *   application itself."* The bench sets the next purpose and date in Next hearing and
 *   answers applications on the same screen, so those values are collected, not invented.
 *
 * Every context field is optional, and an absent one leaves its token standing rather
 * than resolving to a blank or a guess.
 */
export type OrderTemplateFacts = {
  /* The general variables: one value each, no choice to make. */
  /** `[Court Name]` */
  court: string;
  /** `[Case Name]` — "A v. B", the cause title. */
  caseName: string;
  /** `[Case Number]` */
  caseNumber: string;
  /** `[Current Date]` — already written out, not an ISO day. */
  currentDate: string;
  /** `[Judge Name]` — the magistrate whose order it is, never the seat at the keyboard. */
  judgeName: string;
  /** `[Judge Designation]` */
  judgeDesignation: string;
  /** `[Complainant Name]` */
  complainant: string;
  /** `[Accused Name]` */
  accused: string;
  /** `[Current Hearing Date]` — the sitting this order is passed at. */
  currentHearingDate: string;

  /* Context. Present only when the screen has actually collected the value. */
  /** `[Application Number]` — the application this order was reached from. */
  applicationNumber?: string;
  /** `[Application Type]` — its head. */
  applicationType?: string;
  /** `[Hearing Purpose]` — the next listing's purpose, as set in Next hearing. */
  hearingPurpose?: string;
  /** `[Hearing Date]` — the next listing's date, as set in Next hearing. */
  hearingDate?: string;
  /**
   * `[Original Hearing Date]` — the date of the hearing being **moved**, which is a
   * future listing and not the sitting this order is passed at.
   *
   * The order composer never supplies it (`orderTemplateFacts` says why); it belongs to
   * the rescheduling workflow. Mapped here so that workflow can fill it when it exists.
   */
  originalHearingDate?: string;
};

const GENERAL: { token: string; from: keyof OrderTemplateFacts }[] = [
  { token: "[Court Name]", from: "court" },
  { token: "[Case Name]", from: "caseName" },
  { token: "[Case Number]", from: "caseNumber" },
  { token: "[Current Date]", from: "currentDate" },
  { token: "[Judge Name]", from: "judgeName" },
  { token: "[Judge Designation]", from: "judgeDesignation" },
  { token: "[Complainant Name]", from: "complainant" },
  { token: "[Accused Name]", from: "accused" },
  { token: "[Current Hearing Date]", from: "currentHearingDate" },
  { token: "[Application Number]", from: "applicationNumber" },
  { token: "[Application Type]", from: "applicationType" },
  { token: "[Hearing Purpose]", from: "hearingPurpose" },
  { token: "[Hearing Date]", from: "hearingDate" },
  { token: "[Original Hearing Date]", from: "originalHearingDate" },
];

/**
 * The tokens the auto-fill pass resolves — the other half of the census.
 *
 * Exported so a test can assert that every token appearing anywhere in the twenty-five
 * is either on this list or on the test's list of declared *choices*. Templates are
 * system configuration an administrator edits, so a new one can introduce a token
 * tomorrow; the census is what makes that a failing test rather than a silent bracket
 * nobody ever fills.
 */
export const AUTO_FILLED_TOKENS: string[] = GENERAL.map((entry) => entry.token);

/**
 * The auto-fill pass — step 3 of the spec's own resolution order.
 *
 * A variable the system cannot resolve stays in the text as its own bracketed token, and
 * that is deliberate. It is a hole the reader can see, in the place the value will go —
 * where a blank, a guess, or a silently dropped clause would each produce an order that
 * reads as finished and is not. An *optional* fact that is absent behaves the same way:
 * no next date set yet means `[Hearing Date]` is still standing, not an empty gap in a
 * sentence.
 *
 * `[Hearing Date]` is replaced before `[Original Hearing Date]` would be a bug — one
 * token is not a prefix of the other, so plain substitution is safe here, and
 * `ORDER_TEMPLATE_TOKENS` in the test asserts that stays true of every token pair.
 */
export function fillGeneralVariables(
  botd: string,
  facts: OrderTemplateFacts,
): string {
  return GENERAL.reduce((text, entry) => {
    const value = facts[entry.from];
    if (value === undefined || value === "") return text;
    return text.split(entry.token).join(value);
  }, botd);
}

/** The bracketed tokens still standing in a filled line, in the order they appear. */
export function openSlots(text: string): string[] {
  return text.match(/\[[^\]]+\]/g) ?? [];
}

/**
 * Which template ids the delivery-channel confirmation gates.
 *
 * `process-variables.ts` asks the drafter to confirm the addressee and the delivery
 * channels before either of these writes its sentence into the order (`PRC-03` of
 * `process-handover.md`; `ITM-11` of `order-generation.md`). The rest of the process
 * types the source names — warrants, proclamation, attachment, miscellaneous process —
 * carry the same `[Party Type]`/`[Party Name]` shape and would want the same
 * confirmation; only these two are wired to it today, on the owner's own instruction
 * (2026-09-26) to start with summons and do the same for notices.
 */
export const PROCESS_VARIABLE_TEMPLATES: OrderTemplateId[] = [
  "issue-of-summons",
  "issue-of-notice",
];

export function needsProcessVariables(id: OrderItemTypeIdLike): boolean {
  return (PROCESS_VARIABLE_TEMPLATES as string[]).includes(id);
}

/** The shape `needsProcessVariables` accepts — `OrderItemTypeId` includes `"others"`,
 *  which is never in `PROCESS_VARIABLE_TEMPLATES`, so the check is safe either way. */
type OrderItemTypeIdLike = OrderTemplateId | "others";

/**
 * The party tokens for a process order — who is served, and who takes the steps.
 *
 * `[Party Type]` is locked and repeats with a different role each time it appears in a
 * process template — the person served, then the party who pays and takes steps — and
 * for a §138 complaint neither is a choice the drafter makes: the accused (the drawer)
 * is served and the complainant takes steps, always. `[Party Name]` follows the served
 * party, and takes whatever name (or joined names) the confirmation step resolved it to
 * — not necessarily the case's own `accused` field verbatim, where more than one
 * addressee exists to choose among.
 *
 * One function for both doors onto this substitution: the hearing composer's catalogue
 * (`order-items.ts`, run only after the delivery-channel confirmation) and the
 * cognizance composite (`cognizance-order.ts`, run unconditionally, since a complaint at
 * cognizance has no addressee to choose — see that file's own note). Two copies of this
 * would risk two answers to what an order says, which is the objection the suggestion
 * corpus above already states about a different pair of doors.
 */
export function fillPartyVariables(
  text: string,
  parties: { complainant: string; accused: string },
  template: OrderTemplateId,
): string {
  if (template !== "issue-of-summons" && template !== "issue-of-notice") {
    return text;
  }
  const roles = ["accused", parties.accused, "complainant"];
  let at = 0;
  return text.replace(/\[Party Type\]|\[Party Name\]/g, () => roles[at++] ?? "");
}
