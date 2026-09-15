/**
 * The orders a day-order can carry — now the court's catalogue, not this app's.
 *
 * This file used to hold seventeen English sentences written here, with a comment saying
 * so: *"The standing words are this app's, not a court's. No template library was given
 * to us."* One was given to us on 2026-09-13. The words now come from
 * `order-templates.ts`, which transcribes the court's own twenty-seven templates, and
 * this module is the thin layer between that catalogue and the draft the composer holds.
 *
 * **What an order opens on is its BOTD line with the auto-fill pass run over it.**
 * *(Corrected 2026-09-14. This comment used to say none of the twenty-seven references a
 * general variable and there was therefore nothing to fill — read off the six* name *rows
 * of the spec's general-variables table, which has thirteen. `[Application Number]`,
 * `[Hearing Purpose]` and the hearing dates are general or context variables and they are
 * all over the catalogue.)*
 *
 * What is still **not** filled, and this part of the old comment stands: which party is
 * summoned and what a cost is set at are choices, and the spec is explicit that the
 * system cannot make them — *"The system cannot fill a variable when it requires a choice
 * among multiple options."* The old build wrote "Issue summons to Anand Traders" and read
 * as finished while nobody had chosen anything, so `[Party Type]`, `[Party Name]`,
 * `[Amount]` and the discretionary dates keep their brackets and wait for D31's fields.
 */

import type { RichTextValue } from "@/components/cases/rich-text-field";

import {
  fillGeneralVariables,
  orderTemplate,
  type OrderTemplateFacts,
  type OrderTemplateId,
} from "./order-templates";

/**
 * A chosen order, or the one escape from the catalogue.
 *
 * `others` is **not** in the court's catalogue and is marked here rather than smuggled
 * into it. It is what a sitting passed that the twenty-seven have no name for, and the
 * composer needs it because a day the catalogue cannot describe still has to be
 * recorded. How often a typist reaches for it is a reading on the catalogue, not on the
 * typist — if it is often, the catalogue is short and that is worth telling product.
 */
export type OrderItemTypeId = OrderTemplateId | "others";

export function isOrderItemTypeId(value: string): value is OrderItemTypeId {
  if (value === "others") return true;
  try {
    orderTemplate(value as OrderTemplateId);
    return true;
  } catch {
    return false;
  }
}

export function orderItemLabel(id: OrderItemTypeId): string {
  if (id === "others") return "Others";
  try {
    return orderTemplate(id).label;
  } catch {
    return id;
  }
}

/**
 * The words an order opens on: its BOTD line, with the auto-fill pass run over it.
 *
 * **`facts` is what makes this the spec's step 3 rather than a paste of the template.**
 * The spec's resolution order is explicit — the judge selects a type, the system loads
 * the template, *then* "general variables and context variables are filled in", and only
 * what is left becomes a field the judge answers. Without facts this returns the raw
 * template, which is what an order opened on until 2026-09-14 and what
 * `orderItemStandingText(id)` still means for callers that have no case in hand (the
 * catalogue tests, and anything asking "what does this template say").
 *
 * What cannot be resolved stays standing as its own bracketed token — see
 * `fillGeneralVariables`. That is the whole reason auto-fill is safe to do at all: it
 * never has to decide between a value and a blank, because an unresolved slot keeps its
 * name and stays visible in the place the value goes.
 */
export function orderItemStandingText(
  id: OrderItemTypeId,
  facts?: OrderTemplateFacts,
): string {
  if (id === "others") return "";
  try {
    const botd = orderTemplate(id).botd;
    return facts ? fillGeneralVariables(botd, facts) : botd;
  } catch {
    return "";
  }
}

/**
 * The plain sentence as the editor's own markup.
 *
 * The same escape the citizen side makes for the same reason (`lib/cases/
 * application-draft.ts`); the two do not share a function because `/employee` does not
 * import from there (`content.ts`).
 */
