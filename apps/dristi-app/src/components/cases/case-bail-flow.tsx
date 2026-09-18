"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { DueStatusLine } from "@/components/cases/case-overview-card";
import { BailApplicationDialog } from "@/components/filing/bail-application-dialog";
import {
  BailBondDialog,
  type BondMode,
} from "@/components/filing/bail-bond-dialog";
import {
  BailBondStatusDialog,
  buildBondSigners,
} from "@/components/filing/bail-bond-status-dialog";
import { useLocale } from "@/components/shell/locale";
import { useProfile } from "@/components/shell/profile";
import type { AccessCase } from "@/lib/access/content";
import {
  BOND_ID,
  BOND_LITIGANT,
  BOND_SURETIES,
  BOND_TASK_DUE_ON,
  BOND_THIRD_SURETY,
  bondCopy,
} from "@/lib/filing/content";
import { dueStatusView } from "@/lib/cases/peek";
import { pick } from "@/lib/onboarding/content";
import { Identifier } from "@/components/chrome/identifier";

/**
 * The whole bail lifecycle on a case, held in one place so the header's "Make filings"
 * entries and the in-page lifecycle card share the same state (Mohit's original flow):
 *
 *   raise bail application → magistrate approves with terms → a "task" to raise the bond
 *   with those terms FROZEN → generate the bond → out for signatures → status.
 *
 * "Generate bail bond" from Make filings is the direct entry (nothing frozen). Sureties
 * sign the bond itself from the /bond link.
 */
type BondPhase = "none" | "task" | "signing" | "review";

type CaseBailValue = {
  bondPhase: BondPhase;
  openApplication: () => void;
  openBondDirect: () => void;
  openBondTask: () => void;
  openStatus: () => void;
};

const CaseBailContext = React.createContext<CaseBailValue | null>(null);

export function useCaseBail(): CaseBailValue {
  const value = React.useContext(CaseBailContext);
  if (!value) throw new Error("useCaseBail must be used inside <CaseBailProvider>");
  return value;
}

export function CaseBailProvider({
  accessCase,
  initialBondPhase = "task",
  children,
}: {
  accessCase: AccessCase;
  /** Seeded to "task" for the demo: the magistrate has already approved a bail
   *  application on this case and asked for a bond. */
  initialBondPhase?: BondPhase;
  children: React.ReactNode;
}) {
  const { locale } = useLocale();
  const { accountName } = useProfile();
  const [bailOpen, setBailOpen] = React.useState(false);
  const [bondOpen, setBondOpen] = React.useState(false);
  const [bondMode, setBondMode] = React.useState<BondMode>("direct");
  const [bondStatusOpen, setBondStatusOpen] = React.useState(false);
  const [bondMethod, setBondMethod] = React.useState<"esign" | "upload">("esign");
  const [bondPhase, setBondPhase] = React.useState<BondPhase>(initialBondPhase);

  const suretyNames = [...BOND_SURETIES, BOND_THIRD_SURETY].map((s) => s.name);

  const value = React.useMemo<CaseBailValue>(
    () => ({
      bondPhase,
      // Submitting a bail application sends it to the magistrate; the approval comes
      // back as a bond task with the terms set.
      openApplication: () => setBailOpen(true),
      openBondDirect: () => {
        setBondMode("direct");
        setBondOpen(true);
      },
      openBondTask: () => {
        setBondMode("task");
        setBondOpen(true);
      },
      openStatus: () => setBondStatusOpen(true),
    }),
    [bondPhase],
  );

  return (
    <CaseBailContext.Provider value={value}>
      {children}

      <BailApplicationDialog
        open={bailOpen}
        onOpenChange={setBailOpen}
        accessCase={accessCase}
        locale={locale}
        onSubmitted={() => setBondPhase("task")}
      />

      {/* Remount per mode so each entry (task = frozen terms, direct = editable,
          edit = correct a submitted bond) starts from its own clean state. */}
      <BailBondDialog
        key={bondMode}
        open={bondOpen}
        onOpenChange={setBondOpen}
        accessCase={accessCase}
        locale={locale}
        mode={bondMode}
        onSubmitted={(result) => {
          setBondMethod(result.method);
          setBondPhase(result.method === "esign" ? "signing" : "review");
        }}
      />

      <BailBondStatusDialog
        open={bondStatusOpen}
        onOpenChange={setBondStatusOpen}
        accessCase={accessCase}
        locale={locale}
        signers={buildBondSigners({
          advocateName: accountName,
          litigantName: BOND_LITIGANT.name,
          suretyNames,
          locale,
          advocateSigned: true,
          allSigned: bondMethod === "upload",
        })}
        suretyNames={suretyNames}
        onEdit={() => {
          setBondStatusOpen(false);
          setBondMode("edit");
          setBondOpen(true);
        }}
      />
    </CaseBailContext.Provider>
  );
}

