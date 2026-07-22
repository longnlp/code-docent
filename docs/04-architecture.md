# 04 — Architecture

## Key design decisions (with rationale)

### D1. Curated docs are the product — and the *only* thing end users touch

Two ways to answer end-user questions:

- **(a) RAG/agent directly over code** (what DeepWiki/Code Wiki chat does)
- **(b) Answer only from a curated, human-reviewed doc layer** ← **chosen**

Rationale for (b):
- **Quality control.** The admin can review a finite artifact (the docs). Nobody can
  review every possible answer an agent synthesizes from raw code on the fly.
- **Security by construction.** If code is never in the answering context, it cannot
  leak — no prompt-injection trick or jailbreak can exfiltrate what isn't there (F2/D2).
- **Consistency.** Two support agents asking the same question get the same
  ground truth, because the ground truth is a document, not a fresh code exploration.
- **The learning loop has a target.** Gaps are resolved by improving a concrete page.
- Trade-off: docs can lag code. Mitigated by anchors + the update pipeline (D3 below).

Code stays available to the *generation* side (admin trust boundary) — it's the source;
it's just never the serving layer.

### D2. "Learning" = accumulated skill files, not fine-tuning

The admin's corrections are distilled into per-project, human-readable markdown files
that are injected into every future generation run:

```
project/
  skills/
    style-guide.md     # audience, tone, length, formatting rules
    glossary.md        # code term → product term ("OrderSvc.finalize" → "order completion")
    taxonomy.md        # page structure: which pages exist, what belongs where
    rules.md           # learned do/don'ts ("never mention internal service names",
                       #  "always quote the exact error text users see", ...)
                       # + exclusions: paths/features never to document
    repo-map.md        # where things live: "pricing logic → src/billing/pricing/",
                       #  "user-facing error texts → locales/en/errors.json" — agents
                       #  consult these hints before exploring (B8)
```

