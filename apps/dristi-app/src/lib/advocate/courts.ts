/** Structured court presentation. Only a trailing court designation is a number;
 * the 24×7 service name must never be interpreted as court 7. */
export function courtIdentity(court: string, explicitNumber?: string | null) {
  const [heading, ...place] = court.split(",");
  const match = heading.trim().match(/^(.*?)(?:\s+(?:No\.?\s*)?)(\d+|[IVX]+)$/i);
  const number = explicitNumber?.trim() || match?.[2] || null;
  const name = match ? [match[1], ...place].join(",") : court;
  return { name, number };
}

/** Demo metadata approved for the prototype; not official court numbers.
 * A few missing values deliberately exercise the N/A presentation. */
export const DEMO_COURT_NUMBERS: Readonly<Record<string, string>> = {
  "24×7 ON Court, Kollam": "1",
  "CJM Court, Kollam": "2",
  "ACJM Court, Kollam": "3",
  "Sessions Court, Kollam": "4",
  "Addl. Sessions I, Kollam": "5",
  "Addl. Sessions II, Kollam": "6",
  "Family Court, Kollam": "7",
  "MACT, Kollam": "8",
  "NI Act Court, Kollam": "9",
};

export function courtNumberFor(court: string, explicitNumber?: string | null) {
  return courtIdentity(court, explicitNumber ?? DEMO_COURT_NUMBERS[court]).number;
}
