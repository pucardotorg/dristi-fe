import {
  orderItemStandingText,
  type OrderItemTypeId,
} from "@/lib/employee/order-items";
import {
  browsableTemplates,
  ORDER_GROUPS,
  unavailableReason,
  type OrderCatalogueContext,
  type OrderTemplateFacts,
} from "@/lib/employee/order-templates";

/**
 * The sentences a typist writes every sitting, reachable without typing them.
 *
 * **Three, named by the owner (2026-09-16), and they are the owner's words rather than
 * the court's.** The twenty-seven standing orders come from the court's own catalogue
 * (`order-templates.ts`); these do not come from any source in `docs/product/` — they
 * are the repetition the owner described, written down so the feature has something to
 * complete. A court user has to approve the wording before it reaches one.
 *
 * A phrase is *not* an item of the catalogue: it writes no row under **Pulled into this
 * order** and carries no `data-order-item` mark, because nothing offers to take a
 * sentence back out. That is the same line the disposal sentences sit on — what the
 * catalogue contributed is a direction the court passed; what a typist types is theirs.
 */
export const ORDER_PHRASES: readonly { id: string; text: string }[] = [
  { id: "heard-both-sides", text: "Heard both sides." },
  { id: "none-for-accused", text: "None appeared for the accused." },
  {
    id: "adjourned-on-request",
    text: "At the request of the complainant, the matter is adjourned.",
  },
];

/** What one completion would put in the order, and what to call it while it is offered. */
export type SuggestCandidate = {
  /** `template:<id>` or `phrase:<id>` — what `accept` is asked for. */
  key: string;
  kind: "template" | "phrase";
  /** What the suggestion is called. The live region says this, not the whole passage. */
  label: string;
  /** The words that would land, auto-filled exactly as the catalogue's own row fills them. */
  text: string;
  /** Everything the query is matched against besides the label — see `rankSuggestions`. */
  terms: string;
};

const GROUP_LABEL = new Map(ORDER_GROUPS.map((group) => [group.id, group.label]));

/**
 * Everything "/" can reach on this sitting, in the order the sitting argues for.
 *
 * **One corpus, one auto-fill, one record.** The text is built with the same
 * `orderItemStandingText` pass the catalogue's rows use, so a direction reached by
 * typing and the same direction reached by pressing its row put identical words in the
 * order. Two doors onto one act is defensible; two answers to what an order says is not.
 *
 * The order of the list is the prior: `ranked` is what the sitting argues for
 * (`orderSuggestions` — the purpose, the applications standing, who the bench has just
 * marked absent, what the draft already carries), then the phrases, then the rest of the
 * catalogue. With nothing typed that order is the answer; with something typed it breaks
 * the ties (`rankSuggestions`).
 *
 * Gated templates are left out. The catalogue lists them with the reason they cannot be
 * taken — a silently shorter list is the worse failure there, because the missing order
 * may be the one that mattered — but a completion has no room to say why, and offering
 * one that cannot be passed would put words in the order the case cannot carry.
 */
export function suggestCandidates(
  facts: OrderTemplateFacts | undefined,
  catalogue: OrderCatalogueContext,
  ranked: readonly OrderItemTypeId[],
): SuggestCandidate[] {
  const available = browsableTemplates().filter(
    (template) => unavailableReason(template, catalogue) === null,
  );
  const byId = new Map(available.map((template) => [template.id, template]));
  const templates = [
    ...ranked.flatMap((id) => {
      const template = byId.get(id as never);
      return template ? [template] : [];
    }),
    ...available.filter((template) => !ranked.includes(template.id as never)),
  ];

  return [
    ...templates.map((template) => {
      /* Filled once: this whole list is rebuilt on every keystroke in the editor, and
         the fill is the only part of it that is not a lookup. */
      const text = orderItemStandingText(template.id, facts);
      return {
        key: `template:${template.id}`,
        kind: "template" as const,
        label: template.label,
        text,
        terms: [
          template.label,
          template.workflow ?? "",
          GROUP_LABEL.get(template.group) ?? "",
          text,
        ].join(" "),
      };
    }),
    ...ORDER_PHRASES.map((phrase) => ({
      key: `phrase:${phrase.id}`,
      kind: "phrase" as const,
      label: phrase.text,
      text: phrase.text,
      terms: phrase.text,
    })),
  ].filter((candidate) => candidate.text !== "");
}

