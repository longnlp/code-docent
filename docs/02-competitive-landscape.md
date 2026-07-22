# 02 — Competitive Landscape

Research date: 2026-07-10. Summaries based on public sources (linked at the bottom).

## Tools evaluated

### Google Code Wiki
- Auto-generates and updates a wiki from a codebase after every commit; architecture
  diagrams; deep links to implementations; integrated chat grounded in the code (Gemini).
- **Strengths:** always-in-sync promise; per-commit regeneration; chat over code.
- **Weaknesses (from public reviews and our own trial):** documents *what* the code does
  but not *why*; output is verbose with LLM-isms, oscillating between too vague and too
  specific; developer-oriented structure; public-repo focus (private-repo path immature);
  no human curation loop — you get what the model gives you.
- **Relevance to us:** validates per-commit doc sync; proves the market; also proves the
  gap — its audience is developers.

### DeepWiki (Cognition / Devin) + deepwiki-open
- Turns any public GitHub repo into a wiki: hierarchical TOC, module pages, architecture
  diagrams, chat with context-grounded answers. Private repos only via Devin.
- **deepwiki-open** (AsyncFuncAI) is an open-source clone: Next.js frontend + FastAPI
  backend; clones repo → chunks/embeds into a vector store (FAISS) → RAG pipeline
  (retrieve → enrich → generate) for both wiki generation and chat.
- **Relevance to us:** deepwiki-open is a useful architecture reference (and a warning:
  pure RAG-over-code chat inherits code-level framing). Structure is still module/code
  centric. No curation, no learning loop, no audience separation.

### understand-anything (the tool we played with)
- Open source; LLM + static analysis → interactive knowledge-graph dashboard of a
  codebase (files/modules/functions color-coded by layer, click a node for code +
  plain-English explanation). Multi-agent pipeline (project-scanner, file-analyzer,
  architecture-analyzer, tour-builder). Runs inside coding agents (Claude Code, Cursor…).
- **Relevance to us:** great for developer onboarding; its multi-agent analysis pipeline
  is a pattern worth borrowing for our ingestion step. But the artifact *is* the code
  graph — by definition not for people who shouldn't touch code.

### Swimm
- "Continuous documentation": docs contain *smart tokens/snippets* coupled to actual
  code; when code changes, auto-sync updates docs or flags them stale; CI/GitHub App
  blocks merges with outdated docs.
- **Relevance to us:** the best prior art for our sync loop. Key borrowed idea:
  **doc↔code anchors** — every doc section records which code locations it derives from,
  so a code diff can be mapped to "these pages may be stale."

### Driver AI
- Commercial "context layer": pre-computes symbol-complete documentation, architecture
  maps and history using a compiler-style approach (full syntax trees, resolved symbols,
  call chains). Explicitly markets to technical **and non-technical** audiences (PMs
  launching features faster, build-vs-buy reports).
- **Relevance to us:** closest to our positioning and evidence there is demand from
  non-engineering roles. Differences: it's a closed enterprise product, no visible
  admin-teaches-the-LLM loop, no end-user gap inbox, and its foundation is still
  code-structural analysis surfaced upward — not a curated product-language layer.

### RepoLens (repolens.ai) — added 2026-07-13 during name research
- Commercial tool: "codebase understanding for PMs and engineers" — turns repositories
  into evidence-backed explainers, change briefs, onboarding paths, and collaborative
  boards for product *and* engineering teams.
- **Relevance to us:** together with Driver AI, more evidence of real demand from
  product roles. Still no visible curator-teaches-the-LLM loop, no end-user chat with a
  hard code/doc separation, and no unanswered-question inbox. Worth a hands-on trial
  before we build Phase 2, to confirm the gap holds.
- Note: the name space is crowded — an unrelated open-source "RepoLens" audit tool also
  exists, which is part of why we avoided "-Lens" names (see 06, Q9).

