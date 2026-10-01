"use client";

import * as React from "react"

import { TRANSCRIPT_FALLBACK } from "@/lib/employee/scrutiny/sections"
import { canSaveDraft, isCorrected } from "@/lib/employee/scrutiny/field"
import type {
  BundleTool,
  Draft,
  Evidence,
  FlagMap,
  LinkedDoc,
  Rect,
  ScrutinyCase,
  ScrutinyLookups,
} from "@/lib/employee/scrutiny/types"

/** Which control gets the caret when the composer opens — resolved once. */
export type PendingFocus = "correction" | "note" | null

export interface ScrutinyState {
  flags: FlagMap
  selectedId: string | null
  composeField: string | null
  draft: Draft | null
  tool: BundleTool
  /** Field id the next drawn box attaches to, silently. */
  evidenceTarget: string | null
  pendingFocus: PendingFocus
}

const EMPTY: ScrutinyState = {
  flags: {},
  selectedId: null,
  composeField: null,
  draft: null,
  tool: "select",
  evidenceTarget: null,
  pendingFocus: null,
}

/** What the composer leaves behind when it closes, however it closes. */
const CLOSED = {
  composeField: null,
  draft: null,
  evidenceTarget: null,
  tool: "select",
} as const

/* ── pure transitions ────────────────────────────────────────────────────── */
/*
 * The state changes live here as plain functions of (state, event) so the flow that
 * writes two items in one act can be read — and tested — without a renderer. The hook
 * below is the React wrapper around them, nothing more.
 */

/**
 * Saving writes the field item and, when one was linked, the document item — in one act,
 * because they were composed as one thought.
 */
export function applySaveFlag(s: ScrutinyState, look: ScrutinyLookups): ScrutinyState {
  const id = s.composeField
  const draft = s.draft
  if (!id || !draft) return s
  const field = look.fieldById[id]
  if (!field || !canSaveDraft(field, draft)) return s

  const flags: FlagMap = { ...s.flags }
  const previous = flags[id]
  const linked = draft.linked

  // "Don't flag the upload" on an item that had one: the partner goes at save time, not
  // at the click — nothing is destroyed until the officer commits.
  const dropped = previous?.linkedTo
  if (dropped && dropped !== linked?.rowId && flags[dropped]?.linkedFrom === id) {
    delete flags[dropped]
  }

  flags[id] = {
    correction: isCorrected(field, draft) ? draft.value.trim() : null,
    reason: draft.reason,
    comment: draft.text.trim() || null,
    voice: draft.voice,
    evidence: draft.evidence,
    linkedTo: linked ? linked.rowId : null,
    linkedFrom: previous?.linkedFrom ?? null,
  }

  if (linked) {
    const partner = s.flags[linked.rowId]
    flags[linked.rowId] = {
      correction: null,
      reason: linked.reason,
      // Never the field note: that one is about the value, this one is about the file.
      // Two items repeating one sentence leave the advocate unable to tell what answers
      // what.
      comment: linked.note.trim() || null,
      voice: false,
      // The same rectangle, copied — the mark IS the picture of the defect, and the
      // advocate's screen may never show the two items side by side. Once saved, that
      // copy is the document item's own: taking the mark off the field item is not
      // taking it off the grant it already made.
      evidence: draft.evidence ?? partner?.evidence ?? null,
      linkedTo: null,
      linkedFrom: id,
    }
  }

  return { ...s, flags, ...CLOSED }
}

/**
 * Removing an item never removes its partner. A bad scan is still a bad scan after the
 * field flag goes; the link is what is cut, not the other grant.
 */
export function applyRemoveFlag(s: ScrutinyState, id: string): ScrutinyState {
  const removed = s.flags[id]
  if (!removed) return s

  const flags: FlagMap = { ...s.flags }
  delete flags[id]

  for (const partnerId of [removed.linkedTo, removed.linkedFrom]) {
    const partner = partnerId ? flags[partnerId] : undefined
    if (!partnerId || !partner) continue
    flags[partnerId] = {
      ...partner,
      linkedTo: partner.linkedTo === id ? null : partner.linkedTo,
      linkedFrom: partner.linkedFrom === id ? null : partner.linkedFrom,
    }
  }

  return {
    ...s,
    flags,
    ...(s.composeField === id ? CLOSED : null),
  }
}

/**
 * The document item left standing when this one is removed — what the toast has to be
 * honest about. Removing the document item strands nothing, so it answers null.
 */
export function survivingPartner(flags: FlagMap, id: string): string | null {
  const partnerId = flags[id]?.linkedTo
  return partnerId && flags[partnerId] ? partnerId : null
}

/**
 * Whether a mark just drawn on `docId` should raise the re-upload question.
 *
 * Keyed to the act of attaching, never to the presence of evidence: re-opening an item to
 * edit it must not re-ask, and attaching a new mark always must. At most one question per
 * uploaded document per case falls out of that, with no suppression list to maintain.
 */
export function shouldAskReupload(
  s: ScrutinyState,
  docId: string,
  look: ScrutinyLookups,
): boolean {
  const field = s.composeField ? look.fieldById[s.composeField] : null
  if (!field || field.docrow) return false
  const rowId = look.docRow[docId]
  if (!rowId || s.flags[rowId]) return false
  return s.draft?.linked?.rowId !== rowId
}

