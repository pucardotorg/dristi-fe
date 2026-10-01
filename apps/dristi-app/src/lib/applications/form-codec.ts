/**
 * The Raise application draft as storable data.
 *
 * The draft holds `Date`s and `File`s, neither of which survives JSON. Dates are kept
 * as ISO strings. Files are kept only by name: the bytes stay in memory for the visit
 * (`liveFormOf` in the store), and a draft reopened after a reload says that its
 * attachments need adding again rather than pretending they are still there.
 */
import {
  EMPTY_APPLICATION_DRAFT,
  type ApplicationDraft,
} from "@/lib/cases/application-draft";

type Stored = Record<string, unknown>;

const DATE = "__date";
const FILE = "__file";

function encode(value: unknown): unknown {
  if (value instanceof Date) return { [DATE]: value.toISOString() };
  if (typeof File !== "undefined" && value instanceof File) {
    return { [FILE]: value.name };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, encode(inner)]),
    );
  }
  return value;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !(item && typeof item === "object" && FILE in item))
      .map(decode);
  }
  if (value && typeof value === "object") {
    if (DATE in value) return new Date(String((value as Stored)[DATE]));
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, decode(inner)]),
    );
  }
  return value;
}

export function encodeDraft(draft: ApplicationDraft): unknown {
  return encode(draft);
}

export function decodeDraft(stored: unknown): ApplicationDraft {
  if (!stored || typeof stored !== "object") return EMPTY_APPLICATION_DRAFT;
  return { ...EMPTY_APPLICATION_DRAFT, ...(decode(stored) as Partial<ApplicationDraft>) };
}

/** The names of every file attached anywhere in the draft. */
export function attachedFileNames(draft: ApplicationDraft): string[] {
  const names: string[] = [];
  const walk = (value: unknown) => {
    if (typeof File !== "undefined" && value instanceof File) names.push(value.name);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object" && !(value instanceof Date)) {
      Object.values(value).forEach(walk);
    }
  };
  walk(draft);
  return names;
}

/** Whether a stored draft had attachments that this visit no longer holds. */
export function lostAttachments(stored: unknown): boolean {
  let found = false;
  const walk = (value: unknown) => {
    if (found) return;
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") {
      if (FILE in value) found = true;
      else Object.values(value).forEach(walk);
    }
  };
  walk(stored);
  return found;
}
