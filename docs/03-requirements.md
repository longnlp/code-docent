# 03 — Requirements

Priorities: **P0** = prototype must have, **P1** = needed for a real pilot, **P2** = later.

## A. Repository connection & ingestion

| ID | P | Requirement |
|---|---|---|
| A1 | P0 | Connect a **local repository** by path (fastest to build, no auth). |
| A2 | P1 | Connect a **GitHub repository** (OAuth App or PAT; private repos included). GitLab/Bitbucket later (P2). |
| A3 | P0 | Ingestion produces a **repo map**: languages, entry points, directory structure, and a first-pass **feature inventory** (candidate features/flows/business rules found in the code). |
| A4 | P0 | Record the **commit hash** (or content hash for local) each generation ran against, so staleness is detectable. |
| A5 | P1 | Detect new commits (webhook for GitHub, manual "re-scan" button for local) and trigger the update pipeline. |
| A6 | P2 | Multiple repositories per project (product spanning several services). |

## B. Document generation (admin ↔ LLM curation loop)

| ID | P | Requirement |
|---|---|---|
| B1 | P0 | Generate **audience-oriented pages**, not code-structure pages. Initial page taxonomy: Product Overview; Features & Flows (one page per feature); Business Rules & Validations; Error Messages & Edge Cases; Glossary. Admin can change the taxonomy. |
| B2 | P0 | Every generated statement of behavior must be **anchored**: the page stores which code locations (file paths + symbol/line ranges + commit) it was derived from. Anchors are visible to the admin only. |
| B3 | P0 | Admin can **iterate with the LLM per page**: give feedback in chat ("too technical", "wrong term, we call this X", "missing the retry case") and regenerate. Direct manual editing of the markdown is also allowed. |
| B4 | P0 | **Skills persistence**: admin corrections are distilled (with admin approval) into per-project skill files — style guide, glossary (code name → product name), page-structure rules, do/don't rules. All future generation and regeneration uses them. Skill files are plain, human-editable markdown. |
| B8 | P0 | **Repo map hints**: admin can teach the system where things live in the repo ("pricing logic is in `src/billing/pricing/`", "user-facing error texts are in `locales/en/errors.json`") via a `repo-map.md` skill file. Agents consult hints before exploring. Admin can also **exclude** paths/features from ever being documented (internal, deprecated, security-sensitive). |
| B5 | P0 | Admin **publishes** pages explicitly. Only published pages are visible to end users. Draft/published states per page. |
| B6 | P1 | Page **versioning** with diff view (what changed between generations). |
| B7 | P2 | Multi-admin review workflow (approvals, comments). |

## C. Update pipeline (code changed → docs updated)

| ID | P | Requirement |
|---|---|---|
| C1 | P1 | On new commits: compute the code diff, map changed files/symbols to affected pages **via the B2 anchors**, and regenerate only those pages using the learned skills. |
| C2 | P1 | Regenerated pages enter a **review queue** as drafts with a doc-diff; the previously published version stays live until the admin approves. Nothing reaches end users unreviewed. |
| C3 | P1 | Pages whose anchors changed but which could not be regenerated confidently are flagged **stale** (Swimm-style) rather than silently rewritten. |
| C4 | P2 | Auto-publish low-risk updates (admin-configurable threshold). |

## D. End-user experience

| ID | P | Requirement |
|---|---|---|
| D1 | P0 | **Chat interface** answering questions about product logic, flows, rules, and errors, grounded **only in published docs**. |
| D2 | P0 | **No code exposure, ever**: no file names, snippets, internal symbol names, or repo structure in answers. Enforced by construction (the answering context contains no code) — not just by prompt. |
| D3 | P0 | Answers **cite the doc pages/sections** used, with links to the readable wiki page. |
| D4 | P0 | When docs don't cover the question, the assistant says so honestly (no guessing) and tells the user it has been forwarded. |
| D5 | P0 | Browsable **wiki view** of published pages (chat is not the only way in). |
| D6 | P1 | Per-user roles: admin vs reader. Simple auth (invite/shared workspace) for MVP. |
| D7 | P2 | Answer feedback (👍/👎 with comment) feeding the same gap inbox. |

## E. Knowledge-gap loop

| ID | P | Requirement |
|---|---|---|
| E1 | P0 | Log every question the assistant could not answer (or answered with low confidence), with the full question, conversation context, and timestamp. |
| E2 | P0 | **Gap inbox** for the admin listing open gaps. |
| E3 | P1 | Cluster similar/repeated gaps; show frequency so the admin prioritizes by impact. |
| E4 | P1 | Resolution flow from the inbox: the admin opens a gap and **investigates it with the LLM** (which has code access, admin-side only) to find the real answer; the outcome is drafted into a new or existing doc page, reviewed, and published. Alternative action: *dismiss (out of scope)*. Resolved gaps record which page now answers them. If the investigation revealed *where* the answer lives in the code, the admin can save that as a `repo-map.md` hint (B8). |
| E5 | P2 | Notify the asking user when their question becomes answerable. |

## F. Non-functional

| ID | P | Requirement |
|---|---|---|
| F1 | P0 | **Truthfulness over coverage**: a wrong confident answer is the worst outcome (QA writing tests against invented behavior, support telling customers wrong things). Prefer "I don't know". |
| F2 | P0 | **Code confidentiality**: source code never leaves the admin trust boundary except to the LLM provider used for generation. Consider provider/BYOK choice (see open questions). |
| F3 | P1 | **Cost control**: full-repo generation is expensive; incremental updates must touch only affected pages. Track token spend per operation. |
| F4 | P1 | **Evaluation harness**: a golden set of Q&A pairs per project (admin-curated, seeded from resolved gaps) run after each doc update to catch regressions in answer quality. |
| F5 | P1 | Prompt-injection resistance: repo contents are untrusted input to the generation agent; end-user chat input is untrusted to the answering agent. Neither may trigger tool use outside its sandbox. |
| F6 | P2 | Multi-tenant SaaS hardening (tenant isolation, secrets, audit log) — only if we go beyond self-host. |
| F7 | P1 | **Agent-runtime abstraction**: generation and answering agents run behind a thin adapter interface so multiple runtimes can be supported — Claude Agent SDK, GitHub Copilot SDK, Google Gemini CLI / Antigravity CLI, or raw AI APIs (BYOK). Prototype ships one adapter; a second adapter validates the interface. All learned knowledge (skills) stays in provider-neutral markdown. |
| F8 | P0 | **Deployability**: one-command install on a plain server (Docker Compose or single script); no external services (filesystem + SQLite); workspace on a persistent volume; all config via `.env` (LLM keys, repo path, port, admin credentials). Dev environment and runtime server are different machines — see [08-dev-deploy-feedback-workflow.md](08-dev-deploy-feedback-workflow.md). |
| F9 | P0 | **Remote-feedback observability**: structured run logs and per-operation metrics (tokens, cost, latency, errors) from day one, plus an `export-feedback` command that bundles logs, metrics, skills snapshot, sample pages, and gap export — with a `--redact` option that strips code snippets and file paths — so real-world runs can be analyzed back in the dev environment. |

## Success criteria for the prototype

1. On a real repo with poor docs, the admin can produce a published wiki that a PM/QA/support
   person rates as *useful and understandable* — in **hours, not days** of curation.
2. After admin corrections, regeneration demonstrably **keeps the learned style/terminology**
   (compare page quality before vs after skills exist).
3. A code change flows through to an updated page with **no full regeneration** and no
   loss of curated style.
4. End-user chat answers common questions **with citations**, refuses what it can't
   answer, and the question appears in the gap inbox.
