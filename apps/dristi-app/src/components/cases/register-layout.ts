import { PANEL_CLASS } from "@/components/shell/panel";
import { cn } from "@/lib/utils";

/**
 * The View Case registers on a touch screen (owner, Sept 21): a phone, or a
 * tablet held upright. The Cases page's rule, restated for a register: a table
 * with a mouse or on a tablet's side, one card per row under a finger held
 * upright. A table there either crushed its columns or scrolled sideways inside
 * a card, and the row's one action sat off screen.
 *
 * Tailwind has no "or", so each side is stated twice, as in `cases-layout.ts`.
 */
export const REGISTER_TABLE_ONLY = "hidden md:pointer-fine:block md:landscape:block";
export const REGISTER_CARDS_ONLY = "md:pointer-fine:hidden md:landscape:hidden";

/**
 * One row as a card: white, hairline, the panel's lift. The whole card opens
 * the record through its title's stretched hit area, so it carries no button.
 */
export const REGISTER_CARD = cn(
  PANEL_CLASS,
  "relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors active:bg-accent has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-focus-ring"
);

/** The card's one control: the title, its hit area stretched over the card. */
export const REGISTER_CARD_TITLE =
  "cursor-pointer rounded-sm p-0 text-left text-body-compact font-semibold break-words text-foreground outline-none after:absolute after:inset-0 after:rounded-xl";

/** A fact inside a card that has no record to open (process channels). */
export const REGISTER_CARD_STATIC = cn(
  "flex flex-col gap-3 rounded-lg border border-hairline bg-surface-sunken p-4"
);

/**
 * On a phone a register's controls run edge to edge (owner, Sept 21): packed to
 * the left at their own widths they stopped short of the search field under
 * them and read as unfinished.
 */
/** A `SegmentedControl`: the well spans the row, the segments share it. */
export const REGISTER_SWITCH =
  // The compact pill sizes to its label; stretched segments need it told to
  // fill them, or a small chip floats in a wide well (owner, Sept 21).
  "max-sm:w-full max-sm:[&>*]:flex-1 max-sm:[&>*>span]:w-full";

/** The filter menus: two to a row; the last one, left alone on its row, spans
 *  both (it is the last BUTTON: a search field may follow it). */
export const REGISTER_FILTER_ROW =
  "flex flex-wrap items-center gap-2 max-sm:grid max-sm:grid-cols-2 max-sm:[&>button:nth-child(odd):not(:has(~button))]:col-span-2";

/** True exactly where `REGISTER_CARDS_ONLY` shows, for JavaScript. */
export const REGISTER_CARDS_QUERY =
  "(max-width: 767.98px), ((pointer: coarse) and (orientation: portrait))";

/** How many rows a card list opens with, and how many "Show more" adds. The
 *  Raise application case list's number, so the control behaves one way. */
export const SHOW_MORE_STEP = 20;
