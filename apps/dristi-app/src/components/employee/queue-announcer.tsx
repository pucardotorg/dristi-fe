"use client";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

/**
 * How much of a queue is showing, for someone who cannot see it.
 *
 * The footer prints the same sentence on screen, and it used to be the live region as
 * well. That worked while a Search button was the only thing that changed the count. Now
 * the list filters as it is typed, and the footer is the wrong place for the announcement
 * twice over:
 *
 * - **It goes away.** The footer is not rendered when nothing matches, so the one moment
 *   worth announcing — the query that just emptied the list — was announced by nothing. A
 *   live region has to be in the DOM *before* the change to be reliably read out at all, so
 *   this one is mounted for every state of the list, including the empty one.
 * - **It fired on every keystroke.** Assistive tech would read the count once per letter.
 *
 * So the sentence waits for a pause. The *filtering* does not — the table redraws on the
 * keystroke as everyone else sees it, and only the spoken copy is held back until the
 * typing stops. Half a second is roughly two characters of ordinary typing: long enough
 * that a word is announced once, short enough that it still feels like an answer.
 *
 * Kept out of the accessibility tree's visual half with `sr-only`, because the visible
 * count is right there and unchanged.
 */

/** A pause long enough to mean "done typing", short enough to still feel like a reply. */
const QUIET_MS = 500;

export function QueueAnnouncer({
  from,
  to,
  total,
}: {
  /** First row showing, 1-based. Ignored when `total` is 0. */
  from: number;
  to: number;
  total: number;
}) {
  /* The same words the footer prints, so what is spoken and what is drawn agree. The
     empty case has no footer to agree with, and says the thing the empty panel says. */
  const sentence =
    total === 0 ? "No results." : `Showing ${from}–${to} of ${total}.`;
  const settled = useDebouncedValue(sentence, QUIET_MS);

  return (
    <p aria-live="polite" className="sr-only">
      {settled}
    </p>
  );
}
