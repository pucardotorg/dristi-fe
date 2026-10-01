"use client";

/**
 * SANDBOX DATA — the filed S-138 complaint that scrutiny sent back.
 *
 * The correction screen is the e-filing form re-entered in a correction posture, so it
 * needs a real draft to re-enter. This seeds one, once, into the same IndexedDB the
 * filing flow uses: two cheques, the complainant, the demand notice, and the five
 * documents intake asks for — with the *defective* values scrutiny actually saw
 * (`lib/tasks/scrutiny-return.ts` records those as `valueAtReturn`; if the two drift a
 * defect reads as resolved before anyone has touched it).
 *
 * The uploads are drawn locally as SVGs rather than shipped as binary fixtures: they only
 * have to be a page the officer's annotation box can sit on, and a repo does not need
 * four scans of an imaginary cheque in it. Nothing here has been sent to a real court.
 */

import {
  blankCheque,
  buildDocumentGroups,
  createBlankDraft,
  intakeChequeGroup,
} from "./blank";
import { getRepository } from "./data";
import type { FilingDraft, IntakeSlot, StoredFileRef } from "./types";

export { SCRUTINY_DRAFT_ID } from "@/lib/tasks/scrutiny-return";
import { SCRUTINY_DRAFT_ID, SCRUTINY_FILES } from "@/lib/tasks/scrutiny-return";

/** Page geometry the annotation boxes are expressed in — keep in step with the seed. */
const W = 900;
const H = 400;

