/**
 * When a list of cases is a table and when it is cards (owner, Sept 21).
 *
 * Cards: any screen under `md`, and a touch tablet held upright (iPad Air 820,
 * iPad Pro 1024), where eight columns cannot breathe. Table: `md` and up with a
 * mouse, or a touch tablet on its side. Two variants state that, because
 * Tailwind has no "or": `md:pointer-fine:` and `md:landscape:`.
 */

/** On the table, off the cards. */
export const TABLE_ONLY = "hidden md:pointer-fine:block md:landscape:block";

/** On the cards, off the table. */
export const CARDS_ONLY = "md:pointer-fine:hidden md:landscape:hidden";

/** The white frame the table sits in. The cards sit straight on the page. */
export const TABLE_FRAME =
  "md:pointer-fine:rounded-xl md:pointer-fine:border md:pointer-fine:border-hairline md:pointer-fine:bg-card md:pointer-fine:p-6 md:pointer-fine:shadow-raised " +
  "md:landscape:rounded-xl md:landscape:border md:landscape:border-hairline md:landscape:bg-card md:landscape:p-6 md:landscape:shadow-raised";

/** The same rule for JavaScript: true exactly where `TABLE_ONLY` shows. */
export const TABLE_QUERY =
  "(min-width: 768px) and ((pointer: fine) or (orientation: landscape))";
