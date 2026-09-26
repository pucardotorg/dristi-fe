"use client";

/**
 * Confirm the addressee and the delivery channels before a process order's sentence is
 * written into the order — `PRC-03` of `handovers/process-handover.md`, `ITM-11` of
 * `handovers/order-generation.md`, and the popup the owner asked for (2026-09-26):
 * "create a pop-up to show the name of the accused and their address and allow you to
 * select the channels ... only after they confirm this will the text be added."
 *
 * One dialog, shared by the hearing composer's catalogue (`order-screen.tsx`) and the
 * cognizance composite (`cognizance-order-screen.tsx`) — the same confirmation either
 * door reaches, on the same reasoning `fillPartyVariables` states for the substitution
 * itself: two copies would risk two answers to what the order asks the drafter to
 * confirm.
 *
 * A single stage, not a staged flow (`ui-craft`'s motion reference): there is one
 * decision here, addressees and channels together, so a wizard would only be adding
 * steps between the drafter and a confirmation that fits on one screen.
 */

import * as React from "react";

import { ChromeDialogContent } from "@/components/chrome/app-chrome";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  formatStructuredAddress,
  PROCESS_CHANNELS,
  processVariablesComplete,
  type ProcessVariables,
} from "@/lib/employee/process-variables";

export function OrderVariableDialog({
  open,
  onOpenChange,
  /** What to key the body on — an item id when reopening one, the type when adding.
   *  Keyed the way `ListingApplicationDialog` keys its own body: remounting is what
   *  starts the draft fresh on the values it was just handed, rather than carrying
   *  over whatever a previous confirmation left mid-edit. */
  dialogKey,
  label,
  variables,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogKey: string | null;
  /** The template's own label — "Issue of summons" / "Issue of notice" — as the title. */
  label: string;
  /** `null` while there is nothing to confirm yet; the dialog stays closed either way. */
  variables: ProcessVariables | null;
  onConfirm: (variables: ProcessVariables) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {variables ? (
        <OrderVariableDialogBody
          key={dialogKey}
          label={label}
          variables={variables}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />
      ) : null}
    </Dialog>
  );
}

function OrderVariableDialogBody({
  label,
  variables,
  onOpenChange,
  onConfirm,
}: {
  label: string;
  variables: ProcessVariables;
  onOpenChange: (open: boolean) => void;
  onConfirm: (variables: ProcessVariables) => void;
}) {
  const [draft, setDraft] = React.useState(variables);
  const complete = processVariablesComplete(draft);

  function toggleAddressee(id: string, selected: boolean) {
    setDraft((current) => ({
      ...current,
      addressees: current.addressees.map((addressee) =>
        addressee.id === id ? { ...addressee, selected } : addressee,
      ),
    }));
  }

  function toggleChannel(id: keyof ProcessVariables["channels"], checked: boolean) {
    setDraft((current) => ({
      ...current,
      channels: { ...current.channels, [id]: checked },
    }));
  }

  return (
    <ChromeDialogContent className="flex max-h-[calc(100dvh---spacing(12))] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
      <DialogHeader className="gap-1 border-b border-hairline px-6 py-4 text-left">
        <DialogTitle className="text-title-s font-semibold">{label}</DialogTitle>
        <p className="text-body-compact text-muted-foreground">
          Confirm who this goes to and how it is delivered. The order is written only
          after you confirm.
        </p>
      </DialogHeader>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-caption mb-1 font-semibold text-muted-foreground">
            Send to
          </legend>
          <div className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
            {draft.addressees.map((addressee) => (
              <div key={addressee.id} className="flex min-h-10 items-start gap-2 py-1">
                <Checkbox
                  id={`order-variable-addressee-${addressee.id}`}
                  checked={addressee.selected}
                  onCheckedChange={(checked) =>
                    toggleAddressee(addressee.id, checked === true)
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`order-variable-addressee-${addressee.id}`}
                  className="flex flex-col gap-0.5 font-normal"
                >
                  <span className="text-body-compact font-medium text-foreground">
                    {addressee.name}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {formatStructuredAddress(addressee.address)}
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-caption mb-1 font-semibold text-muted-foreground">
            Delivery channels
          </legend>
          <div className="flex flex-col gap-1 rounded-lg bg-surface-sunken p-3">
            {PROCESS_CHANNELS.map((channel) => (
              <div key={channel.id} className="flex min-h-10 items-center gap-2">
                <Checkbox
                  id={`order-variable-channel-${channel.id}`}
                  checked={draft.channels[channel.id]}
                  onCheckedChange={(checked) =>
                    toggleChannel(channel.id, checked === true)
                  }
                />
                <Label htmlFor={`order-variable-channel-${channel.id}`}>
                  {channel.label}
                </Label>
              </div>
            ))}
          </div>
          {!complete ? (
            <p className="text-caption text-muted-foreground">
              Select at least one addressee and one delivery channel.
            </p>
          ) : null}
        </fieldset>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-hairline px-6 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!complete}
          onClick={() => {
            onConfirm(draft);
            onOpenChange(false);
          }}
        >
          Confirm
        </Button>
      </div>
    </ChromeDialogContent>
  );
}
