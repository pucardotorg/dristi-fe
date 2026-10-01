"use client";

import { useId } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FILER_ROLES, type FilerRole } from "@/lib/applications/lifecycle";
import { setSandboxSeat, useSandboxSeat } from "@/lib/applications/store";

/**
 * Sandbox: who the applications flow is being worked as.
 *
 * The lifecycle turns on two facts the build has no session to supply — which role is
 * acting (advocate, clerk, litigant, PoA holder) and which side of the case they are
 * on. This sets both, the same kind of scaffolding as the account menu's "Viewing as",
 * and it applies everywhere the applications flow reads the seat. Labelled as a sandbox
 * on the screen so it is never mistaken for a product control.
 */
export function SandboxSeatControl() {
  const seat = useSandboxSeat();
  const roleId = useId();
  const sideId = useId();
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface-sunken p-3">
      <p className="text-caption font-semibold text-muted-foreground">
        Sandbox · acting as
      </p>
      <div className="flex flex-wrap gap-3">
        <Field className="w-auto min-w-48 gap-1.5">
          <FieldLabel htmlFor={roleId} className="text-caption">
            Role
          </FieldLabel>
          <NativeSelect
            id={roleId}
            value={seat.role}
            onChange={(event) =>
              setSandboxSeat({ ...seat, role: event.target.value as FilerRole })
            }
          >
            {FILER_ROLES.map((role) => (
              <NativeSelectOption key={role.id} value={role.id}>
                {role.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="w-auto min-w-48 gap-1.5">
          <FieldLabel htmlFor={sideId} className="text-caption">
            Side
          </FieldLabel>
          <NativeSelect
            id={sideId}
            value={seat.opposing ? "opposing" : "own"}
            onChange={(event) =>
              setSandboxSeat({ ...seat, opposing: event.target.value === "opposing" })
            }
          >
            <NativeSelectOption value="own">Your side of the case</NativeSelectOption>
            <NativeSelectOption value="opposing">The other side</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
    </div>
  );
}
