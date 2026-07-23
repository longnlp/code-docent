# 09 — How Documents Are Generated From Code

The mechanics behind the pipelines sketched in [04-architecture.md](04-architecture.md).
Written before Phase 1 so we agree on the method, not just the components.

> **Status: validated 2026-07-14** by a manual dry run on the Radarr fixture — see
> `workspace/radarr/` (inventory, skills, and `drafts/adding-movies.md` with a 24-fact
> anchored fact sheet). The dry run is the executable spec for the Phase 1 agents: the
> tracer prompts used there become the writer-agent prompt templates.

## The core idea

**Docs are rendered from traced evidence, not from summarized files.**

A repo like Radarr is hundreds of thousands of lines — no model reads it "at once," and
summarizing file-by-file produces exactly the code-structure-shaped docs we're trying to
avoid. Instead, generation works the way a careful engineer answers a PM's question:

1. Start from **what the user can see and do** (pages, buttons, API endpoints).
2. **Trace the slice** behind one feature at a time — UI → API → business logic → data →
   errors — following actual references in the code.
3. Record every observed behavior as a **fact with a code citation** (the anchor).
4. Only then **write prose** — from the fact sheet, in product language, under the
   skill files' rules.

Facts-then-prose is the anti-hallucination discipline: the writer is only allowed to
render what the fact sheet supports, and every fact knows where in the code it came from.

## Why not the obvious alternatives

| Approach | Why we don't use it for generation |
|---|---|
| Chunk + embed + RAG (deepwiki-open style) | Retrieval finds *similar* text; doc generation needs *causally connected* code (this handler calls that validator which produces that error). Similarity ≠ flow. |
| Summarize every file, then summarize summaries | Produces module-shaped docs for developers; loses cross-file behavior (a validation rule spread across UI + API + service appears three times as trivia, never once as a rule). |
| Dump whole repo into a long context | Cost-prohibitive at scale, degrades quality (needle-in-haystack), and doesn't produce anchors. |

Agentic tracing with read/grep/glob is how coding agents already navigate repos
effectively — we're pointing the same capability at explanation instead of editing.

## The four passes

### Pass 0 — Deterministic pre-scan (no LLM, ~free)

Cheap static extraction builds a skeleton before any model call, because grep/AST is
*exhaustive* for mechanical facts where LLM exploration is expensive and can miss:

- File tree, languages, frameworks (detects ASP.NET Core + React here).
- **API surface**: controllers, `[Route]`/`[HttpGet]` attributes, minimal-API mappings.
- **UI surface**: React Router routes → pages; form components.
- **Background surface**: scheduled-task registration sites (`new ScheduledTask`,
  `IHostedService`, cron/`@Scheduled`), command/job/worker files, event handlers, and
  health checks. This is behavior with *no* UI route or controller — it would otherwise
  be invisible to an entry-point scan (see note below).
- **User-facing strings**: i18n/localization files, error message constants, validation
  messages — these are gold, they're *already product language*.
- **Rules candidates**: DataAnnotations/FluentValidation validators, enums (state
  machines), config keys and feature flags.
- Test files are excluded from all behavior signals so counts/lists stay clean.
- Applies `repo-map.md` hints and exclusions from the start.

### Pass 1 — Feature inventory (scanner agent)

Entry-point driven across **three** kinds of entry point, not just the UI:

1. **User-facing screens** — UI routes and the API controllers behind them.
2. **Background / automatic behavior** — scheduled tasks and jobs that run on their own
   with no user click. The scanner reads the scheduled-task registrar(s) surfaced by
   Pass 0 to enumerate what runs automatically and how often (periodic release searches,
   backups, library refresh, housekeeping/cleanup, import-list sync, update checks) and
   gives them their own feature entries. Health checks and significant event-driven
   behavior are covered here too.
3. **Anything else product-meaningful** not tied to a screen.

