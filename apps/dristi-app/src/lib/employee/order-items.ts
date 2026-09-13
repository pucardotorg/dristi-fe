/**
 * The orders a day-order can carry — now the court's catalogue, not this app's.
 *
 * This file used to hold seventeen English sentences written here, with a comment saying
 * so: *"The standing words are this app's, not a court's. No template library was given
 * to us."* One was given to us on 2026-09-13. The words now come from
 * `order-templates.ts`, which transcribes the court's own twenty-seven templates, and
 * this module is the thin layer between that catalogue and the draft the composer holds.
 *
 * **What an order opens on is its BOTD line, unfilled.** None of the twenty-seven
 * templates references a general variable, so there is nothing to auto-fill on arrival:
 * an order opens on the court's sentence with its own slots still standing — `[Party
 * Name]`, `[Amount]`, `[Date]`. That is the source's design and not a shortfall. Which
 * party is summoned and what a cost is set at are choices, and the spec is explicit that
 * the system cannot make them: *"The system cannot fill a variable when it requires a
 * choice among multiple options."* The old build wrote "Issue summons to Anand Traders"
 * and read as finished while nobody had chosen anything.
 */

import type { RichTextValue } from "@/components/cases/rich-text-field";

import {
  orderTemplate,
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

/** The words an order opens on: its BOTD line. Empty where the source gives none. */
export function orderItemStandingText(id: OrderItemTypeId): string {
  if (id === "others") return "";
  try {
    return orderTemplate(id).botd;
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
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return { html: `<p>${escaped}</p>`, text: value };
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

/** An order of this type, opened on the court's words for it. */
export function createOrderItem(
  type: OrderItemTypeId,
  id: string = nextOrderItemId(),
): OrderItemDraft {
  return { id, type, text: richTextFromPlain(orderItemStandingText(type)) };
}
