import type { SVGProps } from "react";
import { TextSearch } from "lucide-react";

/**
 * "Find this hearing in the cause list". Trying lucide's stock list-and-magnifier;
 * the hand-drawn list-and-target below is the alternative, swap the export to compare.
 */
export function LocateHearingIcon(props: SVGProps<SVGSVGElement>) {
  return <TextSearch {...props} />;
}

/**
 * Three list lines with a target over them: locating one matter in the list, as
 * distinct from opening the list. Drawn on lucide's 24 grid at its 2px stroke and
 * kept to a handful of marks so it still reads at 14 to 16px.
 */
export function LocateHearingTargetIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 5h13M3 10.5h4M3 16h2" />
    <circle cx="15.5" cy="15.5" r="4.5" />
    <path d="M15.5 8v3M15.5 20v2.5M9 15.5h2M20 15.5h2.5" />
  </svg>;
}
