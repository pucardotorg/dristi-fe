import { CaseParticipants } from "@/components/cases/case-participants";
import { participantsFile, resolveSelection } from "@/lib/cases/parties";
import { pendingWitnessesFor } from "@/lib/cases/pending-witnesses";
import { partiesLabel, type CaseRecord } from "@/lib/cases/types";
import { viewerAccess, viewerRepresentation } from "@/lib/cases/viewer";

/**
 * The Parties section of the case file.
 *
 * Thin on purpose: the model is built here, on the server, so the authored
 * pack behind it never ships to the browser, and the selection is resolved
 * here too — a `?selected=` naming nobody falls back to the first litigant
 * rather than rendering an empty pane beside a populated list.
 */
export function CaseParties({
  record,
  selectedId,
}: {
  record: CaseRecord;
  selectedId: string | undefined;
}) {
  const file = participantsFile(record);
  return (
    <CaseParticipants
      file={file}
      caseId={record.id}
      /* The side the signed-in advocate works for on THIS case, from the
         record's own counsel lists (office access carries its grant's side).
         Every own-side gate below the fold reads this, so an accused-side
         brief flips the party actions to the accused's chair. */
      viewerSide={viewerRepresentation(record)[0]}
      /* Party actions belong to the advocates on the vakalatnama. A viewer
         who reaches this case through office access reads the same panes
         but gets no removal or PoA controls (owner, Sept 3) — the share
         dialog has said as much since Aug: "Adding and removing people
         belongs to the advocates on the vakalatnama." */
      viewerCanAct={viewerAccess(record).kind === "vakalatnama"}
      /* The viewer's own witness applications already with the magistrate —
         greyed rows in the Witnesses group until the order passes. */
      pendingWitnesses={pendingWitnessesFor(record.id)}
      caseRef={{
        title: partiesLabel(record),
        caseNumber: record.caseNumber,
        court: record.court,
      }}
      selectedId={resolveSelection(file, selectedId)}
      /* Whether the URL names someone, as opposed to the default first row:
         a phone opens the details drawer only for a choice. */
      chosen={selectedId !== undefined}
    />
  );
}
