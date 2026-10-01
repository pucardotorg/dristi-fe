"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CaseHearingsDialog } from "@/components/cases/case-hearings-dialog";
import type { CaseRecord } from "@/lib/cases/types";

/**
 * `?hearing=` opens one hearing in the hearings pop-up over whichever tab the
 * link was on, so closing it leaves the reader where they were. Mounted once
 * for the whole case page.
 */
export function CaseLinkedHearing({ record }: { record: CaseRecord }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hearingId = searchParams.get("hearing");
  const noTrigger = useRef<HTMLAnchorElement | null>(null);

  if (hearingId === null) return null;

  return (
    <CaseHearingsDialog
      key={hearingId}
      record={record}
      open
      initialHearingId={hearingId}
      triggerRef={noTrigger}
      onOpenChange={(open) => {
        if (open) return;
        const next = new URLSearchParams(searchParams);
        next.delete("hearing");
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      }}
    />
  );
}
