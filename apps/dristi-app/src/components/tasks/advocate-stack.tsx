"use client";

import { advocatesOf } from "@/lib/tasks/permissions";
import type { Case, Person } from "@/lib/tasks/types";
import { cn } from "@/lib/utils";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PersonAvatar } from "@/components/tasks/person-avatar";

/**
 * A stack of advocates: the main advocate (first on the vakalatnama) first, then the
 * rest; at most `max` faces and a "+n". One tooltip names them all, main first. The DS
 * `AvatarGroup` supplies the rings; faces are the 32px default under a 4px overlap so
 * two initials stay legible (the 24px size under 8px clips them).
 *
 * By default the stack is the case's advocates, which is what a case row or a hearing
 * card means by it. Pass `advocates` to show a narrower set the caller has worked out —
 * the tasks table's "Who can act" column passes the people who hold that task's acting
 * verb, so the column's heading and its faces answer the same question (2026-09-15).
 */
export function AdvocateStack({
  kase,
  people,
  user,
  advocates,
  label = "Advocates",
  max = 3,
  className,
}: {
  kase: Case;
  people: Person[];
  user: Person;
  /** Override the set shown. Defaults to every advocate on the case. */
  advocates?: Person[];
  /** How the group names itself to a screen reader. */
  label?: string;
  max?: number;
  className?: string;
}) {
  const all = advocates ?? advocatesOf(kase, people);
  const shown = all.slice(0, max);
  const rest = all.length - shown.length;
  const onVakalatnama = (p: Person) => kase.signatories.includes(p.id);
  const names = all.map((p) => (onVakalatnama(p) ? `${p.name} (on the vakalatnama)` : p.name)).join(", ");
  if (!all.length) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <AvatarGroup role="group" aria-label={`${label}: ${names}`} className={cn("w-fit -space-x-1", className)}>
          {shown.map((p) => (
            <PersonAvatar key={p.id} person={p} you={p.id === user.id} size="default" />
          ))}
          {rest > 0 ? (
            <AvatarGroupCount className="bg-surface-sunken text-caption font-medium tabular-nums text-foreground">+{rest}</AvatarGroupCount>
          ) : null}
        </AvatarGroup>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="flex flex-col gap-0.5">
          {all.map((p) => (
            <li key={p.id}>
              {p.name}
              {onVakalatnama(p) ? " · on the vakalatnama" : null}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
