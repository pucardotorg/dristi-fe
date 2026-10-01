import { cn } from "@/lib/utils";

/**
 * A small ring that fills clockwise with a share — the Gmail "setup 55% complete" mark.
 *
 * **Not a DS primitive.** The design system's `Progress` is a linear bar; it has no ring,
 * and the token gate forbids hand-writing into `components/ui/`. So this is a screen-level
 * composition, kept deliberately tiny and drawn only in tokens (`stroke-track` for the
 * groove — the DS names `track` for exactly this, tiny countable marks — and
 * `stroke-primary` for the fill), and it is logged as a request against the DS in
 * `docs/design/ds-requests.md`. When a ring lands upstream, this file is deleted.
 *
 * Decorative: the number beside it is the value, so the ring is `aria-hidden`. Geometry
 * is a 20px box with a 2px stroke, so it sits on the caption line without lifting it.
 */
export function CompletionRing({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const share = Math.max(0, Math.min(100, percent)) / 100;
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn("size-5 shrink-0 -rotate-90", className)}
    >
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        strokeWidth="2"
        className="stroke-track"
      />
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - share)}
        className="stroke-primary transition-[stroke-dashoffset]"
      />
    </svg>
  );
}
