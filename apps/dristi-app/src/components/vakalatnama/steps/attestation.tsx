"use client";

/**
 * S4 — the witness (#4). A witness is optional. If added, it is a registered notary
 * (searched in the registry) or any other person (whose details are collected).
 */

import * as React from "react";
import { CheckCircle2Icon } from "lucide-react";

import { FormCard, FormRow } from "@/components/filing/form-card";
import { FormField } from "@/components/filing/form-field";
import { TextField, PrefixInput, ComboField } from "@/components/filing/inputs";
import { Segmented } from "@/components/filing/segmented";
import { AddressFields } from "@/components/filing/address-fields";
import { IdUpload } from "@/components/vakalatnama/id-upload";
import { updateVak } from "@/lib/vakalatnama/store";
import { NOTARY_REGISTRY, type Notary } from "@/lib/vakalatnama/data";
import type { Address, Attestation, Vakalatnama, WitnessKind } from "@/lib/vakalatnama/types";
import { Identifier } from "@/components/chrome/identifier";

export function AttestationStep({ vak }: { vak: Vakalatnama }) {
  const a = vak.attestation;
  const set = (patch: Partial<Attestation>) =>
    updateVak(vak.id, (p) => ({ ...p, attestation: { ...p.attestation, ...patch } }));
  const setAddress = (addr: Address) => set({ address: addr });

  const [notaryQuery, setNotaryQuery] = React.useState(a.name);

  return (
    <div className="flex flex-col gap-6">
      <FormCard
        title="Add a witness?"
        description="A witness confirms the signing. It’s optional."
      >
        <FormField label="Witness" asGroup>
          <Segmented
            value={a.hasWitness ? "yes" : "no"}
            onValueChange={(v) => set({ hasWitness: v === "yes" })}
            options={[
              { value: "no", label: "No witness" },
              { value: "yes", label: "Add a witness" },
            ]}
            ariaLabel="Add a witness"
          />
        </FormField>
      </FormCard>

      {a.hasWitness ? (
        <FormCard title="Witness details">
          <FormField label="Type of witness" asGroup>
            <Segmented
              value={a.kind}
              onValueChange={(v) => set({ kind: v as WitnessKind })}
              options={[
                { value: "notary", label: "Registered notary" },
                { value: "other", label: "Other" },
              ]}
              ariaLabel="Type of witness"
            />
          </FormField>

          {a.kind === "notary" ? (
            <>
              <FormField
                label="Find the notary"
                asGroup
                help="Search the registered notaries."
              >
                <ComboField
                  value={notaryQuery}
                  onChange={setNotaryQuery}
                  items={NOTARY_REGISTRY}
                  itemKey={(n) => (n as Notary).registration}
                  itemLabel={(n) => (n as Notary).name}
                  renderItem={(n) => {
                    const nt = n as Notary;
                    return (
                      <div className="flex w-full flex-col">
                        <span className="text-body-compact">{nt.name}</span>
                        <span className="text-caption text-muted-foreground">
                          {/* A combobox row is an option — no control nested inside it. */}
                          <Identifier
                            value={nt.registration}
                            label="registration number"
                            copyable={false}
                          />
                          <span aria-hidden> · </span>
                          {nt.place}
                        </span>
                      </div>
                    );
                  }}
                  onSelect={(n) => {
                    const nt = n as Notary;
                    set({ name: nt.name, registration: nt.registration });
                    setNotaryQuery(nt.name);
                  }}
                  placeholder="Search by name or registration number"
                  emptyLabel="No matching notary found."
                  ariaLabel="Search registered notaries"
                />
              </FormField>

              {a.registration ? (
                <div className="flex items-center gap-3 rounded-lg bg-surface-sunken p-3">
                  <CheckCircle2Icon aria-hidden className="size-5 shrink-0 text-success-ink" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-body-compact">{a.name}</span>
                    <Identifier
                      value={a.registration}
                      label="registration number"
                      className="self-start text-caption text-muted-foreground"
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <FormRow>
                <FormField label="Name" required>
                  <TextField
                    value={a.name}
                    onChange={(v) => set({ name: v })}
                    placeholder="Witness’s full name"
                    autoComplete="name"
                  />
                </FormField>
                <FormField label="Relation" required help="How they know the party.">
                  <TextField
                    value={a.relation}
                    onChange={(v) => set({ relation: v })}
                    placeholder="e.g. colleague, neighbour"
                  />
                </FormField>
              </FormRow>

              <FormField label="Mobile number" required>
                <PrefixInput
                  prefix="+91"
                  value={a.mobile}
                  onChange={(v) => set({ mobile: v.replace(/\D/g, "").slice(0, 10) })}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  className="max-w-xs"
                />
              </FormField>

              <FormField label="ID card" required help="Proof of the witness’s identity.">
                <IdUpload value={a.idDoc} onChange={(v) => set({ idDoc: v })} />
              </FormField>

              <div className="flex flex-col gap-2">
                <span className="text-body-compact font-medium">Address</span>
                <AddressFields value={a.address} onChange={setAddress} idPrefix="vak-witness" />
              </div>
            </>
          )}
        </FormCard>
      ) : null}
    </div>
  );
}