/**
 * Whether the bond lifecycle currently owes the case a Pending-tasks row.
 * Context-tolerant on purpose: Overview calls this to size the card's count,
 * and a surface rendered outside the provider simply has no bond work.
 */
export function useBondTaskVisible(): boolean {
  const value = React.useContext(CaseBailContext);
  return value !== null && value.bondPhase !== "none";
}

/**
 * The bond lifecycle as a row of the Overview's own Pending-tasks card —
 * merged there from a standalone card above the tabs (Aug 31 correction
 * round: one card, the bond task a listing in it). Two shapes, mirroring the
 * card it replaced: the task the magistrate's approval created, then — once
 * a bond exists — its signing/review status. Markup and metrics follow the
 * card's other task rows (`TaskRow` in case-overview) so the merged row is
 * indistinguishable from its authored siblings.
 */
export function BondTaskRow({
  nextHearingOn,
  now,
}: {
  nextHearingOn: string | null | undefined;
  now: number;
}) {
  const { locale } = useLocale();
  const value = React.useContext(CaseBailContext);
  if (!value || value.bondPhase === "none") return null;
  const { bondPhase, openBondTask, openStatus } = value;

  if (bondPhase === "task") {
    return (
      <Item
        role="listitem"
        size="sm"
        className="min-h-10 items-start px-0 hover:bg-transparent"
      >
        <ItemContent className="gap-2">
          <ItemTitle className="line-clamp-none min-w-0 text-body font-medium text-foreground">
            {pick(bondCopy.taskRaiseBond, locale)}
          </ItemTitle>
          <div className="flex min-w-0 flex-col gap-1">
            <DueStatusLine
              {...dueStatusView(BOND_TASK_DUE_ON, nextHearingOn, now)}
            />
            <p className="text-body text-muted-foreground">
              {pick(bondCopy.taskNote, locale)}
            </p>
          </div>
        </ItemContent>
        <ItemActions className="shrink-0 max-sm:basis-full">
          <Button
            type="button"
            variant="outline"
            className="max-sm:w-full"
            onClick={openBondTask}
          >
            {pick(bondCopy.taskRaiseBond, locale)}
          </Button>
        </ItemActions>
      </Item>
    );
  }

  return (
    <Item
      role="listitem"
      size="sm"
      className="min-h-10 items-start px-0 hover:bg-transparent"
    >
      <ItemContent className="gap-2">
        <ItemTitle className="line-clamp-none min-w-0 text-body font-medium text-foreground">
          {pick(bondCopy.bondTypeSurety, locale)}
        </ItemTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">
            {pick(
              bondPhase === "signing"
                ? bondCopy.statusPendingSign
                : bondCopy.statusPendingReview,
              locale,
            )}
          </Badge>
          <Identifier
            value={BOND_ID}
            label="bond number"
            className="text-caption text-muted-foreground"
          />
        </div>
      </ItemContent>
      <ItemActions className="shrink-0 max-sm:basis-full">
        <Button
          type="button"
          variant="outline"
          className="max-sm:w-full"
          onClick={openStatus}
        >
          Open
        </Button>
      </ItemActions>
    </Item>
  );
}
