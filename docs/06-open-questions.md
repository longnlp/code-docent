# 06 — Open Questions → Decision Log

Reviewed with the project owner on 2026-07-13. Most questions are now decided; this file
is the record.

## Q1. May the end-user chat ever fall back to reading code? — ✅ DECIDED: No, strictly

End-user chat answers **only** from published docs. When it can't answer:
1. The question is **recorded** in the gap inbox (with conversation context).
2. The **admin discusses with the LLM** (which *does* have code access, inside the admin
   trust boundary) to investigate and find the answer.
3. The outcome is **generated into the documents**, reviewed, and published — so the
   next person asking gets a real answer.

This keeps the no-code-leakage guarantee structural and makes every gap permanently
close the loop by improving the wiki, not just one chat session.

## Q2. Product shape: self-hosted tool vs multi-tenant SaaS — ✅ DECIDED: Defer

Build the prototype single-team/self-host. Keep the admin/end-user boundary clean so
either shape works later.

## Q3. LLM provider strategy — ✅ DECIDED: Multi-provider is a goal

Target support for multiple agent runtimes: **Claude Agent SDK, GitHub Copilot SDK,
Google Gemini CLI / Antigravity CLI, and raw AI APIs** (bring-your-own-key).

Implication for the design:
- Generation/answering agents run behind a **thin runtime adapter interface**
  (see [04-architecture.md](04-architecture.md#d5-agent-runtime-adapter)).
- The prototype implements **one adapter first** to move fast; a second adapter is added
  early (Phase 4) to prove the interface holds.
- This validates the skills-as-markdown decision: because all learned knowledge lives in
  plain markdown files (not provider-specific state), switching or mixing runtimes
  doesn't lose the curation investment.

## Q4. Which guinea-pig repository? — ⏳ Owner will pick · stack known

The owner will select the test repo(s) — possibly several. Multiple repos is fine for
testing (each gets its own workspace); *cross-repo unified docs* remains P2 (A6).

**Target stack (confirmed 2026-07-13): C# backend + React web.** Since the dev
environment can't reach the real repos, development runs against matching open-source
fixtures — Radarr (realism) and the CleanArchitecture React template (speed); see
[08-dev-deploy-feedback-workflow.md](08-dev-deploy-feedback-workflow.md). This also
sets the initial language priorities for the scanner/writer agents: C#/.NET
(ASP.NET Core) and TypeScript/JavaScript (React).

## Q5. Scope of "documents" — ✅ DECIDED: Product-behavior docs only (for now)

Features, flows, business rules, errors. API reference / dev onboarding / runbooks are
out of scope until the core loops are proven.

## Q6. How does the admin give feedback? — ✅ DECIDED: Chat-per-page + direct edits

The skill distiller must learn from both explicit chat feedback and silent direct edits
(edit diffs → proposed glossary/rules updates, with admin approval).

## Q7. What counts as "cannot answer"? — ✅ DECIDED: Start strict and simple

Empty/thin retrieval + model self-reported low confidence trigger a decline + gap log.
Tune with Phase 2's 20-question test; add user 👍/👎 signals in Phase 4.

## Q8. Repo knowledge hints & exclusions — ✅ DECIDED: Required, both directions

The admin must be able to teach the system **where things live**, not just what to skip:

- **Location hints** (`repo-map.md` skill file): e.g. *"the discount/pricing logic is in
  `src/billing/pricing/`"*, *"user-facing error messages are defined in
  `locales/en/errors.json`"*. The scanner and writer agents consult these hints first,
  which cuts exploration cost and improves accuracy. The admin can add hints at any
  time; the gap-resolution flow is a natural place to capture them ("the answer was in
  folder X" → add a hint).
- **Exclusions** (in `rules.md`): paths/features that must never be documented
  (internal, deprecated, feature-flagged off, security-sensitive).

## Q9. Project name — ✅ DECIDED: **CodeDocent** (2026-07-13)

The owner confirmed **CodeDocent** (repo/folder name `code-docent`). Metaphor: a docent
is a museum guide — visitors view the collection behind glass and never touch it; the
docent explains it in their language. Admin = curator, end users = visitors, code = the
collection. The current folder `code-wiki` should be renamed to `code-docent` at a
convenient moment (e.g. when the repo is initialized).

Original candidate research kept below for the record.

`code2doc` (and `code2docs`) is **heavily taken**: multiple GitHub projects plus a
commercial product at code2docs.com. Collision-checked candidates:

| Candidate | Rationale | Collision check (2026-07-13) |
|---|---|---|
| **CodeDocent** ⭐ recommended | A *docent* is a museum guide: visitors view the exhibit behind glass — they never touch it — and the docent explains it in their language. Exactly our model (users never touch code). Contains "doc"; distinctive; describes the chat side too, not just generation. | "Docent" alone has minor collisions (a support chatbot; an agent-analysis research tool); "CodeDocent" appears free |
| CodeLore | "Lore" = accumulated tribal knowledge, which is what the skills + wiki capture | No direct hits found |
| ProductLens | Audience-first framing ("see the product, not the code") | Name itself appears free, but the "-Lens" space is crowded: RepoLens (two products!), CodeLens (a VS Code feature) — avoid |
| code2doc | Owner's example; describes generation | ❌ Heavily taken |

**Recommendation: CodeDocent** (repo/folder name `code-docent`). The metaphor extends
naturally: the admin is the *curator*, end users are *visitors*, the code is the
*collection* behind glass.
