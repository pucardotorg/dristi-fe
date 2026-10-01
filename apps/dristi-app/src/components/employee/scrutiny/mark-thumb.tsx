"use client";

import { FileTextIcon } from "lucide-react";

import { evidencePreviewStyle } from "@/lib/employee/scrutiny/field";
import type { Evidence } from "@/lib/employee/scrutiny/types";
import { useScrutinyCase } from "@/components/employee/scrutiny/scrutiny-case-context";

/**
 * The crop of a marked region — one tile, one geometry, wherever a mark is shown.
 *
 * Only an uploaded image can be cropped: the scans and the generated pages have no
 * bitmap behind them, and they get the same tile with a document glyph rather than
 * disappearing. The affidavit is the most-marked document in the case and used to render
 * as a bare 12px flag with no words at all.
 *
 * The geometry is the row thumbnail's, deliberately — same data type, same rendering.
 * `foundations/elevation` names thumbnails as the hairline exception, which is what keeps
 * a pale scan from bleeding into the well behind it.
 */
export function MarkThumb({ evidence }: { evidence: Evidence }) {
  const { docById } = useScrutinyCase();
  const previewStyle = evidencePreviewStyle(evidence, docById);

  if (previewStyle) {
    return (
      <span
        className="h-8 w-12 shrink-0 rounded-sm border border-hairline bg-muted bg-no-repeat"
        style={previewStyle}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="flex h-8 w-12 shrink-0 items-center justify-center rounded-sm border border-hairline bg-card text-muted-foreground"
      aria-hidden="true"
    >
      <FileTextIcon className="size-4" />
    </span>
  );
}
