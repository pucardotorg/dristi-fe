/**
 * The three things every rail page has to agree on, stated once (owner, Sept 21:
 * Cases and People sat 32px off the rail while Vakalatnama and Raise application
 * floated in a centred column, and the headings came in two sizes).
 *
 * Content starts at the gutter on every page. A page may cap how wide its body
 * grows, but it does not centre itself: the heading's left edge is the same
 * place whichever rail item was clicked.
 */

/** The page's inset from the rail and the top bar. */
export const PAGE_GUTTER = "p-6 md:p-8";

/** The warm muted ground white panels stand off. Dark keeps its own background. */
export const PAGE_GROUND = "bg-muted dark:bg-background";

/** The line under a page heading: People's size, one step under body. */
export const PAGE_SUBTITLE = "text-body-compact text-pretty text-muted-foreground";

/** The page heading: View Case's size, on every page. */
export const PAGE_TITLE = "text-title font-semibold";
