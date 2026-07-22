# Style Guide (skill file — injected into every writer/checker run)

## Audience
Product managers, QA engineers, and support agents. They do not read code and must
never need to. Assume they know the product's purpose but not its internals.

## Defaults (seed rules — refined through admin feedback)
- Plain language; define any unavoidable technical term in the Glossary and link it.
- Describe behavior from the user's perspective: "When you add a movie…", not
  "The MovieController validates…".
- Quote user-facing messages **verbatim** in italics, e.g. *"This movie has already
  been added"* — support agents search by exact message text.
- Never mention: file names, class names, internal service names, code structure.
- Each feature page ends with a **For QA** section: edge cases and boundary behaviors.
- State facts only when supported by the fact sheet; when behavior is
  configuration-dependent, say what the default is and what changes it.

## Learned rules (added by the skill distiller after admin corrections)

### R1 — Lifecycle depth (from admin feedback, 2026-07-14, on drafts/adding-movies.md)
When a page documents a user action, the "what happens after" part must be a **full
lifecycle walkthrough**, not a summary: every stage in order, the timing/schedule of
each stage (including retry schedules), what the user sees at each stage and **on which
screen**, and what can go wrong at each stage. A reader should be able to answer
"I did X two hours ago — what state should things be in now, and where do I look?"
