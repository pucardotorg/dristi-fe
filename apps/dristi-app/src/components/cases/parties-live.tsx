"use client";

/**
 * Session-local additions to the Parties list.
 *
 * Adding an advocate is an immediate act — they can work the case as soon as
 * the vakalatnama is on record — so the list should say so without waiting
 * for a backend that does not exist yet. The provider holds what this
 * session added; the wells component renders those advocates into the
 * Representation section, in the same well every advocate on record gets
 * (removal entry included). This replaced the done stage's "the Parties
 * list does not update yet" banner (PM, Sept 2): the list now updates.
 *
 * State is session-local by design — a refresh returns to the record. The
 * seam is the participants service: once additions land there, the server
 * renders them and this file goes.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { RepresentationWell } from "@/components/cases/representation-well";
import type { CaseRef } from "@/components/cases/party-application";
import { displayName } from "@/lib/cases/names";

type AddedAdvocates = { names: string[]; partyIds: string[] };

/** A PoA application this session sent — the holder waits on the order. */
type PendingPoa = { partyId: string; holder: string };

type PartiesLive = {
  added: AddedAdvocates[];
  addAdvocates: (names: string[], partyIds: string[]) => void;
  /** Witness applications this session sent — names waiting on the order. */
  pendingWitnesses: string[];
  addWitnesses: (names: string[]) => void;
  pendingPoa: PendingPoa[];
  addPoaHolder: (partyId: string, holder: string) => void;
};

const PartiesLiveContext = createContext<PartiesLive | null>(null);

export function PartiesLiveProvider({ children }: { children: ReactNode }) {
  const [added, setAdded] = useState<AddedAdvocates[]>([]);
  const [pendingWitnesses, setPendingWitnesses] = useState<string[]>([]);
  const [pendingPoa, setPendingPoa] = useState<PendingPoa[]>([]);
  return (
    <PartiesLiveContext.Provider
      value={{
        added,
        addAdvocates: (names, partyIds) =>
          setAdded((current) => [...current, { names, partyIds }]),
        pendingWitnesses,
        addWitnesses: (names) =>
          setPendingWitnesses((current) => [...current, ...names]),
        pendingPoa,
        addPoaHolder: (partyId, holder) =>
          setPendingPoa((current) => [...current, { partyId, holder }]),
      }}
    >
      {children}
    </PartiesLiveContext.Provider>
  );
}

/** Null outside the provider, so callers can no-op rather than crash. */
export function usePartiesLive(): PartiesLive | null {
  return useContext(PartiesLiveContext);
}

/**
 * The tail of the Witnesses group in the master list: applications that are
 * out but not yet ordered — authored seeds plus whatever this session sent —
 * and the group's empty note when there is truly nothing.
 *
 * A sent application must SHOW here (owner, Sept 3): the register saying
 * "no witness" right after the flow said "sent to the magistrate" reads as
 * the system losing the application. The name rides greyed with the wait
 * named on it, and is no link — there is no register entry to open yet.
 * Own side only: these are the viewer's own applications; the other side's
 * unheard applications are never visible.
 */
export function WitnessListExtras({
  registeredCount,
  authoredPending,
}: {
  registeredCount: number;
  authoredPending: string[];
}) {
  const live = usePartiesLive();
  const pending = [...authoredPending, ...(live?.pendingWitnesses ?? [])];

  if (registeredCount === 0 && pending.length === 0) {
    return (
      <li>
        <p className="text-body-compact text-muted-foreground">
          No witness has been listed yet.
        </p>
      </li>
    );
  }

  return (
    <>
      {pending.map((name, i) => (
        <li key={`${name}-${i}`}>
          <div className="flex min-h-12 min-w-0 items-center gap-3 rounded-md px-3 py-2">
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
              {/* The master row's own grammar, in muted ink: this person is
                  not on the register yet, and the row does not open. */}
              <span className="block max-w-full text-body-compact font-semibold text-muted-foreground">
                {displayName(name)}
              </span>
              <Badge variant="warning">Awaiting order</Badge>
            </span>
          </div>
        </li>
      ))}
    </>
  );
}

/**
 * A "Power of attorney" section for a party whose PoA application is out —
 * the party had no holder, so the server rendered no section; this one
 * appears the moment the application is sent and shows the named holder
 * waiting on the order, in the pane's own section grammar. Renders null
 * until then, so it costs the layout nothing.
 */
export function LivePoaPendingSection({ partyId }: { partyId: string }) {
  const live = usePartiesLive();
  const holders = (live?.pendingPoa ?? [])
    .filter((entry) => entry.partyId === partyId)
    .map((entry) => entry.holder);
  if (holders.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h4 className="text-caption font-semibold text-muted-foreground">
        Power of attorney
      </h4>
      <div className="grid min-w-0 items-start gap-2">
        {holders.map((holder) => (
          <div
            key={holder}
            className="flex min-h-12 min-w-0 flex-col justify-center gap-1 rounded-md bg-surface-sunken px-3 py-2"
          >
            <span className="block truncate text-body-compact font-medium text-muted-foreground">
              {holder}
            </span>
            <span className="block truncate text-caption text-muted-foreground">
              Application sent · awaiting order
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The advocates this session added for a party, appended to their
 * Representation section in the same grammar the record's advocates use.
 */
export function LiveAdvocateWells({
  partyId,
  partyName,
  caseRef,
}: {
  partyId: string;
  partyName: string;
  caseRef: CaseRef;
}) {
  const live = usePartiesLive();
  if (!live) return null;
  const names = live.added
    .filter((entry) => entry.partyIds.includes(partyId))
    .flatMap((entry) => entry.names);
  if (names.length === 0) return null;
  return (
    <>
      {names.map((name) => (
        <RepresentationWell
          key={name}
          advocate={name}
          partyName={partyName}
          caseRef={caseRef}
        />
      ))}
    </>
  );
}
