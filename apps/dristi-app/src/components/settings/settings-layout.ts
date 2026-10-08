/**
 * Where Settings shows its menu beside the page, and where the menu is a page of its own.
 *
 * The product's touch split (`components/cases/cases-layout.ts`, owner, Sept 21): a
 * phone and a touch tablet held upright (iPad Air 820, iPad Pro 1024) get the
 * one-column layout, because an upright iPad with the rail open has a phone's column;
 * a pointer, or a tablet on its side, gets the desk layout. Tailwind has no "or", so
 * each rule is stated twice.
 *
 * One step wider than Cases: `lg`, not `md`. Settings puts a menu column between the
 * rail and the page, and at 820px with the rail open that left the page about 300px,
 * a phone's width with a desktop's furniture around it. From `lg` the page keeps at
 * least 600px beside the menu (iPad Air on its side, 1180px, rail open).
 */

/** The desk layout's pieces: the menu column, and the desk-sized page heading. */
export const DESK_BLOCK = "hidden lg:pointer-fine:block lg:landscape:block";
export const DESK_FLEX = "hidden lg:pointer-fine:flex lg:landscape:flex";

/** The one-column layout's pieces: the menu as a page, and the back arrow. */
export const TOUCH_BLOCK = "lg:pointer-fine:hidden lg:landscape:hidden";
export const TOUCH_FLEX = "flex lg:pointer-fine:hidden lg:landscape:hidden";
