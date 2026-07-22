# 01 — Problem and Vision

## The problem

1. **Most repositories are under-documented.** Docs are missing, stale, or written only
   for developers. The knowledge of *what the product actually does* lives in the code
   and in a few engineers' heads.
2. **The people who need that knowledge most can't read code.** Product managers need to
   know current behavior before specifying changes. QA needs expected behavior, edge
   cases, and validation rules to write test cases. Support needs to explain error
   messages, limits, and flows to customers. Today they all interrupt engineers.
3. **Existing AI code-wiki tools are developer-centric.** We evaluated
   understand-anything and Google Code Wiki (see [02-competitive-landscape.md](02-competitive-landscape.md)):
   they organize output around *code structure* (modules, classes, call graphs, deep
   links into source). That is the wrong mental model for non-code teams, and it exposes
   the code itself — often unacceptable for confidentiality reasons.
4. **One-shot generation isn't good enough.** Raw LLM output over a codebase is verbose,
   full of LLM-isms, uses internal jargon, and misses the "why". It needs a human
   curator — and the curator's corrections should not be thrown away on the next
   regeneration.

## The vision

A two-sided system:

```
        ┌────────────────────────────  Admin side  ───────────────────────────┐
        │                                                                     │
Repo ──▶│  Ingest ──▶ LLM generates docs ──▶ Admin reviews / corrects ──┐     │
(GitHub │     ▲                                                         │     │
or local│     │              corrections distilled into                 │     │
)       │     └──────────────  reusable "skills"  ◀─────────────────────┘     │
        │  (style guide, glossary, structure rules — reused on every update)  │
        └───────────────────────────────┬─────────────────────────────────────┘
                                        │  publishes curated docs (no code)
        ┌───────────────────────────────▼─────────────────────────────────────┐
        │                          End-user side                              │
        │  Product / QA / Support chat with the docs in natural language.     │
        │  Answers cite doc sections. Unanswerable questions ──▶ gap inbox    │
        │  ──▶ admin improves docs/skills ──▶ answer quality improves.        │
        └─────────────────────────────────────────────────────────────────────┘
```

Three loops make it "living" documentation:

- **Curation loop** (admin ↔ LLM): iterate on generated docs; the system distills each
  correction into persistent generation rules ("skills").
- **Sync loop** (code → docs): when code changes, only the affected doc pages are
  regenerated, using the learned skills, and the admin reviews a *doc diff* instead of
  rewriting from scratch.
- **Gap loop** (users → admin): every "I don't know" or low-confidence answer is logged
  with the question and context, so the admin sees exactly where the knowledge base is
  weak.

## Personas

| Persona | Access | Needs |
|---|---|---|
| **Admin / Curator** (tech lead, senior dev, or technical writer with repo access) | Code + docs + settings | Connect repo, drive generation, correct output, review updates when code changes, triage the gap inbox |
| **Product manager** | Docs + chat only | "What happens when a user's payment fails twice?" "What are the current limits on X?" Current-behavior answers before writing specs |
| **QA engineer** | Docs + chat only | Expected behavior, validation rules, edge cases, error conditions — to derive test cases |
| **Support agent** | Docs + chat only | "What does error E1234 mean and what should the customer do?" Fast, trustworthy answers with a source they can cite |

## What makes this different (our bets)

1. **Audience-first docs, not code-first docs.** Pages are organized by *feature, flow,
   and business rule* ("Checkout flow", "Password rules", "What each error message
   means"), not by module or class. Internal names are translated to product language
   via a maintained glossary.
2. **The curator's knowledge compounds.** Admin feedback becomes explicit, inspectable
   skill files — not a lost chat transcript. Regeneration after a code change reuses
   them, so quality ratchets up instead of resetting.
3. **Hard code/doc separation.** End users can never see source code. The chat answers
   only from the curated doc layer. This is both a trust feature (answers were
   human-reviewed) and a security feature (no code leakage, smaller prompt-injection
   surface).
4. **Honest "I don't know" as a feature.** Instead of hallucinating, the assistant
   declines when the docs don't cover something, and that event is the raw material for
   improving the wiki.

## Explicit non-goals (for now)

- Not a developer onboarding tool (DeepWiki/Code Wiki already do this well).
- Not a code-review or code-search tool.
- Not end-user-facing public documentation hosting (audience is *internal* non-code teams first).
- No model fine-tuning — "learning" means accumulating explicit instructions/skills, which is cheaper, inspectable, and portable across models.
