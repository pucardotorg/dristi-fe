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
 * Under a finger held upright (a phone, or a tablet in portrait) a register's
 * controls run edge to edge (owner, Sept 21): packed to the left at their own
 * widths they stopped short of the search field and read as unfinished. With a
 * mouse, or on a tablet's side, they keep their own widths. Edge to edge is the
 * base; the two `md` variants undo it, because Tailwind has no "or".
 */
/** A `SegmentedControl`: the well spans the row, the segments share it, and the
 *  compact pill (which sizes to its label) is told to fill its segment. */
export const REGISTER_SWITCH =
  "w-full [&>*]:flex-1 [&>*>span]:w-full " +
  "md:pointer-fine:w-fit md:pointer-fine:[&>*]:flex-none md:pointer-fine:[&>*>span]:w-auto " +
  "md:landscape:w-fit md:landscape:[&>*]:flex-none md:landscape:[&>*>span]:w-auto";

/** The filter menus: two to a row; the last one, left alone on its row, spans
 *  both (it is the last BUTTON: a search field may follow it). */
export const REGISTER_FILTER_ROW =
  "grid grid-cols-2 items-center gap-2 [&>button:nth-child(odd):not(:has(~button))]:col-span-2 " +
  "md:pointer-fine:flex md:pointer-fine:flex-wrap md:landscape:flex md:landscape:flex-wrap";

/** The search, where it shares the filter row: first and full width under a
 *  finger, at the row's far end otherwise. */
export const REGISTER_ROW_SEARCH =
  "order-first col-span-2 w-full " +
  "md:pointer-fine:order-none md:pointer-fine:ml-auto md:pointer-fine:w-auto " +
  "md:landscape:order-none md:landscape:ml-auto md:landscape:w-auto";

/** True exactly where `REGISTER_CARDS_ONLY` shows, for JavaScript. */
export const REGISTER_CARDS_QUERY =
  "(max-width: 767.98px), ((pointer: coarse) and (orientation: portrait))";

/** How many rows a card list opens with, and how many "Show more" adds. The
 *  Raise application case list's number, so the control behaves one way. */
export const SHOW_MORE_STEP = 20;
