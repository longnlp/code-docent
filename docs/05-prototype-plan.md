# 05 — Prototype Plan

Goal: prove the four success criteria in [03-requirements.md](03-requirements.md#success-criteria-for-the-prototype)
with the smallest possible build. Optimize for learning speed, not polish.

> **Build status (2026-07-14):** Phase 1 core in progress, multi-runtime first (per
> owner decision). Working: runtime adapter layer with 6 adapters (claude-sdk,
> claude-cli, copilot-cli, gemini-cli, anthropic-api, openai-api), `doctor`,
> Pass 0 `prescan` (0.5 s on Radarr), Pass 1 `scan` (live-tested: 24 features,
> 83 s, $0.41 via claude-cli), Pass 2 `write` (trace + render), per-run metrics
> in `runs.jsonl` (F9 seed). Not yet built: skill distiller, publish flow,
> update pipeline (Phase 3), end-user chat + gap inbox (Phase 2).

## Guiding choices

- **Local repo first** (A1): a directory path — no OAuth, no webhooks, no cloning infra.
  GitHub connect is Phase 4.
- **Docs live as markdown files on disk** in a per-project workspace; SQLite for
  gaps/sessions/state. No vector DB — the answering agent greps/reads the published
  markdown (corpus is small; see architecture D4).
- **One agent runtime first, behind the adapter interface** (architecture D5). Multi-
  runtime support (Copilot SDK, Gemini CLI/Antigravity, raw APIs) is a goal (Q3), but
  the prototype ships a single adapter — suggested first adapter: Claude Agent SDK,
  since the agent loop, file tools, and sandboxing come for free and skills-as-files
  maps 1:1. A second adapter lands in Phase 4 to prove the interface.
- **Guinea-pig repo(s) picked by the owner before we start** (Q4) — possibly several;
  each gets its own workspace. Ideal: known well enough to judge output quality, with a
  real PM/QA/support-type person willing to try the chat.
- **Dev and runtime are different machines** (see [08](08-dev-deploy-feedback-workflow.md)):
  the dev environment can't reach the real repos, so development runs against **fixture
  repos** (similar open-source projects), and the real guinea-pig runs happen on the
  target server. Consequences built in from Phase 1: Docker/one-command deploy (F8) and
  structured logs + `export-feedback` (F9) — every real-world debugging cycle depends
  on that bundle.

## Workspace layout (prototype)

```
workspace/<project>/
  repo/            # the checkout (or symlink to local repo) — admin side only
  skills/          # style-guide.md, glossary.md, taxonomy.md, rules.md
  drafts/          # generated pages awaiting review (with anchor front-matter)
  published/       # what end users see — the ONLY corpus the chat may read
  state.db         # sqlite: gaps, sessions, versions, sync commit
```

Pages are markdown with YAML front-matter (title, audience tags, state, anchors).
Everything inspectable with a text editor — debuggability is a feature at this stage.

## Phases

### Phase 1 — Generation + curation loop (the core bet) · ~1–2 weeks
- CLI or minimal web UI: point at a local repo → scanner agent produces feature
  inventory → admin approves/edits it → writer agent generates draft pages with anchors.
- Admin iterates: per-page chat feedback → regenerate page; skill distiller proposes
  updates to `skills/*.md`; admin approves; publish command moves page to `published/`.
- **Exit test:** generate docs for the guinea-pig repo twice — once with empty skills,
  once after ~10 corrections. The second run must be visibly better *without* repeating
  the corrections. If this fails, the whole premise needs rethinking — find out here.

### Phase 2 — End-user chat + gap loop · ~1 week
- Simple chat web UI over `published/` only (agentic grep/read retrieval), citations to
  page sections, honest-decline behavior, gaps written to SQLite.
- Gap inbox page for admin: list, dismiss, or **investigate with the LLM** — an
  admin-side chat with code access that finds the answer, then drafts it into a new or
  existing page (goes to drafts for review). If the investigation reveals where the
  answer lives, offer to save a `repo-map.md` hint.
- **Exit test:** 20 realistic questions from a PM/QA/support perspective — measure
  answered-with-citation vs correctly-declined vs hallucinated. Hallucinated must be ~0;
  declined questions must all appear in the inbox.

### Phase 3 — Update pipeline · ~1 week
- "Sync" command: diff since last synced commit → anchor lookup → regenerate affected
  pages as drafts with doc-diff → admin review queue → publish.
- Flag anchor-less changed files as "possible undocumented behavior".
- **Exit test:** make 3 real behavior-changing commits to the guinea-pig repo; sync must
  touch only the right pages, preserve curated style, and cost a small fraction of full
  regeneration.

### Phase 4 — Pilot hardening (only if 1–3 succeed)
- GitHub App connection + webhook sync; simple auth with admin/reader roles; deploy for
  one pilot team; gap clustering; golden-question eval harness (F4).

## Suggested stack

| Layer | Choice | Why |
|---|---|---|
| Agents | Runtime adapter (D5); first impl: Claude Agent SDK (TS or Python) | agent loop + file tools + permissions built in; skills = files; Copilot SDK / Gemini CLI / raw-API adapters later |
| Backend | FastAPI (Python) or Next.js API routes | thin; mostly orchestrates agents + serves files |
| Frontend | Next.js + a markdown renderer | wiki view, admin console, chat — all straightforward |
| Storage | Filesystem (markdown) + SQLite | inspectable, zero ops; revisit at pilot stage |
| Repo access | local path now; GitHub App later | fastest path to the core-bet test |

## Biggest risks, and where the plan de-risks them

| Risk | De-risked by |
|---|---|
| Skills don't actually transfer (regeneration quality resets) | Phase 1 exit test — the first thing we validate |
| Answers hallucinate behavior (worst failure per F1) | Phase 2 exit test; docs-only context; decline gate |
| Anchor mapping too coarse → every commit flags every page | Phase 3 exit test; anchors at symbol level, not file level |
| Generation cost blows up on big repos | Guinea-pig repo is mid-sized; incremental sync is Phase 3; measure tokens per phase |
| We rebuild what DeepWiki already does | Taxonomy is audience-first (B1); judged by a non-developer, not by us |