export function richTextFromPlain(value: string): RichTextValue {
  if (!value) return { html: "", text: "" };
  return { html: `<p>${escapeText(value)}</p>`, text: value };
}

/** The same escape, reachable on its own: a sentence is matched inside existing markup
 *  in the escaped form the editor holds it in, not in the plain form it was written
 *  in. */
function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Join what a template contributes onto what the order already says.
 *
 * A blank line between passages, not a space: the templates are whole directions and
 * running two of them into one paragraph would make the court say something neither of
 * them says. An empty side returns the other unchanged, so inserting `others` — which
 * has no standing words — leaves the box exactly as the typist left it.
 *
 * `text` is joined on the plain side and `html` on the markup side, because the two
 * halves answer different questions (`RichTextValue`): the markup is what the editor
 * shows, the text is what "has anything been written" is measured on.
 */
export function appendRichText(
  current: RichTextValue,
  addition: RichTextValue,
): RichTextValue {
  if (!addition.text && !addition.html) return current;
  if (!current.text && !current.html) return addition;
  return {
    html: `${current.html}${addition.html}`,
    text: `${current.text}\n\n${addition.text}`,
  };
}

/**
 * Write a generated sentence into the passage, replacing the version of it already
 * there.
 *
 * A disposal is generated from a decision the bench made — "The application of the
 * accused for bail (CMP/312/2026) is allowed." — and a decision can be made twice: the
 * typist opens the answered row, looks at the application again, and dismisses what they
 * had allowed. Appending blindly would leave the order carrying both sentences, which is
 * a court record contradicting itself; skipping the second would leave it carrying the
 * wrong one. So the earlier wordings are passed in and the new sentence takes their
 * place, wherever they sit in the passage.
 *
 * `supersedes` carries every wording the same fact could have had, the new one included
 * — a second press of the same answer must not duplicate the sentence it already wrote.
 *
 * Only the sentence is swapped, not the paragraph around it, so a disposal the typist
 * has moved into a list or joined onto their own words keeps that shape. The limit of
 * that is stated rather than papered over: a sentence whose *words* have been edited no
 * longer matches, and a later change of decision appends a fresh one instead of
 * correcting the typist's own text. Rewriting a sentence somebody has taken over is the
 * worse failure of the two.
 */
export function upsertRichTextSentence(
  current: RichTextValue,
  sentence: string,
  supersedes: readonly string[],
): RichTextValue {
  for (const earlier of supersedes) {
    if (!earlier || !current.text.includes(earlier)) continue;
    return {
      html: current.html.split(escapeText(earlier)).join(escapeText(sentence)),
      text: current.text.split(earlier).join(sentence),
    };
  }
  return appendRichText(current, richTextFromPlain(sentence));
}

/** One order in the draft: what it is, and the words it carries. */
export type OrderItemDraft = {
  id: string;
  type: OrderItemTypeId;
  text: RichTextValue;
};

/*
 * Ids only have to be unique inside one listing's draft, and the drafts die on a reload
 * (`order-drafts.ts`), so a counter is enough and it keeps the module testable — no clock
 * and no randomness in a value the editor is keyed on.
 */
let sequence = 0;

export function nextOrderItemId(): string {
  sequence += 1;
  return `order-item-${sequence}`;
}

/**
 * An order of this type, opened on the court's words for it with what the screen knows
 * already filled in.
 *
 * `facts` is optional so the catalogue can still be asked what a template *says*
 * independently of any case. Every caller that is composing a real order passes them —
 * an order that opens on `[Application Number]` when the application is on the screen
 * beside it is the screen making the typist retype what it already holds.
 */
export function createOrderItem(
  type: OrderItemTypeId,
  id: string = nextOrderItemId(),
  facts?: OrderTemplateFacts,
): OrderItemDraft {
  return {
    id,
    type,
    text: richTextFromPlain(orderItemStandingText(type, facts)),
  };
}
