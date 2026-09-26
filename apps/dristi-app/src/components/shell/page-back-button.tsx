import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The row that holds the arrow's column and the heading block.
 *
 * The arrow sits on the TITLE's line and centres on it (owner, Sept 21, after
 * trying the seam between two lines): the title is what it takes you back
 * from. The column is one title line tall (`h-8`), so a title that wraps does
 * not pull the arrow down. Pages put the title first in the block so the
 * arrow's column needs no offset.
 */
export const PAGE_BACK_ROW = "flex min-w-0 items-start gap-3";
export const PAGE_BACK_COLUMN = "flex h-8 shrink-0 items-center";

/**
 * A page's way out: the arrow ahead of its heading (View Case, Raise
 * application). One component, because the two were copies of each other.
 *
 * An outlined box at every size (owner, Sept 21: the bare arrow did not read as
 * a control), on the hairline stroke. 32px with an 18px arrow for a mouse; 36px
 * with a 20px arrow under a finger, its target carried to 44px by the inset
 * (40px read as too heavy beside a title). The page sets it in its own column
 * beside the heading block; see `PAGE_BACK_ROW`.
 */
export function PageBackButton({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon-xs"
            asChild
            className={cn(
              // The hairline, not the input border: an edge, kept quiet.
              "relative border-hairline text-foreground after:absolute after:-inset-1",
              "pointer-coarse:size-9",
              className
            )}
          >
            <Link href={href} aria-label={label}>
              {/* Sized on the icon: the Button's own `svg:not([class*=size-])` rule
                  outranks a size set from the parent, which is how the old
                  arrow stayed 12px whatever the wrapper asked for. */}
              <ArrowLeftIcon
                aria-hidden
                className="size-4.5 pointer-coarse:size-5"
              />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
