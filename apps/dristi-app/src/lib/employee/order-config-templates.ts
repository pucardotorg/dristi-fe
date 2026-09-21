/**
 * Order template data for the configuration screen.
 *
 * Source of truth: `handovers/order-template-catalogue.md`. Every order type, its
 * category, template text, variable model, workflow info, and hearing purpose
 * associations are transcribed here.
 *
 * **Variable model.** Three scopes:
 * - **General variables** — available to any template, auto-populated from case/court
 *   data or selected from master data. The judge does not type these.
 * - **Locked variables** — required by the workflow this order triggers. Cannot be
 *   removed from the template. Only non-general variables appear in `lockedVars`
 *   (general variables in the text are always available regardless).
 * - **Optional variables** — enrich the order text but no workflow depends on them.
 *   Can be added or removed freely by an administrator.
 *
 * Variables in the text are **detected dynamically** by parsing `[brackets]` — the
 * variable list in the editor is always derived from the current text content, not from a
 * static array.
 *
 * **Resolution types:** `auto-fill` (green), `select` (blue), `input` (amber).
 */

// ---------------------------------------------------------------------------
// Variable model
// ---------------------------------------------------------------------------

export type VariableResolution = "auto-fill" | "select" | "input";

export type TemplateVariable = {
  name: string;
  resolution: VariableResolution;
  description?: string;
  /** Where the select draws from, e.g. "Master data", "Case participants". */
  source?: string;
  /** For input variables: the control type, e.g. "date", "currency", "text". */
  inputType?: string;
};

// ---------------------------------------------------------------------------
// General variables — available to every template
// ---------------------------------------------------------------------------

export const GENERAL_VARIABLES: TemplateVariable[] = [
  { name: "Court Name", resolution: "auto-fill", description: "Name of the court", source: "Court data" },
  { name: "Case Name", resolution: "auto-fill", description: "e.g. X vs Y", source: "Case data" },
  { name: "Case Number", resolution: "auto-fill", description: "Case number", source: "Case data" },
  { name: "Current Date", resolution: "auto-fill", description: "Today's date", source: "System" },
  { name: "Judge Name", resolution: "auto-fill", description: "Presiding judge", source: "Court data" },
  { name: "Judge Designation", resolution: "auto-fill", description: "e.g. JMFC", source: "Court data" },
  { name: "Complainant Name", resolution: "auto-fill", description: "Name of the complainant", source: "Case data" },
  { name: "Accused Name", resolution: "auto-fill", description: "Name of the accused", source: "Case data" },
  { name: "Party Type", resolution: "select", description: "Complainant, Accused, or Witness", source: "Case data" },
  { name: "Party Name", resolution: "select", description: "Any person in the case", source: "Case data" },
  { name: "Document Type", resolution: "select", description: "Type of document", source: "Master data" },
  { name: "Hearing Purpose", resolution: "select", description: "Purpose of hearing", source: "Master data" },
  { name: "Current Hearing Date", resolution: "auto-fill", description: "Date of the current/most recent hearing", source: "Case data" },
];

/** Look up a general variable by name. */
export const GENERAL_VAR_MAP: Record<string, TemplateVariable> = {};
for (const v of GENERAL_VARIABLES) GENERAL_VAR_MAP[v.name] = v;
const GENERAL_VAR_SET = new Set(GENERAL_VARIABLES.map((v) => v.name));

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const ORDER_CATEGORIES = [
  "Cognizance",
  "Case management",
  "Process",
  "Bail",
  "Resolution",
  "Costs",
  "Judgment",
] as const;