This is exactly the pattern proven by agent skills / CLAUDE.md files: cheap, instantly
effective, inspectable and editable by the admin, versionable in git, and portable if we
switch LLM providers. A "skill distiller" step proposes rule updates from each admin
correction; the admin approves them (so bad rules don't accrete silently).

### D3. Anchors make incremental sync possible

Every doc page carries hidden metadata: the code locations (file + symbol/line span +
commit hash) each section was derived from — the Swimm insight. The update pipeline is then:

```
new commits → git diff → changed files/symbols → look up anchors → affected pages
            → regenerate ONLY those pages (with skills) → doc-diff into review queue
```

This keeps cost proportional to the change, and gives the admin a reviewable doc-diff
instead of a rewritten wiki.

### D4. Generation is agentic; end-user answering is retrieval over docs

- **Generation/update** needs multi-step repo exploration (read entry points, trace a
  flow, find all error messages…) → an **agent with tools** (read/grep/list on a repo
  checkout), not one-shot RAG. This is what the Claude Agent SDK is built for.
- **Answering** works over a small corpus (dozens–hundreds of markdown pages) → simple
  retrieval is enough. For the prototype, *agentic search over the markdown files*
  (grep/read) avoids standing up a vector store at all; add embeddings later if the
  corpus grows or latency matters.

### D5. Agent runtime adapter

Multi-runtime support is a stated goal (Q3): Claude Agent SDK, GitHub Copilot SDK,
Google Gemini CLI / Antigravity CLI, and raw AI APIs (BYOK). To keep this feasible, the
pipelines never call a runtime directly — they call a thin adapter interface:

```
AgentRuntime.run(task) → artifacts
  task: role (scanner | writer | distiller | answerer)
      + instructions (built from skill files)
      + tool scope (read-only repo checkout | published docs only | none)
      + expected output shape (markdown page with anchor front-matter, inventory JSON, …)
```

Rules that make the adapters swappable:
- **All persistent knowledge lives in markdown skill files**, never in runtime-specific
  state (no provider memory features, no fine-tunes). A project curated under one
  runtime regenerates correctly under another.
- **Tool scopes are enforced by the adapter**, matching each runtime's own sandboxing
  mechanism (SDK permissions, CLI flags, or our own tool loop for raw APIs).
- Prototype ships **one adapter** (fastest path); a second adapter is added in Phase 4
  to prove the interface before more are built. Raw-API adapters need the most work
  (we own the agent loop) — do those last.

## System components

```
┌───────────────────────────── Admin trust boundary ─────────────────────────────┐
│                                                                                │
│  Repo connector ──▶ Repo checkout (local clone, pinned commit)                 │
│  (GitHub App /            │                                                    │
│   local path)             ▼                                                    │
│                 ┌─ Generation service ────────────────────────┐                │
│                 │ 1 Scanner agent: repo map + feature inventory│                │
│                 │ 2 Writer agents: one per page (uses skills/) │                │
│                 │ 3 Skill distiller: correction → rule proposal│                │
│                 │ 4 Update mapper: git diff → affected pages   │                │
│                 └───────────────┬──────────────────────────────┘                │
│                                 ▼                                              │
│  Admin console (web) ◀──▶  Doc store (pages + anchors + versions + states)     │
│   - page review/edit/chat       │                                              │
│   - skills editor               │ publish (drafts never cross this line)       │
│   - gap inbox                   │                                              │
└─────────────────────────────────┼──────────────────────────────────────────────┘
                                  ▼
┌────────────────────────── End-user surface ────────────────────────────────────┐
│  Wiki view (published pages)         Chat service                              │
│                                       - retrieval over published docs ONLY     │
│                                       - answers with citations                 │
│                                       - confidence gate → "I don't know"       │
│                                       - logs gaps ──────────▶ Gap store ───────┼──▶ admin inbox
└────────────────────────────────────────────────────────────────────────────────┘
```

### Data model (first cut)

- **Project**: repo ref, connection type, current synced commit, settings.
- **Page**: slug, title, audience tags, markdown body, state (draft/published/stale),
  version history.
- **Anchor**: page section ↔ (file path, symbol/line span, commit). Many-to-many.
- **Skill file**: type (style/glossary/taxonomy/rules), markdown body, change history.
- **Gap**: question text, conversation context, status (open/resolved/dismissed),
  resolution link (page), cluster id, count.
- **Chat session / message**: for end users; admin curation chats stored per page.

## The three pipelines in detail

### 1. Initial generation (admin-triggered)
1. Scanner agent explores the checkout → proposes a **feature inventory** (list of
   features/flows/rules with their code locations).
2. Admin edits/approves the inventory — this becomes `taxonomy.md` (cheap early
   steering beats correcting 40 generated pages later).
3. Writer agent generates each page from its code locations + all skill files, recording
   anchors as it goes.
4. Pages land as drafts; admin iterates per page (chat feedback or direct edit); skill
   distiller proposes rule updates from each correction; admin publishes.

### 2. Update on code change
1. Webhook/manual trigger → pull, diff old..new commit.
2. Update mapper resolves diff → anchor hits → affected pages (plus a "new feature?"
   sweep: changed files with *no* anchors may mean undocumented new behavior — surface
   as a suggestion, don't ignore).
3. Regenerate affected pages (same writer + current skills) → drafts with doc-diff →
   review queue → admin approves → publish.

### 3. End-user Q&A
1. Retrieve candidate sections from **published** pages.
2. Answer with inline citations. System prompt forbids speculation beyond the docs.
3. Confidence gate: if retrieval is thin or the model flags uncertainty → honest
   decline + write to gap store (with dedup/clustering against existing open gaps).

## Security notes

- End-user chat context contains **only published doc text** — never code, never anchors
  (anchors reveal file paths). This makes D2 structural, not prompt-dependent.
- Generation agents get read-only tools scoped to the checkout directory; repo content
  is untrusted input (a malicious README must not be able to instruct the agent to do
  anything beyond writing docs).
- Local-repo mode keeps everything on the admin's machine except LLM API calls.
