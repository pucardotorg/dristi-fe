/**
 * SANDBOX DATA — the one scrutiny return the correction screen is demonstrated on.
 *
 * Eight defects across the S-138 complaint of `c-sainaba` (Sainaba K. v. Riyas M., still
 * pre-filing, so scrutiny is the step it is actually at): two cheques — including a
 * Cheque 2 instance — the complainant, the demand notice, and one whole document. The
 * feedback shapes are deliberately mixed, because the screen has to hold all of them:
 * a bare note, a note with a spoken remark, a note with a box drawn on the scan, and a
 * note with an explicit suggested value and the paper behind it.
 *
 * Nothing here has been sent to a real court. The officer's remarks are written the way
 * `ke-scrutiny-officer-2026-07` describes registry remarks — terse, and about the paper.
 */

import type { Defect, StoredFileRef } from "./types";

/** The e-filing draft this return corrects; seeded by `lib/filing/scrutiny-demo.ts`. */
export const SCRUTINY_DRAFT_ID = "draft-scrutiny-sainaba";

/** Intake slot keys the seeded draft uses — the officer's boxes are drawn on these. */
export const SCRUTINY_FILES = {
  cheque1: { id: "sc-f-c1f", name: "cheque-1-front.svg", size: 48_120, type: "image/svg+xml", ext: "SVG" },
  cheque2: { id: "sc-f-c2f", name: "cheque-2-front.svg", size: 47_640, type: "image/svg+xml", ext: "SVG" },
  adCard: { id: "sc-f-c1ad", name: "ad-card-scan.svg", size: 62_300, type: "image/svg+xml", ext: "SVG" },
  ifscEvidence: { id: "sc-f-ifsc", name: "bank-branch-certificate.svg", size: 39_880, type: "image/svg+xml", ext: "SVG" },
  memo2: { id: "sc-f-c2m", name: "cheque-2-return-memo.svg", size: 41_200, type: "image/svg+xml", ext: "SVG" },
} as const satisfies Record<string, StoredFileRef>;

/**
 * SVG page geometry, so `regionFromBox` maps the officer's box the same way OCR's is.
 *
 * The boxes below are in this space and are measured against the seeded pages in
 * `lib/filing/scrutiny-demo.ts`, whose rows sit on baselines `120 + i * 56` with labels at
 * x 60 and values at x 360. A box that lands a row away from the thing it marks is a
 * demo that argues against itself, so the two files have to be kept in step.
 */
const PAGE = { width: 900, height: 400 };

/**
 * The eight defects, numbered as the officer numbered them.
 *
 * `valueAtReturn` is what scrutiny actually saw in the filing — the baseline the screen
 * measures "has this changed?" against. It must match the seeded draft; if the two drift,
 * a defect looks resolved before anyone has touched it.
 */
export const SCRUTINY_DEFECTS: Defect[] = [
  {
    n: 1,
    target: {
      kind: "field",
      step: "cheque",
      instance: 0,
      field: "ifsc",
      label: "IFSC code",
      sectionLabel: "Case details",
      instanceLabel: "Cheque 1",
    },
    note: "The IFSC does not belong to the branch named in the complaint. The branch certificate produced with the complaint reads KLGB0040213.",
    valueAtReturn: "KLGB0040231",
    voiceNote: {
      id: "sc-v-1",
      durationMs: 42_000,
      transcript:
        "The code on the complaint has two digits transposed. Compare it with the branch certificate at page 11 — that one is the correct code. Correct it and the bank name and branch will follow.",
    },
    suggestion: {
      from: "KLGB0040231",
      to: "KLGB0040213",
      evidence: SCRUTINY_FILES.ifscEvidence,
    },
  },
  {
    n: 2,
    target: {
      kind: "field",
      step: "cheque",
      instance: 0,
      field: "chequeNumber",
      label: "Cheque number",
      sectionLabel: "Case details",
      instanceLabel: "Cheque 1",
    },
    note: "Cheque number is stated in four digits. The number printed on the cheque leaf is six digits — state it in full.",
    valueAtReturn: "4471",
    annotation: {
      file: SCRUTINY_FILES.cheque1,
      /* The cheque number as printed — row 4's value. */
      box: { x0: 350, y0: 262, x1: 480, y1: 298 },
      page: PAGE,
    },
  },
  {
    n: 3,
    target: {
      kind: "field",
      step: "cheque",
      instance: 1,
      field: "bankBranch",
      label: "Bank branch",
      sectionLabel: "Case details",
      instanceLabel: "Cheque 2",
    },
    note: "Branch for the second cheque is stated as “Main”. The cheque leaf names the branch — state it as printed.",
    valueAtReturn: "Main",
    annotation: {
      file: SCRUTINY_FILES.cheque2,
      /* The branch is printed in the cheque's title line. */
      box: { x0: 50, y0: 42, x1: 700, y1: 82 },
      page: PAGE,
    },
  },
  {
    n: 4,
    target: {
      kind: "field",
      step: "cheque",
      instance: 1,
      field: "amount",
      label: "Amount",
      sectionLabel: "Case details",
      instanceLabel: "Cheque 2",
    },
    note: "Amount of the second cheque does not agree with the return memo. The memo reads ₹1,85,000.",
    valueAtReturn: "85000",
    suggestion: { from: "85000", to: "185000", evidence: SCRUTINY_FILES.memo2 },
    voiceNote: {
      id: "sc-v-4",
      durationMs: 26_000,
      transcript:
        "Check this one against the memo before you change it. If the memo is the document that is wrong, say so — do not simply take my figure.",
    },
  },
  {
    n: 5,
    target: {
      kind: "field",
      step: "complainant",
      instance: 0,
      field: "age",
      label: "Age",
      sectionLabel: "Parties",
      instanceLabel: "Complainant 1",
    },
    note: "Age of the complainant is not stated. It is required in the cause title.",
    valueAtReturn: "",
  },
  {
    n: 6,
    target: {
      kind: "field",
      step: "complainant",
      instance: 0,
      field: "email",
      label: "Email address",
      sectionLabel: "Parties",
      instanceLabel: "Complainant 1",
    },
    note: "The email address carries an evident typographical error and notice cannot be served on it.",
    valueAtReturn: "sainaba.k@gmial.com",
    suggestion: { from: "sainaba.k@gmial.com", to: "sainaba.k@gmail.com" },
  },
  {
    n: 7,
    target: {
      kind: "field",
      step: "demand-notice",
      instance: 0,
      field: "tracking",
      label: "Tracking number",
      sectionLabel: "Case details",
      instanceLabel: "Demand notice 1",
    },
    note: "Tracking number of the registered post is not stated, though the postal receipt is produced. Enter it from the receipt.",
    valueAtReturn: "",
    voiceNote: {
      id: "sc-v-7",
      durationMs: 18_000,
      transcript:
        "The consignment number is printed at the top right of the receipt you have already filed. Only the number is wanted here.",
    },
  },
  {
    n: 8,
    target: {
      kind: "doc",
      step: "upload",
      slotKey: "c1ad",
      label: "Proof of delivery of demand notice (AD card)",
      sectionLabel: "Documents",
    },
    /* The scan scrutiny saw; replacing the file in that slot is what clears this. */
    valueAtReturn: SCRUTINY_FILES.adCard.id,
    note: "The acknowledgement card is scanned at an angle and the date of delivery and the signature are cut off at the fold. Produce a clean scan of the whole card.",
    annotation: {
      file: SCRUTINY_FILES.adCard,
      /* The two lines the fold cut off: delivery date and signature. */
      box: { x0: 340, y0: 152, x1: 800, y1: 246 },
      page: PAGE,
    },
  },
];
