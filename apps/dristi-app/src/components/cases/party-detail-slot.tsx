"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

/** Beside the list from `lg`; under it, the pane has no room of its own. */
const STACKED_QUERY = "(max-width: 1023.98px)";

/**
 * Where a participant's details show.
 *
 * From `lg` they sit beside the list, as before. Under it they used to stack
 * below the whole list, so tapping a name near the top changed something far
 * off screen and the tap looked dead (owner, Sept 21: "I realised it after five
 * minutes"). There they now rise in the bottom drawer the case peek and the
 * People page use: the tap visibly answers, and the list stays where it was.
 *
 * The drawer opens only for a participant the person chose (`?selected=` on the
 * URL), never for the default first row, and closing it takes the choice off
 * the URL.
 */
export function PartyDetailSlot({
  title,
  chosen,
  children,
}: {
  /** The open participant's name, for the drawer's accessible title. */
  title: string;
  /** Whether the URL names a participant, as opposed to the default row. */
  chosen: boolean;
  children: React.ReactNode;
}) {
  const stacked = useMediaQuery(STACKED_QUERY);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (!stacked) {
    return (
      <>
        {/* self-stretch, not h-full: the grid is items-start, so an
            auto-height track would leave the rule measuring itself. */}
        <div className="hidden self-stretch lg:flex lg:justify-center">
          <Separator orientation="vertical" />
        </div>
        {children}
      </>
    );
  }

  return (
    <Drawer
      open={chosen}
      onOpenChange={(next) => {
        if (next) return;
        const rest = new URLSearchParams(params?.toString() ?? "");
        rest.delete("selected");
        const query = rest.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }}
    >
      <DrawerContent
        aria-describedby={undefined}
        className="h-[85dvh] overflow-hidden data-[vaul-drawer-direction=bottom]:max-h-[85dvh]"
        // The ladder's 4 on top of the safe area; inline, because an inline
        // padding beats a class and the inset has to be one.
        style={{
          paddingBottom: "calc(var(--spacing) * 4 + env(safe-area-inset-bottom))",
        }}
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {/* The close control every other bottom drawer carries, top right. The
            pane's own heading starts under it, clear of the button. */}
        <div className="flex shrink-0 justify-end px-2">
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label="Close"
            >
              <XIcon aria-hidden />
            </Button>
          </DrawerClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 @container">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
