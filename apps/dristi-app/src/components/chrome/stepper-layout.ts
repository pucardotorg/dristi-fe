import { cn } from "@/lib/utils";

/**
 * The journey stepper as registration draws it, stated once so every stepped
 * page uses the same one (owner, Sept 21: the vakalatnama wizard's bare DS
 * stepper crammed six names under six circles on a phone).
 *
 * Circles centred over their names, the connector a hairline running circle to
 * circle. Below `md` the names drop away: six of them do not fit a phone (the
 * Malayalam collides even at caption size), so the page names the current step
 * on one line under the row instead. `STEP_CAPTION` styles that line.
 */
export const CENTRED_STEPPER = cn(
  "w-full",
  "[&_[data-slot=stepper-item]]:items-center",
  "[&_[data-slot=stepper-item]>div:first-child]:relative [&_[data-slot=stepper-item]>div:first-child]:justify-center",
  "[&_[data-slot=stepper-connector]]:absolute [&_[data-slot=stepper-connector]]:top-4 [&_[data-slot=stepper-connector]]:left-[calc(50%+1rem)] [&_[data-slot=stepper-connector]]:mx-0 [&_[data-slot=stepper-connector]]:h-px [&_[data-slot=stepper-connector]]:w-[calc(100%-2rem)]",
  "[&_[data-slot=stepper-item]>div:last-child]:w-full [&_[data-slot=stepper-item]>div:last-child]:pr-0 [&_[data-slot=stepper-item]>div:last-child]:text-center",
  "max-md:[&_[data-slot=stepper-item]>div:last-child]:hidden"
);

/** The one line that names the current step where the names are hidden. */
export const STEP_CAPTION = "mt-3 text-center text-caption text-muted-foreground md:hidden";