### Adjacent pattern: AI support knowledge-base tools (Forethought, Fini, Talkative…)
- Mature "knowledge gap detection" products for customer support: detect interactions
  the bot couldn't answer from the KB, cluster repeated failures, route them to a
  designated reviewer with a defined action (update doc / add entry / escalate).
- **Relevance to us:** our gap loop should copy this playbook — gap *inbox* with
  clustering of similar unanswered questions, a reviewer role, and a defined resolution
  action, rather than a raw log.

## Gap analysis

| Capability | Code Wiki | DeepWiki | understand-anything | Swimm | Driver AI | **Us** |
|---|---|---|---|---|---|---|
| Auto-generate docs from repo | ✅ | ✅ | ✅ | partial (assists) | ✅ | ✅ |
| Audience = non-code teams | ❌ | ❌ | ❌ | ❌ | partial | **✅ core** |
| Human curation loop w/ persistent learning | ❌ | ❌ | ❌ | manual | ❌ | **✅ core** |
| Auto-update on code change | ✅ | ✅ | manual re-run | ✅ (anchors) | ✅ | ✅ (anchors + skills) |
| Chat for end users w/o code access | ❌ (chat shows code) | ❌ | ❌ | ❌ | partial | **✅ core** |
| Unanswered-question → admin feedback loop | ❌ | ❌ | ❌ | ❌ | ❌ | **✅ core** |
| Self-host / local repo | ❌ | via clone | ✅ | ❌ | ❌ | ✅ (goal) |

**Conclusion:** no existing tool combines (a) product-language docs for non-code teams,
(b) a curator loop whose corrections persist as reusable generation skills, and (c) a
closed feedback loop from end-user questions back to the curator. That combination is
the prototype's job to prove.

## Sources

- [Google previews Code Wiki (The Register)](https://www.theregister.com/2025/11/17/google_previews_code_wiki/)
- [Google Code Wiki guide (SmartScope)](https://smartscope.blog/en/generative-ai/google-gemini/google-code-wiki-repository-documentation-guide/)
- [Google Code Wiki (Analytics Vidhya)](https://www.analyticsvidhya.com/blog/2025/12/google-code-wiki/)
- [Code Wiki aims to solve documentation's oldest problem (DevOps.com)](https://devops.com/google-code-wiki-aims-to-solve-documentations-oldest-problem/)
- [DeepWiki: AI docs for any repo (Cognition)](https://cognition.com/blog/deepwiki)
- [DeepWiki docs (Devin)](https://docs.devin.ai/work-with-devin/deepwiki)
- [deepwiki-open (GitHub)](https://github.com/asyncfuncai/deepwiki-open)
- [deepwiki-open RAG architecture (DeepWiki)](https://deepwiki.com/AsyncFuncAI/deepwiki-open)
- [understand-anything (GitHub)](https://github.com/labolado/understand-anything)
- [Understand Anything: interactive knowledge graph (DEV Community)](https://dev.to/arshtechpro/understand-anything-turn-any-codebase-into-an-interactive-knowledge-graph-37ed)
- [Swimm continuous documentation](https://docs.swimm.io/new-to-swimm/continuous-documentation/)
- [Swimm GitHub App](https://docs.swimm.io/continuous-integration/github-app/)
- [Driver — context for codebases](https://www.driver.ai/)
- [RepoLens — codebase understanding for PMs and engineers](https://repolens.ai/)
- [Driver launch (TechCrunch)](https://techcrunch.com/2024/10/08/driver-launches-an-ai-powered-platform-for-creating-technical-documentation/)
- [AI knowledge gap detection (Fini Labs)](https://www.usefini.com/guides/ai-surface-knowledge-gaps)
- [AI chatbot feedback loops (Swifteq)](https://swifteq.com/post/ai-chatbot-feedback-loop)
- [Forethought AI-powered knowledge base](https://forethought.ai/solutions/ai-powered-knowledge-base)
