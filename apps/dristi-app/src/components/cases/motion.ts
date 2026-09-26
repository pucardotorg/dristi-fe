/**
 * Motion shared by the View Case disclosures (owner, Sept 18): a folder in the
 * Case file tree, a process round, an application's detail.
 *
 * Opening takes 200ms on a strong ease-out, so the content is mostly there in
 * the first third and settles; the reader's eye follows it down from the row
 * they clicked. Closing is quicker, since nobody is waiting to read what is
 * leaving. Height comes from Radix's measured `--radix-collapsible-content-height`
 * (the `collapsible-down/up` keyframes), so nothing here guesses a size.
 * Reduced motion gets the old instant switch.
 */
export const COLLAPSE_MOTION =
  "overflow-hidden ease-[cubic-bezier(0.23,1,0.32,1)] data-open:animate-collapsible-down data-open:duration-200 data-closed:animate-collapsible-up data-closed:duration-150 motion-reduce:animate-none";

const SCROLL_MS = 260;

/** The same ease-out as the disclosure, so the scroll and the opening read as one move. */
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Glide a scroller until `node` sits at its top edge. The target is re-read on
 * every frame because the content under `node` is still growing while this
 * runs, and the scroller can only reach as far as it has grown. A snap here
 * loses the reader; seeing the list travel tells them where their row went.
 */
export function glideToTop(scroller: HTMLElement, node: HTMLElement) {
  const offset = () =>
    node.getBoundingClientRect().top - scroller.getBoundingClientRect().top;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scroller.scrollTop += offset();
    return;
  }

  const from = scroller.scrollTop;
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / SCROLL_MS);
    const target = scroller.scrollTop + offset();
    scroller.scrollTop = from + (target - from) * easeOut(t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