The agent clusters these into product features ("Adding movies", "Automatic release
searching", "Backups & maintenance"…) with their entry points and key code locations
attached.

> **Why the third type matters (added 2026-07-23):** the original scanner clustered only
> UI routes + controllers, so standalone jobs were missed — on Radarr that meant 11
> scheduled tasks, ~38 health checks, and ~52 event handlers with no page of their own.
> Background behavior downstream of a user action still showed up inside that feature's
> lifecycle section (e.g. RSS sync in the Calendar page), but jobs with no user trigger
> (backups, housekeeping, recycle-bin cleanup, update checks) were invisible — exactly
> the "how often does it…?" / "when does it back up?" questions support fields. Pass 0
> now detects them and Pass 1 gives them first-class features.

Output goes to the **admin for review** and becomes `taxonomy.md` — steering here is
cheap; correcting 40 wrongly-scoped pages later is not.

For a background/automatic feature, the Pass 2 trace centers on: what **triggers** it
(schedule + exact interval, or which event) and whether that interval is configurable;
what it **does**, step by step; what the user can **see or control** (settings,
System→Tasks / Activity / History screens, health warnings) and where; and its failure
modes.

### Pass 2 — Per-feature vertical slice (writer agent, the core pass)

For each approved feature, one bounded exploration:

1. **UI layer**: what the user sees — components, form fields, labels, client-side
   validation, disabled states.
2. **API layer**: endpoints called, request/response shapes.
3. **Logic layer**: handlers/services — the business rules, validations, side effects,
   state transitions.
4. **Failure paths**: what can go wrong, the *exact* user-facing message, and the
   condition that triggers it.
5. **Tests as evidence**: test names and assertions encode *intended* behavior and edge
   cases ("should_reject_duplicate_movie") — often the closest thing to a spec in the
   repo.

Everything observed is written to a **fact sheet** (structured, each fact carrying its
anchors), then the page is rendered from the fact sheet under the skill files
(style-guide, glossary, rules). The fact sheet is stored as hidden page metadata — it
powers verification and incremental updates later.

Evidence sources, ranked by trust:
user-facing strings > validation rules/types > tests > route signatures > service logic
read directly > code comments & existing docs (useful hints, but stale-prone — code wins
on conflict) > git/PR history (the "why"; P2).

### Pass 3 — Cross-cutting pages

- **Glossary** seeded from code-name ↔ UI-label pairs found in Pass 2.
- **Error catalog** assembled from the collected failure paths.
- **Product overview** written *last, from the feature pages* (never from raw code) —
  by then the product language exists.

### Pass 4 — Verification (checker agent)

A separate agent re-reads each page claim-by-claim against its anchors: *does the code
at these locations actually support this sentence?* Unsupported claims get flagged for
the admin instead of shipping. This directly serves F1 (truthfulness over coverage) and
runs again after every regeneration.

## Worked example (illustrative)

Feature: **Add Movie** (Radarr-like). Pass 2 collects, among others:

```yaml
facts:
  - id: f1
    claim: "Add Movie page lets the user search by title or TMDB/IMDb ID"
    anchors: [frontend/src/AddMovie/AddNewMovie.js:40-85 @ abc123]
  - id: f2
    claim: "Adding requires choosing a root folder and a quality profile"
    anchors: [frontend/src/AddMovie/AddNewMovieModal.js:112-160 @ abc123]
  - id: f3
    claim: "Adding a movie that already exists is rejected with the message
            'This movie has already been added'"
    anchors: [src/NzbDrone.Core/Movies/MovieService.cs:203-214 @ abc123,
              src/NzbDrone.Core/Localization/Core/en.json:918 @ abc123]
  - id: f4
    claim: "Tests assert duplicates are detected by TMDB id, not title"
    anchors: [src/NzbDrone.Core.Test/MovieTests/AddMovieFixture.cs:77-95 @ abc123]
```

Rendered section (using glossary + style skills; anchors stay hidden from end users):

> ### Adding a movie
> Search for a movie by title, or paste a TMDB/IMDb ID for an exact match. Before the
> movie can be added you must choose where its files will live (the *root folder*) and
> which *quality profile* applies.
>
> **If the movie is already in your library**, it cannot be added again — you'll see
> *"This movie has already been added."* Duplicates are detected by the movie's TMDB
> ID, so the same film under a different title is still recognized as a duplicate.
>
> *For QA:* duplicate detection is ID-based (f4) — a renamed title is a covered case,
> two different editions with distinct TMDB IDs are not duplicates.

Note what made this possible: the exact error text came from the localization file, the
rule from the service, and the edge-case nuance from a test — three files, one behavior,
one paragraph. That cross-file assembly is precisely what per-file summarization can't do.

## Where the skills plug in

Every writer/checker run is assembled as: task + fact sheet (or slice to explore) +
**all skill files** (style-guide, glossary, taxonomy, rules, repo-map). So when the
admin corrects "we call it *collection*, not *library*", the distiller adds a glossary
line, and every future page — including regenerations of old pages — complies. Nothing
about the method changes as skills accumulate; the constraints just get tighter.

## Incremental updates use the same machinery

On code change ([04-architecture.md](04-architecture.md#d3-anchors-make-incremental-sync-possible)):
diff → anchors → affected facts → the writer re-verifies *those facts* (re-reading only
their slices), updates the fact sheet, and re-renders the affected sections. The doc
diff shown to the admin maps 1:1 to fact changes ("f3's message text changed"), which is
far more reviewable than a rewritten page.

## Honest limitations

- **Code doesn't contain the "why"** (pricing decisions, product intent) or
  data/config-dependent behavior. Those arrive via the gap loop and admin curation —
  by design, not as a workaround.
- **Trust ceiling**: generated pages are drafts until an admin publishes; the checker
  reduces review burden but doesn't replace it.
- **Cost scales with feature count, not repo size** — that's the point of slices — but
  a first full run on a Radarr-sized repo is still a real spend; Phase 1 measures it
  per feature (F3, F9 metrics).
