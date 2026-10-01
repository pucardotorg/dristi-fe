"use client";

/** S1 — the litigant the vakalatnama is from. Individual, or organisation via signatory. */

import * as React from "react";

import { FormCard, FormRow } from "@/components/filing/form-card";
import { FormField } from "@/components/filing/form-field";
import { TextField, OptionSelect, PrefixInput } from "@/components/filing/inputs";
import { Segmented } from "@/components/filing/segmented";
import { AddressFields } from "@/components/filing/address-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { IdUpload } from "@/components/vakalatnama/id-upload";
import { updateVak } from "@/lib/vakalatnama/store";
import type { Address, Executant, Vakalatnama } from "@/lib/vakalatnama/types";

const RELATIONS = ["S/o", "D/o", "W/o"];

export function ExecutantStep({ vak }: { vak: Vakalatnama }) {
  const e = vak.executant;
  const set = (patch: Partial<Executant>) =>
    updateVak(vak.id, (p) => ({ ...p, executant: { ...p.executant, ...patch } }));
  const setAddress = (addr: Address) => set({ address: addr });

  return (
    <div className="flex flex-col gap-6">
      {vak.creatorRole === "litigant" ? (
        <Alert>
          <InfoIcon aria-hidden />
          <AlertTitle>Filed as yourself</AlertTitle>
          <AlertDescription>
            You are the litigant on this vakalatnama. Your details are yours to confirm and
            edit — nothing is filled from another party.
          </AlertDescription>
        </Alert>
      ) : null}

      <FormCard
        title="Who is appointing the advocate?"
        description="The litigant this vakalatnama is from."
      >
        <FormField label="Executant" asGroup>
          <Segmented
            size="compact"
            value={e.kind}
            onValueChange={(v) => set({ kind: v })}
            options={[
              { value: "individual", label: "An individual" },
              { value: "organisation", label: "An organisation" },
            ]}
            ariaLabel="Executant kind"
          />
        </FormField>

        {e.kind === "individual" ? (
          <>
            <FormRow>
              <FormField label="Full name" required>
                <TextField
                  value={e.name}
                  onChange={(v) => set({ name: v })}
                  placeholder="As on record"
                  autoComplete="name"
                />
              </FormField>
              <FormField label="Age" required>
                <TextField
                  value={e.age}
                  onChange={(v) => set({ age: v.replace(/\D/g, "").slice(0, 3) })}
                  placeholder="Years"
                  inputMode="numeric"
                  className="max-w-32"
                />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Relation" optional>
                <OptionSelect
                  value={e.relationType}
                  onValueChange={(v) => set({ relationType: v as Executant["relationType"] })}
                  options={RELATIONS}
                  placeholder="S/o · D/o · W/o"
                />
              </FormField>
              <FormField label="Relation name" optional>
                <TextField
                  value={e.relationName}
                  onChange={(v) => set({ relationName: v })}
                  placeholder="Father / husband’s name"
                />
              </FormField>
            </FormRow>
          </>
        ) : (
          <>
            <FormField label="Organisation name" required>
              <TextField
                value={e.orgName}
                onChange={(v) => set({ orgName: v })}
                placeholder="e.g. a bank or company"
              />
            </FormField>
            <FormRow>
              <FormField
                label="Authorised signatory"
                required
                help="The person who signs for the organisation."
              >
                <TextField
                  value={e.signatoryName}
                  onChange={(v) => set({ signatoryName: v })}
                  placeholder="Name"
                  autoComplete="name"
                />
              </FormField>
              <FormField label="Designation" optional>
                <TextField
                  value={e.signatoryDesignation}
                  onChange={(v) => set({ signatoryDesignation: v })}
                  placeholder="e.g. Manager"
                />
              </FormField>
            </FormRow>
          </>
        )}

        <FormRow>
          <FormField
            label="Mobile number"
            required
            help="The signing OTP is sent to this number."
          >
            <PrefixInput
              prefix="+91"
              value={e.mobile}
              onChange={(v) => set({ mobile: v.replace(/\D/g, "").slice(0, 10) })}
              placeholder="10-digit mobile"
              inputMode="numeric"
              autoComplete="tel-national"
            />
          </FormField>
          <FormField label="ID card" required help="Proof of identity for the signer.">
            <IdUpload value={e.idDoc} onChange={(v) => set({ idDoc: v })} />
          </FormField>
        </FormRow>
      </FormCard>

      <FormCard title="Address" description="The litigant’s address for the record.">
        <AddressFields value={e.address} onChange={setAddress} idPrefix="vak-exec" />
      </FormCard>
    </div>
  );
}