/** A plain "document" page: a titled sheet with a few printed lines. Deterministic. */
function docSvg(title: string, lines: [string, string][]): Blob {
  const rows = lines
    .map(
      ([label, value], i) => `
    <text x="60" y="${120 + i * 56}" font-family="Helvetica, Arial" font-size="20" fill="#6b7280">${label}</text>
    <text x="360" y="${120 + i * 56}" font-family="Helvetica, Arial" font-size="24" fill="#111827">${value}</text>`
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#fdfdf9"/>
    <rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="#d4d4d8" stroke-width="2"/>
    <text x="60" y="70" font-family="Helvetica, Arial" font-size="26" font-weight="bold" fill="#111827">${title}</text>
    ${rows}
  </svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

const PAGES: Record<string, () => Blob> = {
  [SCRUTINY_FILES.cheque1.id]: () =>
    docSvg("Kerala Gramin Bank, Chalakudy", [
      ["Pay", "Sainaba K."],
      ["Rupees", "Two lakh forty thousand only"],
      ["Date", "14 / 05 / 2026"],
      ["Cheque no.", "447162"],
    ]),
  [SCRUTINY_FILES.cheque2.id]: () =>
    docSvg("Kerala Gramin Bank, Kodungallur town branch", [
      ["Pay", "Sainaba K."],
      ["Rupees", "One lakh eighty-five thousand only"],
      ["Date", "02 / 06 / 2026"],
      ["Cheque no.", "447163"],
    ]),
  [SCRUTINY_FILES.memo2.id]: () =>
    docSvg("Cheque return memo: cheque 447163", [
      ["Amount", "1,85,000.00"],
      ["Presented on", "09 / 06 / 2026"],
      ["Returned on", "11 / 06 / 2026"],
      ["Reason", "Funds insufficient"],
    ]),
  [SCRUTINY_FILES.adCard.id]: () =>
    docSvg("Acknowledgement due: RP 4471 8820 3IN", [
      ["Addressee", "Riyas M."],
      ["Delivered on", "(cut off at the fold)"],
      ["Signature", "(cut off at the fold)"],
    ]),
  [SCRUTINY_FILES.ifscEvidence.id]: () =>
    docSvg("Branch certificate: Kerala Gramin Bank", [
      ["Branch", "Kodungallur town"],
      ["IFSC", "KLGB0040213"],
      ["MICR", "680487002"],
    ]),
};

async function ensureFile(ref: StoredFileRef): Promise<void> {
  const repo = getRepository();
  if (await repo.getFile(ref.id)) return;
  const make = PAGES[ref.id];
  if (!make) return;
  await repo.putFile({ ...ref, blob: make(), createdAt: new Date().toISOString() });
}

/** Put a file into an intake slot and give it a page geometry the highlight can use. */
function fill(slot: IntakeSlot, ref: StoredFileRef): void {
  slot.file = { id: ref.id, name: ref.name, size: ref.size, type: ref.type, ext: ref.ext };
  slot.extract = {
    engine: "tesseract",
    confidence: 88,
    page: { width: W, height: H },
    fields: {},
    extractedAt: new Date().toISOString(),
  };
}

/** The filing as scrutiny received it — defects and all. */
function buildDraft(): FilingDraft {
  const d = createBlankDraft(SCRUTINY_DRAFT_ID);
  d.lastStep = "cheque";

  const c = d.complainants[0];
  c.mobile = "9847012233";
  c.verified = true;
  c.name = "Sainaba K.";
  c.age = ""; // Defect 5 — not stated.
  c.email = "sainaba.k@gmial.com"; // Defect 6 — evident typo.
  c.res = {
    line1: "Puthenveedu, Market Road",
    city: "Kodungallur",
    pin: "680664",
    district: "Thrissur",
    state: "Kerala",
  };
  c.perm = { ...c.res };

  d.advocates[0].name = "Anjali Nair";
  d.advocates[0].barNumber = "K/1188/2011";

  const a = d.accused[0];
  a.name = "Riyas M.";
  a.contacts = [{ mobile: "9846778811", email: "" }];
  a.addresses = [
    {
      addr: {
        line1: "Ashiyana, Beach Road",
        city: "Kodungallur",
        pin: "680664",
        district: "Thrissur",
        state: "Kerala",
      },
      police: "Kodungallur",
    },
  ];

  const one = d.cheques[0];
  one.dateOnCheque = "2026-05-14";
  one.amount = "240000";
  one.chequeNumber = "4471"; // Defect 2 — four digits, not six.
  one.ifsc = "KLGB0040231"; // Defect 1 — two digits transposed.
  one.bankName = "Kerala Gramin Bank";
  one.bankBranch = "Chalakudy";
  one.presentDate = "2026-05-28";
  one.returnDate = "2026-05-30";
  one.returnReason = "funds-insufficient";

  const two = blankCheque();
  two.dateOnCheque = "2026-06-02";
  two.amount = "85000"; // Defect 4 — the memo reads 1,85,000.
  two.chequeNumber = "447163";
  two.sameAsPrev = "no";
  two.ifsc = "KLGB0040213";
  two.bankName = "Kerala Gramin Bank";
  two.bankBranch = "Kollam"; // Defect 3 — not the branch on the leaf.
  two.presentDate = "2026-06-09";
  two.returnDate = "2026-06-11";
  two.returnReason = "funds-insufficient";
  d.cheques.push(two);

  const n = d.notices[0];
  n.natureDebt = "loan";
  n.whyIssued = "repayment";
  n.dispatchDate = "2026-06-18";
  n.modeService = "registered-post-ad";
  n.tracking = ""; // Defect 7 — not stated.
  n.delivered = "yes";
  n.deliveryDate = "2026-06-21";
  n.replied = "no";
  n.paymentStatus = "none";

  d.jurisdiction.deposited = "yes";
  d.jurisdiction.ifsc = "SBIN0070123";
  d.jurisdiction.payeeBankName = "State Bank of India";
  d.jurisdiction.payeeBankBranch = "Kodungallur";
  d.jurisdiction.payeeFetched = true;
  d.jurisdiction.payeePolice = "Kodungallur";
  d.jurisdiction.drawerPolice = "Kodungallur";
  d.jurisdiction.causeDate = "2026-07-06";
  d.jurisdiction.filingDate = "2026-07-24";

  const w = d.witnesses[0];
  w.fullName = "Ashraf P. M.";
  w.designation = "Neighbour";
  w.age = "52";
  w.prove = "Present when the cheque was handed over.";

  // Intake — a group per cheque, and the uploads the defects point at.
  d.intake.cheques.push(intakeChequeGroup(2));
  const c1 = d.intake.cheques[0];
  fill(c1.slots[0], SCRUTINY_FILES.cheque1);
  fill(c1.slots[4], SCRUTINY_FILES.adCard); // Defect 8 — the AD card, scanned at an angle.
  const c2 = d.intake.cheques[1];
  fill(c2.slots[0], SCRUTINY_FILES.cheque2);
  fill(c2.slots[1], SCRUTINY_FILES.memo2);

  d.documents = buildDocumentGroups(d);
  return d;
}

let seeding: Promise<FilingDraft | null> | null = null;

/**
 * Make sure the returned filing is in this browser, and hand it back. Idempotent: an
 * existing draft is never overwritten, so corrections made in a previous sitting survive.
 */
export function ensureScrutinyDraft(draftId: string): Promise<FilingDraft | null> {
  if (draftId !== SCRUTINY_DRAFT_ID) return getRepository().getDraft(draftId);
  if (!seeding) {
    seeding = (async () => {
      const repo = getRepository();
      const existing = await repo.getDraft(SCRUTINY_DRAFT_ID);
      await Promise.all(Object.values(SCRUTINY_FILES).map(ensureFile));
      if (existing) return existing;
      const draft = buildDraft();
      await repo.putDraft(draft);
      return draft;
    })().catch(() => null);
  }
  return seeding;
}
