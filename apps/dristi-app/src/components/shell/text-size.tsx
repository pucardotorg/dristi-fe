"use client";

import * as React from "react";

import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import {
  isTextSize,
  textScale,
  TEXT_SIZE_KEY,
  type TextSize,
} from "@/lib/settings/preferences";

/** The person's text size, "default" until they choose one. */
export function useTextSize(): TextSize {
  const stored = useLocalStorageValue(TEXT_SIZE_KEY);
  return isTextSize(stored) ? stored : "default";
}

/**
 * Applies the chosen text size to the page root, on every screen (sign-in included),
 * so a person who needs larger text gets it before they reach Settings again.
 */
export function TextSizeRoot() {
  const size = useTextSize();

  React.useEffect(() => {
    const root = document.documentElement;
    if (size === "default") root.style.removeProperty("font-size");
    else root.style.fontSize = textScale(size);
  }, [size]);

  return null;
}
