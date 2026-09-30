/**
 * What reading actually produced for one uploaded document — the single mapping behind
 * every surface that reports it: the upload row, the uploaded-documents drawer, and the
 * live region.
 *
 * `slot.poor` is the engine's raw confidence signal, not the outcome. A scan can score
 * badly and still yield seven fields that are now sitting in the form. Presentation is
 * therefore driven by what came *out* (`extract.fields`), and `poor` only softens the
 * wording; it never turns a successful read into an error. Reading `poor` directly is how
 * a row ends up wearing a "Poor scan" badge and a re-upload prompt over a form the same
 * file just filled in.
 */

import { extractable } from "@/lib/filing/ocr";
import { extractedFieldCount } from "@/lib/filing/selectors";
import type { IntakeSlot } from "@/lib/filing/types";

export type ReadTone = "muted" | "success" | "warning";

export type ReadOutcome = {
  kind: "reading" | "read" | "read-check" | "nothing" | "unread" | "failed";
  /** Full sentence, for the upload row. */
  text: string;
  /** Compact form, for the narrow drawer. */
  short: string;
  /** Spoken form, for the live region — no "·", no clause the ear cannot punctuate. */
  speech: string;
  tone: ReadTone;
  /** Reading produced nothing usable, so the row offers Re-upload. */
  reupload: boolean;
};

const TONE_CLASS: Record<ReadTone, string> = {
  muted: "text-muted-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
};

/** Status ink for a tone — `-ink` because these sit on a neutral row, never on a fill. */
export function readToneClass(tone: ReadTone): string {
  return TONE_CLASS[tone];
}

/**
 * The mapping itself, stated over what reading produced rather than over slot shape, so
 * the screen can call it with a result it has in hand before the draft has caught up.
 */
export function readOutcomeFor({
  processing = false,
  error,
  fields,
  poor = false,
  readable,
}: {
  processing?: boolean;
  /** Reading threw — the upload is kept, nothing was parsed. */
  error?: string;
  /** How many fields the parser produced. */
  fields: number;
  /** Engine confidence was low, or the image too small to trust. */
  poor?: boolean;
  /** Whether this document type is one we read at all. */
  readable: boolean;
}): ReadOutcome {
  if (processing) {
    return {
      kind: "reading",
      text: "Reading document…",
      short: "Reading…",
      speech: "reading it now",
      tone: "muted",
      reupload: false,
    };
  }

  if (error) {
    return {
      kind: "failed",
      text: error,
      short: "We couldn’t read this one",
      speech: "we couldn’t read that file. You can type the details in.",
      tone: "warning",
      reupload: true,
    };
  }

  const counted = `${fields} field${fields === 1 ? "" : "s"}`;

  /* Something came out. That is a success however the confidence scored — the honest
     addition for a weak scan is "check it", not "we failed". */
  if (fields > 0) {
    return poor
      ? {
          kind: "read-check",
          text: `Read · ${counted} filled. Worth checking against the document`,
          short: `Read · ${counted} filled. Check them`,
          speech: `read, ${counted} filled in your form. Worth checking them against the document.`,
          tone: "warning",
          reupload: false,
        }
      : {
          kind: "read",
          text: `Read · ${counted} filled in your form`,
          short: `Read · ${counted} filled`,
          speech: `read, ${counted} filled in your form.`,
          tone: "success",
          reupload: false,
        };
  }

  // Nothing came out, and the scan was too weak to read — the genuine failure.
  if (poor) {
    return {
      kind: "unread",
      /* Short on purpose: the Re-upload control sits beside this line and says the
         remedy, and a long sentence squeezes the text column on a phone. */
      text: "We couldn’t read this one",
      short: "We couldn’t read this one",
      speech:
        "we couldn’t read that one. Re-upload a sharper copy, or type the details in later.",
      tone: "warning",
      reupload: true,
    };
  }

  /* Read fine, but this document holds nothing the form asks for — or it is a type we
     never read. Either way the file is stored and the person types the rest. */
  return {
    kind: "nothing",
    text: readable
      ? "Uploaded. Nothing to pre-fill from this one, so type the details in the form"
      : "Uploaded. Nothing to pre-fill from this one",
    short: "Uploaded · nothing to pre-fill",
    speech: "uploaded, nothing to pre-fill from it.",
    tone: "muted",
    reupload: false,
  };
}

/** `null` until a file lands — there is no reading to report on an empty slot. */
export function readOutcome(slot: IntakeSlot): ReadOutcome | null {
  if (!slot.file) return null;
  return readOutcomeFor({
    processing: slot.processing,
    error: slot.error,
    fields: extractedFieldCount(slot),
    poor: slot.poor,
    readable: extractable(slot.docType),
  });
}