/** Open the linked sub-composer for a document. Nothing is created until Save. */
export function applyLinkDoc(
  s: ScrutinyState,
  docId: string,
  look: ScrutinyLookups,
): ScrutinyState {
  const rowId = look.docRow[docId]
  if (!s.draft || !rowId) return s
  return {
    ...s,
    draft: {
      ...s.draft,
      askReupload: null,
      linked: s.draft.linked?.rowId === rowId
        ? s.draft.linked
        : { rowId, docId, reason: null, note: "" },
    },
  }
}

/* ── the hook ────────────────────────────────────────────────────────────── */

/**
 * Everything the officer does to one case. Kept out of the views so the
 * rendering stays a pure function of this state — the HTML reference tangled
 * the two in a single script and paid for it in re-render bugs.
 */
export function useScrutinyState(aiOn: boolean, caseData: ScrutinyCase) {
  const [state, setState] = React.useState<ScrutinyState>(EMPTY)
  const recordingStart = React.useRef<number>(0)
  const [recordingSeconds, setRecordingSeconds] = React.useState(0)

  /* The two id→record maps the pure transitions resolve against, from this case. Built
     once per case so the callbacks below keep a stable identity between renders. */
  const { fieldById, docRow, transcripts } = caseData
  const look = React.useMemo<ScrutinyLookups>(
    () => ({ fieldById, docRow }),
    [fieldById, docRow],
  )

  const patch = React.useCallback(
    (next: Partial<ScrutinyState>) => setState((s) => ({ ...s, ...next })),
    []
  )

  /* ── selection ─────────────────────────────────────────────────────────── */

  const selectField = React.useCallback((id: string) => {
    setState((s) => ({ ...s, selectedId: id }))
  }, [])

  /* ── composer ──────────────────────────────────────────────────────────── */

  const openComposer = React.useCallback(
    (id: string, seed?: { evidence?: Evidence }) => {
      setState((s) => {
        const field = fieldById[id]
        if (!field) return s
        const existing = s.flags[id]

        if (existing) {
          // Editing something already raised — start from what is there, never blank.
          // That includes the linked document item, restored to its saved state so
          // "Don't flag the upload" is a decision the officer can still take back.
          const partnerId = existing.linkedTo
          const partner = partnerId ? s.flags[partnerId] : undefined
          const linked: LinkedDoc | null =
            partnerId && partner
              ? {
                  rowId: partnerId,
                  docId: fieldById[partnerId]?.docrow ?? "",
                  reason: partner.reason,
                  note: partner.comment ?? "",
                }
              : null

          return {
            ...s,
            selectedId: id,
            composeField: id,
            evidenceTarget: null,
            pendingFocus: "note",
            draft: {
              value: existing.correction ?? field.value ?? "",
              text: existing.comment ?? "",
              reason: existing.reason,
              voice: existing.voice,
              recording: false,
              prefilled: false,
              evidence: seed?.evidence ?? existing.evidence,
              askReupload: null,
              linked,
            },
          }
        }

        // Correction-first: prefill with what the document reads, when the machine
        // has a different reading — marked `prefilled`, which the DS renders as a
        // dashed warning edge and announces to assistive tech. Otherwise the box
        // starts EMPTY: the filed value is shown as its placeholder, so the box reads
        // as untouched until the officer actually types a correction (owner's call —
        // a box pre-filled with the filed value looked already-corrected).
        const machineFilled = !field.docrow && !!field.docread && aiOn
        return {
          ...s,
          selectedId: id,
          composeField: id,
          evidenceTarget: null,
          pendingFocus: machineFilled ? "correction" : field.docrow ? "note" : "correction",
          draft: {
            /*
             * The box opens with what is already there — the machine's reading when it
             * has one, otherwise the filed value — as real, editable text. A placeholder
             * looked the same but could not be edited, so correcting one digit of a
             * cheque number meant retyping the whole thing. It is rendered muted until
             * it actually differs (see `flag-composer`), so it still reads as untouched.
             */
            value: machineFilled ? field.docread! : (field.value ?? ""),
            text: "",
            reason: null,
            voice: false,
            recording: false,
            prefilled: machineFilled,
            evidence: seed?.evidence ?? null,
            askReupload: null,
            linked: null,
          },
        }
      })
    },
    [aiOn, fieldById]
  )

  const closeComposer = React.useCallback(() => {
    setRecordingSeconds(0)
    patch({ ...CLOSED })
  }, [patch])

  const updateDraft = React.useCallback((next: Partial<Draft>) => {
    setState((s) => (s.draft ? { ...s, draft: { ...s.draft, ...next } } : s))
  }, [])

  const clearPendingFocus = React.useCallback(() => {
    setState((s) => (s.pendingFocus ? { ...s, pendingFocus: null } : s))
  }, [])

  const saveFlag = React.useCallback(() => {
    setState((s) => applySaveFlag(s, look))
    setRecordingSeconds(0)
  }, [look])

  /**
   * Answers with the document item left standing, so the caller can say so. A removal
   * whose consequence is invisible is the one that needs stating.
   */
  const removeFlag = React.useCallback(
    (id: string): string | null => {
      const partner = survivingPartner(state.flags, id)
      setState((s) => applyRemoveFlag(s, id))
      return partner
    },
    [state.flags]
  )

  /* ── the linked document item ──────────────────────────────────────────── */

  /** Open the linked sub-composer — from the question, or from the standing link. */
  const linkDoc = React.useCallback((docId: string) => {
    setState((s) => applyLinkDoc(s, docId, look))
  }, [look])

  const answerReupload = React.useCallback((yes: boolean) => {
    setState((s) => {
      const docId = s.draft?.askReupload
      if (!s.draft || !docId) return s
      // "No" leaves no trace, deliberately: nothing was granted and nothing refused.
      if (!yes) return { ...s, draft: { ...s.draft, askReupload: null } }
      return applyLinkDoc(s, docId, look)
    })
  }, [look])

  const updateLinked = React.useCallback((next: Partial<LinkedDoc>) => {
    setState((s) =>
      s.draft?.linked
        ? { ...s, draft: { ...s.draft, linked: { ...s.draft.linked, ...next } } }
        : s
    )
  }, [])

  const clearLinked = React.useCallback(() => {
    setState((s) =>
      s.draft ? { ...s, draft: { ...s.draft, linked: null, askReupload: null } } : s
    )
  }, [])

  /* ── voice (simulated) ─────────────────────────────────────────────────── */

  React.useEffect(() => {
    if (!state.draft?.recording) return
    const tick = setInterval(
      () => setRecordingSeconds(Math.round((Date.now() - recordingStart.current) / 1000)),
      250
    )
    return () => clearInterval(tick)
  }, [state.draft?.recording])

  const toggleRecording = React.useCallback(() => {
    setState((s) => {
      if (!s.draft || !s.composeField) return s
      if (s.draft.recording) {
        const line = transcripts[s.composeField] ?? TRANSCRIPT_FALLBACK
        const text = s.draft.text.trim() ? `${s.draft.text.trim()} ${line}` : line
        return { ...s, draft: { ...s.draft, recording: false, voice: true, text } }
      }
      recordingStart.current = Date.now()
      return { ...s, draft: { ...s.draft, recording: true } }
    })
    setRecordingSeconds(0)
  }, [transcripts])

  /* ── marks on the bundle ───────────────────────────────────────────────── */

  const setTool = React.useCallback((tool: BundleTool) => {
    setState((s) => ({ ...s, tool, evidenceTarget: tool === "rect" ? s.evidenceTarget : null }))
  }, [])

  /** Arm the rectangle tool so the next box attaches to this item silently. */
  const armEvidence = React.useCallback((fieldId: string) => {
    setState((s) => ({ ...s, evidenceTarget: fieldId, selectedId: fieldId, tool: "rect" }))
  }, [])

  /**
   * A drawn box resolves in one of three ways:
   *   armed        → attaches to the item being written, and asks what it means
   *   upload page  → opens that document's own row, mark already attached
   *   generated    → declined; those pages ARE the fields, so flag the field
   *
   * The middle question is the whole point of the first branch: a box dragged around a
   * blurred paragraph from inside a *field* composer used to land silently on the field,
   * and the advocate got the value unlocked and no re-upload button.
   */
  const commitRect = React.useCallback(
    (docId: string, rect: Rect): "attached" | "opened" | "declined" => {
      const target = state.evidenceTarget
      if (target) {
        if (state.composeField === target && state.draft) {
          setState((s) => {
            if (!s.draft) return s
            return {
              ...s,
              draft: {
                ...s.draft,
                evidence: { doc: docId, rect },
                askReupload: shouldAskReupload(s, docId, look) ? docId : null,
              },
              evidenceTarget: null,
              tool: "select",
            }
          })
        } else {
          setState((s) => {
            const existing = s.flags[target]
            if (!existing) return { ...s, evidenceTarget: null, tool: "select" }
            return {
              ...s,
              flags: { ...s.flags, [target]: { ...existing, evidence: { doc: docId, rect } } },
              evidenceTarget: null,
              tool: "select",
            }
          })
        }
        return "attached"
      }

      const row = docRow[docId]
      if (row) {
        // The tool stays armed: marking two problems on one page is the common case.
        openComposer(row, { evidence: { doc: docId, rect } })
        return "opened"
      }
      return "declined"
    },
    [state.evidenceTarget, state.composeField, state.draft, openComposer, docRow, look]
  )

  const reset = React.useCallback(() => {
    setState(EMPTY)
    setRecordingSeconds(0)
  }, [])

  return {
    ...state,
    recordingSeconds,
    selectField,
    openComposer,
    closeComposer,
    updateDraft,
    clearPendingFocus,
    saveFlag,
    removeFlag,
    linkDoc,
    answerReupload,
    updateLinked,
    clearLinked,
    toggleRecording,
    setTool,
    armEvidence,
    commitRect,
    reset,
  }
}

export type ScrutinyController = ReturnType<typeof useScrutinyState>
