# Design explorations

Standalone, interactive HTML prototypes used to try a direction — a layout, a colour ramp, a
typeface, an interaction — **before** it becomes app code.

**Everything in this folder except this README is deliberately untracked** (see the rule in
`.gitignore`). The files stay on your disk so they remain openable; they are never pushed.

## Why they are not in the repo

An exploration is working material, not the product:

- it hand-copies DS tokens instead of consuming them, so it **bypasses the token gates on
  purpose** — `check:tokens` / `check:typography` would rightly fail it;
- it re-implements components as plain HTML/CSS, so it is not bound by `check:ui-sync`;
- it goes stale the moment the real screen moves, and a stale prototype in a repo is worse
  than no prototype, because someone will read it as intent.

## Record decisions for the owner

Accepted decisions, reasons, and significant rejected alternatives belong in the owner's
[feature history](../features/README.md). Agents use the current task agreement for
implementation, not past explorations or proposals. Retrieve an old exploration only
when explicitly requested; do not turn it into an implicit specification.

A surviving token change is an upstream DS request under the
[DS policy](../../../.agents/policies/pucar-design-system.md), never a local override.

## Working here

- One file per exploration; name it `<feature>-<version>-<what-it-tries>.html`.
- Open it directly in a browser (`file://…`) — no build step, no server.
- Keep it self-contained: no imports from `apps/`, so it can never drift the app.
