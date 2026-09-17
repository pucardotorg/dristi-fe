import {
  hearingPartyNames,
  hearingStatusLabel,
  hearingStatusVariant,
  hearingTypeLabel,
  hearingsFile,
  isHearingHeld,
  type Hearing,
  type HearingsFile,
} from "./hearings";
import { ordersFile } from "./orders";
import { dayStamp } from "./peek";
import { formatCaseDate, type CaseRecord } from "./types";

/**
 * A hearing as the PRD records it (§5.4.2, HRG-04 to HRG-12). The list and the
 * detail both read from this one shape, so a value in the list is always a
 * value on the record (HRG-03).
 */
export type HearingRecord = {
  id: string;
  purpose: string;
  /** ISO day, for `<time>` and ordering. */
  on: string;
  date: string;
  status: { label: string; variant: ReturnType<typeof hearingStatusVariant> };
  /** "10:30" style clock strings. Absent until the court has sat. */
  startTime?: string;
  endTime?: string;
  /** Who attended, as one line of text (HRG-08). */
  attendance?: string;
  nextPurpose?: string;
  nextDate?: string;
  /** The order text for this hearing, read off the order (HRG-11). */
  summary?: string;
  /** The order passed in the hearing (HRG-12). */
  order?: { id: string; title: string };
};

/** Newest first (HRG-02). Empty when the case has no hearings on record. */
export function hearingRecords(record: CaseRecord): HearingRecord[] {
  let file: HearingsFile;
  try {
    file = hearingsFile(record);
  } catch {
    return [];
  }
  const peopleById = new Map(file.people.map((person) => [person.id, person]));
  const transcripts = new Map(
    file.transcripts.map((item) => [item.hearingId, item])
  );
  const orders = ordersFile(record).orders.filter(
    (order) => order.status === "published" && order.kind === "order"
  );
  const oldestFirst = file.hearings
    .slice()
    .sort((a, b) => a.on.localeCompare(b.on));

  return oldestFirst
    .map((hearing, index): HearingRecord => {
      const status = hearing.status ?? "scheduled";
      const held = isHearingHeld(hearing);
      const transcript = transcripts.get(hearing.id);
      const next = nextSitting(hearing, oldestFirst.slice(index + 1));
      const order = held
        ? orders.find(
            (item) => dayStamp(item.issuedOn) === dayStamp(hearing.on)
          )
        : undefined;
      return {
        id: hearing.id,
        purpose: hearingTypeLabel(hearing.type),
        on: dayStamp(hearing.on),
        date: formatCaseDate(hearing.on),
        status: {
          label: hearingStatusLabel(status),
          variant: hearingStatusVariant(status),
        },
        startTime: transcript?.startTime,
        endTime: transcript?.endTime,
        attendance: held
          ? hearingPartyNames(hearing, peopleById) || undefined
          : undefined,
        nextPurpose: next ? hearingTypeLabel(next.type) : undefined,
        nextDate: next
          ? formatCaseDate(next.on)
          : hearing.nextOn
            ? formatCaseDate(hearing.nextOn)
            : undefined,
        summary: order?.botd ?? hearing.summary,
        order: order ? { id: order.id, title: order.title } : undefined,
      };
    })
    .reverse();
}

/** The sitting this one was adjourned to: the named date, else the next one. */
function nextSitting(hearing: Hearing, later: Hearing[]): Hearing | undefined {
  if (hearing.nextOn) {
    const named = later.find(
      (item) => dayStamp(item.on) === dayStamp(hearing.nextOn as string)
    );
    if (named) return named;
  }
  return later.find((item) => dayStamp(item.on) > dayStamp(hearing.on));
}