/**
 * What answers the words typed so far, best first.
 *
 * **A scored match over the court's corpus, biased by the sitting — not a model.** There
 * is nothing in this build that reads intent from language, and it would be a lie to
 * describe it as though there were. What it does have is four things worth ranking on,
 * and the honest claim is that they are usually enough:
 *
 * 1. the label begins with what was typed — `/bail` wants **Bail**;
 * 2. a word of the label begins with it — `/sum` wants **Issue of summons**;
 * 3. the label contains it anywhere;
 * 4. the standing words contain it — `/bond` finds bail, whose label never says bond.
 *
 * Ties keep the order they came in, which is the sitting's own argument, so on an
 * evidence listing with bail pending `/s` offers the summons that listing is heading
 * for rather than the first summons in the catalogue.
 *
 * Nothing matching returns nothing, and the caller takes the suggestion down: that is
 * how a reader who typed a slash and kept writing gets out of it without a keystroke.
 */
export function rankSuggestions(
  query: string,
  candidates: readonly SuggestCandidate[],
): SuggestCandidate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...candidates];

  const scored = candidates.flatMap((candidate) => {
    const label = candidate.label.toLowerCase();
    const score = label.startsWith(needle)
      ? 4
      : startsAWord(label, needle)
        ? 3
        : label.includes(needle)
          ? 2
          : candidate.terms.toLowerCase().includes(needle)
            ? 1
            : 0;
    return score > 0 ? [{ candidate, score }] : [];
  });

  /* A stable sort, so the sitting's order survives inside a score. */
  return scored
    .map((entry, order) => ({ ...entry, order }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((entry) => entry.candidate);
}

/** Does any word of the label begin with what was typed? */
function startsAWord(label: string, needle: string): boolean {
  return label.split(/\s+/).some((word) => word.startsWith(needle));
}

/**
 * The sentences that finish what is being typed, and the part of each still to come.
 *
 * This is the no-trigger half (owner, 2026-09-16): a typist mid-dictation writes "Heard
 * bo" and the rest of it is offered, so the three sentences they write every sitting
 * cost four characters instead of a slash and a deletion.
 *
 * **Only the phrases, and only from the front.** A standing direction is not completed
 * from prose — nobody types the opening words of "Issue summons to the [Party Type]" by
 * accident, and a template arriving mid-sentence would put brackets in the middle of
 * somebody's writing. And the match is a prefix rather than the scorer used behind the
 * slash: an unasked completion has to be the sentence being written, not the closest
 * thing in the corpus to it.
 *
 * Case is ignored so that a sentence begun in either case still completes, and what
 * comes back is only the *remainder* — the typist's own characters are never rewritten,
 * which is what keeps this from fighting the person using it.
 */
export function phraseCompletions(
  prefix: string,
): { key: string; label: string; ghost: string }[] {
  const needle = prefix.toLowerCase();
  return ORDER_PHRASES.flatMap((phrase) => {
    const sentence = phrase.text;
    if (!sentence.toLowerCase().startsWith(needle)) return [];
    const ghost = sentence.slice(prefix.length);
    return ghost ? [{ key: `phrase:${phrase.id}`, label: sentence, ghost }] : [];
  });
}

/** The words one phrase would add to what has already been typed of it. */
export function phraseRemainder(key: string, prefix: string): string | null {
  const phrase = ORDER_PHRASES.find((entry) => `phrase:${entry.id}` === key);
  if (!phrase) return null;
  if (!phrase.text.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  return phrase.text.slice(prefix.length) || null;
}
