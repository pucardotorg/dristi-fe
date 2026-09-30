"use client";

import { SectionNotice } from "@/components/filing/notices";

/**
 * The one sentence the flow says about machine-read values, wherever they appear.
 *
 * Shown only while something on the record in front of the person is still amber —
 * checking or correcting those fields retires it on its own, so there is nothing to
 * dismiss and nothing to remember on the draft.
 */
export function PrefillNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <SectionNotice variant="info">
      Highlighted fields were read from your documents. Use the source button beside a
      field to see where it came from.
    </SectionNotice>
  );
}
