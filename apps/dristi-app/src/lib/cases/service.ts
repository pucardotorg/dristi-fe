/**
 * Notice/Process Status — the feature's name, kept in the module whose name
 * the code has always used for it ("service of process"). The screen's data
 * lives in `process-status.ts`; an older authored pack and its reader that
 * sat here were never rendered and disagreed with the case's own records, so
 * they were removed (Oct 6).
 */

/**
 * What the product calls this, and the one place the words live. This is the
 * legacy portal's own label, kept verbatim at the product owner's direction —
 * the slash and capitals are the feature's name as the registry knows it, not
 * a heading this module is free to sentence-case. Internal identifiers keep
 * "service of process"; renaming files and exports is churn a reader never
 * sees.
 */
export const FEATURE_NAME = "Notice/Process Status";
