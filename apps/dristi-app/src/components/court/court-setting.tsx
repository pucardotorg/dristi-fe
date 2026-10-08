"use client";

import { useCourt } from "@/components/court/court-provider";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  COURT_IDS,
  courtProfile,
  isCourtId,
  type CourtProfile,
} from "@/lib/court/profiles";

/**
 * Settings → Court: which state's court the whole app runs as.
 *
 * Four choice cards rather than a select. The choice re-voices every screen, so each
 * option says what it will change before it is taken — the case number a reader will
 * recognise the state by, and the one thing that is not a renaming (Punjab signs
 * without an oath). A select would hide all of that behind the state's name.
 *
 * The example number is set in the identifier face but not through `Identifier`: that
 * component re-numbers for the *selected* court, and each card has to show its own.
 * Nothing to copy here either — the card is a choice, and a copy control inside a label
 * would be a second action in one hit area.
 */
function describe(profile: CourtProfile): string[] {
  const lines: string[] = [];
  if (!profile.placeholderBrand) lines.push("As designed");
  if (!profile.signWithOath) lines.push("Sign without an oath");
  if (profile.placeholderBrand) lines.push("Placeholder logo");
  return lines;
}

export function CourtSetting() {
  const { court, setCourt } = useCourt();

  return (
    <section
      aria-labelledby="court-setting-title"
      className="flex flex-col gap-4 border-t border-border pt-8"
    >
      <div>
        <h2 id="court-setting-title" className="text-title-s font-semibold">
          Court
        </h2>
        <p className="text-body-compact text-muted-foreground">
          Which state&rsquo;s court the app runs as. It sets the court&rsquo;s name and
          logo, case numbers, fees and documents on every screen.
        </p>
      </div>

      <RadioGroup
        value={court}
        onValueChange={(next) => {
          if (isCourtId(next)) setCourt(next);
        }}
        aria-labelledby="court-setting-title"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {COURT_IDS.map((id) => {
          const profile = courtProfile(id);
          return (
            <FieldLabel key={id} htmlFor={`court-${id}`}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{profile.state}</FieldTitle>
                  <FieldDescription>
                    Case numbers like{" "}
                    <span className="font-mono tabular-nums">{profile.example}</span>
                    {describe(profile).map((line) => (
                      <span key={line}> · {line}</span>
                    ))}
                  </FieldDescription>
                </FieldContent>
                <RadioGroupItem value={id} id={`court-${id}`} />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
    </section>
  );
}
