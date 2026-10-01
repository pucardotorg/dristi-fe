---
name: propose-ui-brief
description: "Compatibility entrypoint for the former propose-ui-brief workflow. Route brainstorming to design-ui and owner-facing decision records to document-ui-feature."
---

# Former proposal workflow

For brainstorming or deciding a feature, use `design-ui` at
`.agents/skills/design-ui/SKILL.md`; return decisions and acceptance criteria in the
active task. For the owner's history, use `document-ui-feature` at
`.agents/skills/document-ui-feature/SKILL.md`.

Do not require a pre-build proposal or read historical proposals to plan implementation.
If the user explicitly requests a proposal or asks to retrieve/update a particular old
document, honor that request without making the artifact mandatory for later agents.
The old name remains available so existing invocations do not break.
