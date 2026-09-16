"use client";

import * as React from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * The free-text box every court-side queue carries.
 *
 * One component rather than the same twenty lines on eighteen screens, because the box now
 * has behaviour worth stating once: it filters the list **as it is typed**, and the way
 * back to the whole list is the `×` inside the control. There is no Search button to press
 * any more, so there is no moment where what the officer has typed and what the table is
 * showing disagree.
 *
 * **The clear is the DS's own, not a second button.** `InputGroupAddon align="inline-end"`
 * holding an `InputGroupButton` is how the application-type picker already clears its
 * search, and putting it inside the control keeps it beside what it undoes. It appears
 * only once there is something to clear — a permanent `×` on an empty box is a control
 * that does nothing, and `type="search"` inputs draw their own native one in some browsers
 * only once they hold a value, so this matches what people already expect of the shape.
 * Screens whose "Clear" resets more than the text — a status, a type, a date — keep that
 * button as well; it does a different job and its label says so.
 *
 * The `×` is `icon-xs` (24px) to sit inside a 40px control, which is under the 40×40 floor
 * of ACCESSIBILITY §8 on its own, so it carries a transparent `after:` inset that takes the
 * hit area back to 40×40 without changing what is drawn.
 *
 * `Field` rather than a bare `Label htmlFor` beside an `Input id`: the DS `Input`
 * destructures `id` out of its props and only puts it back through `useFieldControlProps`,
 * which returns nothing when there is no `Field` context — so an `id` handed to an `Input`
 * outside a `Field` is dropped and the label points at an element that does not exist.
 * `Field` supplies the context, and the label and the control agree on one generated id.
 * Upstream DS bug, carried over from the screens this replaces.
 */
export function QueueSearchField({
  label,
  value,
  onChange,
  placeholder,
  className,
  ref,
}: {
  /** Visible and permanent — ACCESSIBILITY §12. A placeholder is a hint, not a label. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** The width this box takes in its filter row. */
  className?: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  const typed = value !== "";

  return (
    <Field className={cn("min-w-0", className)}>
      {/* 14px, not the 16px this label used to carry. A filter's label is chrome above the
          control, not a heading, so it sits at the staff scale (`text-body-compact`) and
          takes its emphasis from the DS label's own `font-medium` — layered against the
          input's regular-weight text rather than shouting a size larger than the data it
          filters (owner, 2026-09-14). */}
      <FieldLabel className="text-body-compact">{label}</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        {/* WebKit draws its own cross inside a search input. Ours has to exist anyway —
            Firefox draws none, the native one is not reliably reachable from the keyboard,
            and it cannot be given an accessible name — so the native one is turned off
            rather than left to sit beside a second cross that does the same thing. */}
        <InputGroupInput
          ref={ref}
          type="search"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="[&::-webkit-search-cancel-button]:appearance-none"
        />
        {typed ? (
          <InputGroupAddon align="inline-end">
            {/* "Clear search", not "Clear ${label}" — the label already reads "Search
                cases", and "Clear search cases" is not a sentence anyone says, which
                matters to voice control (ACCESSIBILITY §9). It deliberately matches the
                empty state's own button, because they do the identical thing, and it
                deliberately differs from the filter row's "Clear filters", because that
                one does more. */}
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => onChange("")}
              className="relative after:absolute after:-inset-2 after:content-['']"
            >
              <XIcon aria-hidden />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}
