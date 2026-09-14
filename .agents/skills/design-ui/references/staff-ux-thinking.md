# UX reasoning lenses

Use these selectively for substantial design decisions and structural reviews. They
are questions for investigation, not mandatory passes or a demand to find a defect.

1. **Real task:** Walk a scenario supported by the user's context or product sources.
   What must someone understand or do next? Label hypothetical scenarios; never invent
   research or treat a domain actor as a confirmed product user.
2. **Domain structure:** Compare actual relationships with the grouping in the UI.
   Does containment, navigation, or action placement imply the wrong scope?
3. **Facts and guidance:** Trace displayed facts to actual fields, enums, requirements,
   or confirmed sources. Render repeated facts consistently. Instructions, consequences,
   and empty-state guidance remain useful copy; do not force them into data fields.
4. **Vocabulary:** Do controls express the task in product terminology? Defaults follow
   confirmed needs, not an assumed persona or a blanket “my items” rule.
5. **Real content:** Inspect relevant empty, long-label, multilingual, and high-volume
   cases. Read-only reviewers request fixtures or rendered evidence from the coordinator;
   they do not alter application data to perform the review.
6. **Signal:** Is emphasis helping a decision, or restating a norm? Preserve consequential
   warnings; a visual quota is never a reason to hide required information.
7. **Patterns:** Compare affected siblings and existing interaction conventions. A
   difference may be justified by different meaning; identical treatment is not the goal
   when the consequences differ.
8. **Render and interaction:** Verify layout, keyboard/focus behavior, touch, and relevant
   states at appropriate widths. Legal tokens do not prove usability.

Start with the task, then structure and facts, then behavior and rendering. Report only
evidenced findings and identify untested areas. A clean review is a valid outcome; do
not manufacture surprise, require restructuring, or alter something to prove diligence.