export type OrderCategory = (typeof ORDER_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Template groups (sidebar sections)
// ---------------------------------------------------------------------------

export const TEMPLATE_GROUPS = [
  { key: "cognizance", label: "Cognizance" },
  { key: "case_management", label: "Case Management" },
  { key: "process", label: "Process Orders" },
  { key: "bail", label: "Bail" },
  { key: "resolution", label: "Resolution" },
  { key: "costs", label: "Costs" },
  { key: "judgment", label: "Judgment" },
  { key: "contextual", label: "Contextual Orders" },
] as const;

export type TemplateGroup = (typeof TEMPLATE_GROUPS)[number]["key"];

// ---------------------------------------------------------------------------
// Order type
// ---------------------------------------------------------------------------

export type OrderTemplate = {
  id: string;
  name: string;
  group: TemplateGroup;
  inDropdown: boolean;
  dropdownCondition?: string;
  category?: OrderCategory;
  /** The workflow this order triggers. Empty string means none. */
  workflow: string;
  /** Short board text for Business of the Day. */
  botdText: string;
  /** Full order template text. */
  orderText: string;
  /** Non-general variables locked to this template by its workflow — cannot be removed. */
  lockedVars: TemplateVariable[];
  /** Non-general variables that enrich the text — can be added or removed freely. */
  optionalVars?: TemplateVariable[];
  /** True when the order has no template — the magistrate writes freely (e.g. Judgement). */
  freeText?: boolean;
  /** Hearing purpose IDs associated with this template (editable). */
  hearingPurposeIds?: number[];
};

// ---------------------------------------------------------------------------
// Variable helpers
// ---------------------------------------------------------------------------

/** Parse [Variable Name] tokens from a text string. Returns unique names in order. */
export function parseVariables(text: string): string[] {
  const out: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** All unique variables detected in both the BOTD and order text of a template. */
export function allDetectedVariables(t: OrderTemplate): string[] {
  return [
    ...new Set([...parseVariables(t.botdText), ...parseVariables(t.orderText)]),
  ];
}

export type ClassifiedVariable = TemplateVariable & {
  scope: "general" | "locked" | "optional" | "unknown";
};

/** Classify a variable name against the general set, locked vars, and optional vars. */
export function classifyVariable(
  name: string,
  t: OrderTemplate,
): ClassifiedVariable {
  if (GENERAL_VAR_SET.has(name)) {
    return { scope: "general", ...GENERAL_VAR_MAP[name] };
  }
  const lv = t.lockedVars.find((v) => v.name === name);
  if (lv) {
    return { scope: "locked", ...lv };
  }
  const ov = (t.optionalVars ?? []).find((v) => v.name === name);
  if (ov) {
    return { scope: "optional", ...ov };
  }
  return {
    scope: "unknown",
    name,
    resolution: "input",
    description: "Not recognised",
  };
}

/** Resolution type → CSS colour class key. */
export function resolutionColor(
  res: VariableResolution | "unknown",
): string {
  switch (res) {
    case "auto-fill":
      return "auto";
    case "select":
      return "select";
    case "input":
      return "input";
    default:
      return "unknown";
  }
}

/** Human label for a variable's resolution. */
export function resolutionLabel(v: TemplateVariable): string {
  if (v.resolution === "auto-fill") return "Auto-fills";
  if (v.resolution === "select")
    return "Select · " + (v.source || "list");
  if (v.resolution === "input")
    return "Input · " + (v.inputType || "text");
  return "";
}

// ---------------------------------------------------------------------------
// Template data — matches the catalogue (minus Not in V1 types)
// ---------------------------------------------------------------------------

let _nextId = 100;
export function generateId(): string {
  return "n" + _nextId++;
}

export const INITIAL_TEMPLATES: OrderTemplate[] = [
  // ── Cognizance ──
  {
    id: "t1",
    name: "Cognizance",
    group: "cognizance",
    inDropdown: true,
    dropdownCondition: "when cognizance is due",
    category: "Cognizance",
    workflow: "Take cognizance — advance to Appearance",
    botdText: "Cognizance taken u/s 138 NI Act",
    orderText:
      "Considering the materials produced before the Court, I am prima facie satisfied that the offence punishable under S. 138 of NI Act is made out. Accordingly cognizance of the offence is taken and the case is taken on file.",
    lockedVars: [],
  },
  {
    id: "t2",
    name: "Dismiss case",
    group: "cognizance",
    inDropdown: true,
    dropdownCondition: "when cognizance is due",
    category: "Cognizance",
    workflow: "Close case — dismissed",
    botdText: "Case [Case Number] dismissed",
    orderText: "The case is dismissed.",
    lockedVars: [],
  },

  // ── Case management ──
  // Sheet #1 — locked: Party Type, Document Type, Document Name, Deadline for Submission, Deadline for Response
  // Party Type and Document Type are general; the rest are locked non-general.
  {
    id: "t3",
    name: "Mandatory submissions and responses",
    group: "case_management",
    inDropdown: true,
    category: "Case management",
    workflow: "Creates submission task; creates response task if response required",
    botdText: "[Party Name] directed to file [Document Type]",
    orderText:
      "It is directed that the [Party Type] files a [Document Type] for [Document Name] before the court by [Deadline for Submission]. Additionally, the [Party Type] must submit a response by [Deadline for Response].",
    lockedVars: [
      { name: "Document Name", resolution: "input", description: "Free text", inputType: "text" },
      { name: "Deadline for Submission", resolution: "input", description: "Filing deadline", inputType: "date" },
      { name: "Deadline for Response", resolution: "input", description: "Response deadline — conditional", inputType: "date" },
    ],
  },
  // Sheet #3 — locked: Hearing Date, Hearing Purpose
  // Hearing Purpose is general; Hearing Date is locked non-general.
  {
    id: "t4",
    name: "Scheduling of hearing date",
    group: "case_management",
    inDropdown: true,
    dropdownCondition: "when hearing not ongoing",
    category: "Case management",
    workflow: "Schedules next hearing",
    botdText: "Next hearing on [Hearing Date] for [Hearing Purpose]",
    orderText:
      "Next hearing is scheduled on [Hearing Date] for [Hearing Purpose].",
    lockedVars: [
      { name: "Hearing Date", resolution: "input", description: "Date of next hearing", inputType: "date" },
    ],
  },
  // Sheet #7 — no locked, no optional
  {
    id: "t5",
    name: "Case transfer",
    group: "case_management",
    inDropdown: true,
    category: "Case management",
    workflow: "Transfer case",
    botdText: "Case [Case Number] transferred",
    orderText:
      "The case is transferred to another court for further proceedings.",
    lockedVars: [],
  },
  // Sheet #22 — no locked, no optional
  {
    id: "t6",
    name: "Moving case to long pending register",
    group: "case_management",
    inDropdown: true,
    dropdownCondition: "when case is ST",
    category: "Case management",
    workflow: "Change stage ST → LP",
    botdText: "Case moved to LP Register",
    orderText:
      "As per sanction given by Honourable CJM the case is moved to the Long Pending Register and is marked as LP.",
    lockedVars: [],
  },
  // Sheet #23 — no locked, no optional
  {
    id: "t7",
    name: "Moving case out of long pending register",
    group: "case_management",
    inDropdown: true,
    dropdownCondition: "when case is LP",
    category: "Case management",
    workflow: "Change stage LP → ST",
    botdText: "Case moved out of LP Register",
    orderText:
      "The case is moved out of the Long Pending Register and is to be considered and renumbered as a ST case.",
    lockedVars: [],
  },

  // ── Process ──
  // Sheet #9 — locked: Party Type (×2), Party Name — all general
  {
    id: "t8",
    name: "Issue of summons",
    group: "process",
    inDropdown: true,
    dropdownCondition: "ST/LP",
    category: "Process",
    workflow: "Triggers the summons workflow",
    botdText: "Summons issued to [Party Name]",
    orderText:
      "Issue summons to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps to issue summons.",
    lockedVars: [],
  },
  // Sheet #10 — locked: Party Type (×2), Party Name — all general
  {
    id: "t9",
    name: "Issue of warrants",
    group: "process",
    inDropdown: true,
    dropdownCondition: "ST/LP",
    category: "Process",
    workflow: "Triggers the warrant workflow",
    botdText: "Warrant issued to [Party Name]",
    orderText:
      "Issue warrant to the [Party Type] [Party Name]. The [Party Type] is directed to take steps to issue warrant.",
    lockedVars: [],
  },
  // Sheet #12 — locked: Notice Type, Party Type (×2), Party Name
  // Notice Type is not general → locked non-general. Rest are general.
  {
    id: "t10",
    name: "Issue of notice",
    group: "process",
    inDropdown: true,
    category: "Process",
    workflow: "Triggers the notice workflow",
    botdText: "[Notice Type] notice issued to [Party Name]",
    orderText:
      "Issue [Notice Type] notice to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps.",
    lockedVars: [
      { name: "Notice Type", resolution: "select", description: "Type of notice", source: "Master data" },
    ],
  },
  // Sheet #20 — locked: Party Type, Party Name — all general
  {
    id: "t11",
    name: "Issue of proclamation",
    group: "process",
    inDropdown: true,
    dropdownCondition: "ST/LP",
    category: "Process",
    workflow: "Triggers the proclamation workflow",
    botdText: "Proclamation issued against [Party Name]",
    orderText:
      "Issue proclamation to the [Party Type] [Party Name]. Complainant is directed to make the appropriate payments and take steps.",
    lockedVars: [],
  },
  // Sheet #21 — locked: Party Type, Party Name — all general
  {
    id: "t12",
    name: "Issue of attachment",
    group: "process",
    inDropdown: true,
    dropdownCondition: "ST/LP",
    category: "Process",
    workflow: "Triggers the attachment workflow",
    botdText: "Attachment order against [Party Name]",
    orderText:
      "Issue attachment against the [Party Type] [Party Name]. Complainant is directed to make the appropriate payments and take steps.",
    lockedVars: [],
  },
  // Sheet #25 — locked: Process Type, Party Type (×2), Party Name
  // Process Type is not general → locked non-general. Rest are general.
  {
    id: "t13",
    name: "Issue of miscellaneous process",
    group: "process",
    inDropdown: true,
    dropdownCondition: "ST/LP",
    category: "Process",
    workflow: "Triggers the miscellaneous process workflow",
    botdText: "[Process Type] issued to [Party Name]",
    orderText:
      "Issue [Process Type] to the [Party Type] [Party Name]. The [Party Type] is directed to make the appropriate payments and take steps.",
    lockedVars: [
      { name: "Process Type", resolution: "select", description: "Type of miscellaneous process", source: "Master data" },
    ],
  },

  // ── Bail ──
  // Sheet #17 — locked: (none). optional: Plea — guilty/not guilty
  {
    id: "t14",
    name: "Bail",
    group: "bail",
    inDropdown: true,
    dropdownCondition: "ST/LP",
    category: "Bail",
    workflow: "Triggers the bail workflow",
    botdText: "Bail granted. Plea recorded.",
    orderText:
      "Accused is released on bail. Particulars of offences u/s.138 of NI Act were read over and explained to the Accused to which he pleaded [Plea] and claimed to be tried.",
    lockedVars: [],
    optionalVars: [
      { name: "Plea", resolution: "select", description: "Guilty / Not guilty", source: "Master data" },
    ],
  },

  // ── Resolution ──
  // Sheet #2 — locked: (none). optional: Mode of ADR, Date of End of ADR
  {
    id: "t15",
    name: "Referral of case to ADR",
    group: "resolution",
    inDropdown: true,
    category: "Resolution",
    workflow: "",
    botdText: "Referred to [Mode of ADR]",
    orderText:
      "Both the Parties have voluntarily agreed to seek resolution through [Mode of ADR]. The parties are hereby referred to [Mode of ADR] to resolve their dispute by [Date of End of ADR].",
    lockedVars: [],
    optionalVars: [
      { name: "Mode of ADR", resolution: "select", description: "Mediation, Arbitration, Lok Adalat", source: "Master data" },
      { name: "Date of End of ADR", resolution: "input", description: "Deadline for resolution", inputType: "date" },
    ],
  },
  // Sheet #8 — no locked, no optional
  {
    id: "t16",
    name: "Case settlement",
    group: "resolution",
    inDropdown: true,
    category: "Resolution",
    workflow: "Close case — settlement",
    botdText: "Settlement accepted. Case closed.",
    orderText:
      "The settlement records have been accepted by the court. Case closed.",
    lockedVars: [],
  },
  // Sheet #11 — locked: Application Number (not general)
  {
    id: "t17",
    name: "Withdrawal of case",
    group: "resolution",
    inDropdown: true,
    category: "Resolution",
    workflow: "Close case — withdrawal",
    botdText: "Complaint withdrawn. Accused acquitted.",
    orderText:
      "As per application [Application Number] complainant has sought to withdraw the complaint. Permission under Section 280 of the BNSS is granted and the Accused is acquitted.",
    lockedVars: [
      { name: "Application Number", resolution: "select", description: "Pick from pending applications", source: "Case applications" },
    ],
  },
  // Sheet #24 — no locked, no optional
  {
    id: "t18",
    name: "Abate case",
    group: "resolution",
    inDropdown: true,
    category: "Resolution",
    workflow: "Close case — abated",
    botdText: "Case abated",
    orderText:
      "The case is abated following the death of the Accused party.",
    lockedVars: [],
  },

  // ── Costs ──
  // Sheet #18 — locked: Party Type (×2, general), Amount, Date
  {
    id: "t19",
    name: "Cost",
    group: "costs",
    inDropdown: true,
    category: "Costs",
    workflow: "Creates payment task",
    botdText: "[Party Type] directed to pay [Amount] to [Party Type]",
    orderText:
      "The [Party Type] is directed to pay [Amount] to the [Party Type] as costs by [Date].",
    lockedVars: [
      { name: "Amount", resolution: "input", description: "Payment amount", inputType: "currency" },
      { name: "Date", resolution: "input", description: "Deadline for payment", inputType: "date" },
    ],
  },
  // Sheet #19 — locked: Party Type (×2, general), Amount, Date
  {
    id: "t20",
    name: "Witness batta",
    group: "costs",
    inDropdown: true,
    category: "Costs",
    workflow: "Creates payment task",
    botdText:
      "[Party Type] directed to pay [Amount] to [Party Type] as witness batta",
    orderText:
      "The [Party Type] is directed to pay [Amount] to the [Party Type] as witness batta by [Date].",
    lockedVars: [
      { name: "Amount", resolution: "input", description: "Payment amount", inputType: "currency" },
      { name: "Date", resolution: "input", description: "Deadline for payment", inputType: "date" },
    ],
  },

  // ── Judgment ──
  // Sheet #15 — no locked, no optional, free text
  {
    id: "t21",
    name: "Judgement",
    group: "judgment",
    inDropdown: true,
    category: "Judgment",
    workflow: "Close case — judgment delivered",
    botdText: "Judgment delivered",
    orderText: "",
    lockedVars: [],
    freeText: true,
  },

  // ── Contextual orders (not in dropdown) ──
  // Sheet #4 — locked: Original Hearing Date, Hearing Purpose (general), New Hearing Date
  {
    id: "t22",
    name: "Rescheduling of hearing date",
    group: "contextual",
    inDropdown: false,
    workflow: "Reschedule hearing",
    botdText: "Hearing rescheduled to [New Hearing Date]",
    orderText:
      "Next hearing scheduled on [Original Hearing Date] for [Hearing Purpose] has been rescheduled to [New Hearing Date].",
    lockedVars: [
      { name: "Original Hearing Date", resolution: "select", description: "Pick from case calendar", source: "Case calendar" },
      { name: "New Hearing Date", resolution: "input", description: "Rescheduled date", inputType: "date" },
    ],
  },
  // Sheet #5 — locked: Application Number, Application Type
  {
    id: "t23",
    name: "Accept application",
    group: "contextual",
    inDropdown: false,
    workflow: "Depends on application type",
    botdText: "Application [Application Number] accepted",
    orderText:
      "Application [Application Number] for [Application Type] is accepted.",
    lockedVars: [
      { name: "Application Number", resolution: "select", description: "Pick from pending applications", source: "Case applications" },
      { name: "Application Type", resolution: "auto-fill", description: "Type of the selected application" },
    ],
  },
  // Sheet #6 — locked: Application Number, Application Type
  {
    id: "t24",
    name: "Reject application",
    group: "contextual",
    inDropdown: false,
    workflow: "",
    botdText: "Application [Application Number] rejected",
    orderText:
      "Application [Application Number] for [Application Type] is rejected.",
    lockedVars: [
      { name: "Application Number", resolution: "select", description: "Pick from pending applications", source: "Case applications" },
      { name: "Application Type", resolution: "auto-fill", description: "Type of the selected application" },
    ],
  },
  // Sheet #13 — locked: Application Number
  {
    id: "t25",
    name: "Acceptance of bail",
    group: "contextual",
    inDropdown: false,
    workflow: "Optionally triggers bail bond submission workflow",
    botdText: "Bail application [Application Number] accepted",
    orderText: "Application [Application Number] is accepted.",
    lockedVars: [
      { name: "Application Number", resolution: "select", description: "Pick from pending applications", source: "Case applications" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Hearing purposes and their order-type associations
// ---------------------------------------------------------------------------

export type HearingPurpose = {
  id: number;
  name: string;
  peopleRequired?: string;
  /**
   * Template IDs that are likely to be issued during this hearing.
   * Generic orders (scheduling, cost, submissions, withdrawal, case transfer,
   * LP register moves, abate) are always available and not listed.
   */
  likelyTemplateIds: string[];
  sectionWorkflows?: string[];
};

export const HEARING_PURPOSES: HearingPurpose[] = [
  {
    id: 1,
    name: "Condonation of delay",
    peopleRequired: "Complainant Advocate, Accused Advocate",
    likelyTemplateIds: ["t2"],
  },
  {
    id: 2,
    name: "Admission",
    peopleRequired: "Complainant Advocate, Accused Advocate",
    likelyTemplateIds: ["t1", "t2", "t8"],
  },
  {
    id: 3,
    name: "Delay condonation and admission",
    peopleRequired: "Complainant Advocate, Accused Advocate",
    likelyTemplateIds: ["t1", "t2", "t8"],
  },
  {
    id: 4,
    name: "Cognizance",
    peopleRequired: "Complainant Advocate, Accused Advocate",
    likelyTemplateIds: ["t1", "t2", "t8"],
  },
  {
    id: 5,
    name: "Appearance",
    peopleRequired: "Accused, Accused Advocate",
    likelyTemplateIds: ["t8", "t9", "t14", "t10"],
  },
  {
    id: 6,
    name: "Bail",
    peopleRequired: "Accused, Accused Advocate",
    likelyTemplateIds: ["t14", "t25", "t9"],
  },
  {
    id: 7,
    name: "Plea",
    peopleRequired: "Accused, Accused Advocate",
    likelyTemplateIds: ["t14", "t15", "t10"],
    sectionWorkflows: ["Recording of plea"],
  },
  {
    id: 8,
    name: "Evidence of the complainant",
    peopleRequired: "Complainant, Complainant Advocate, Accused Advocate",
    likelyTemplateIds: ["t20", "t8"],
    sectionWorkflows: [
      "Evidence of the complainant",
      "Examination of the witness",
    ],
  },
  {
    id: 9,
    name: "Examination of the accused under S. 351 BNSS",
    peopleRequired: "Accused, Accused Advocate",
    likelyTemplateIds: ["t9"],
    sectionWorkflows: ["Examination of the accused"],
  },
  {
    id: 10,
    name: "Evidence of the accused",
    peopleRequired: "Complainant Advocate, Accused, Accused Advocate",
    likelyTemplateIds: ["t20", "t8"],
    sectionWorkflows: ["Examination of the witness"],
  },
  {
    id: 11,
    name: "Arguments",
    peopleRequired: "Complainant Advocate, Accused Advocate",
    likelyTemplateIds: ["t15", "t16"],
  },
  {
    id: 12,
    name: "Judgement",
    peopleRequired: "Accused Advocate",
    likelyTemplateIds: ["t21"],
  },
  {
    id: 13,
    name: "For reports (forensics, ADR, etc.)",
    likelyTemplateIds: ["t15"],
  },
  {
    id: 14,
    name: "ADR",
    likelyTemplateIds: ["t15", "t16"],
  },
  {
    id: 15,
    name: "Mediation",
    likelyTemplateIds: ["t15", "t16"],
  },
  {
    id: 16,
    name: "Warrant",
    likelyTemplateIds: ["t9", "t11", "t12", "t14"],
  },
  {
    id: 17,
    name: "Execution",
    likelyTemplateIds: ["t12", "t9"],
  },
  {
    id: 18,
    name: "Review application",
    likelyTemplateIds: [],
  },
  {
    id: 19,
    name: "To issue order",
    likelyTemplateIds: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get hearing purposes that include a given template. */
export function hearingPurposesForTemplate(
  templateId: string,
): HearingPurpose[] {
  return HEARING_PURPOSES.filter((hp) =>
    hp.likelyTemplateIds.includes(templateId),
  );
}

/**
 * Compute initial `hearingPurposeIds` for every template from the
 * `likelyTemplateIds` reverse mapping in HEARING_PURPOSES.
 */
export function initHearingPurposeIds(
  templates: OrderTemplate[],
): OrderTemplate[] {
  return templates.map((t) => ({
    ...t,
    hearingPurposeIds: t.hearingPurposeIds ?? hearingPurposesForTemplate(t.id).map((hp) => hp.id),
  }));
}
