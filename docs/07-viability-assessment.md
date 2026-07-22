# 07 — Is This Idea Useful? An Honest Assessment

Written 2026-07-13 at the owner's request. Deliberately includes the arguments *against*.

## Verdict

**Yes — the problem is real and the specific angle is sound — with two make-or-break
assumptions that the prototype is designed to test.** This is a good idea to prototype
and a genuinely useful internal tool almost regardless of outcome; whether it can grow
beyond that depends on the assumptions below.

## Evidence the problem is real

1. **Multiple funded companies are attacking adjacent versions of it.** Google (Code
   Wiki), Cognition (DeepWiki), Swimm, Driver AI (YC, TechCrunch-covered), RepoLens —
   documentation-from-code is a validated space, and Driver AI and RepoLens specifically
   market to product/non-technical roles, confirming demand from our exact audience.
2. **The "interrupt an engineer" tax is universal.** Every PM spec, QA test plan, and
   support escalation that depends on "what does the system actually do today?"
   currently costs engineering time. GitHub's 12k-developer study found ~50%
   productivity boost from reliable, up-to-date docs.
3. **The support-tooling world already proved the gap loop.** Knowledge-gap detection
   with a reviewer inbox is a mature, paid-for pattern in customer-support AI
   (Forethought, Fini, Talkative). We're transplanting a proven loop to a new domain,
   not inventing an unproven one.

## What's genuinely differentiated

The individual pieces all exist somewhere. The combination doesn't:

- Code Wiki / DeepWiki have generation + chat, but **no curation, no audience
  separation, no gap loop** — and their docs speak developer.
- Swimm has code-anchored freshness, but humans write the docs.
- Driver AI / RepoLens speak to product roles, but there's **no visible mechanism for
  the org to teach the system** and no unanswered-question flywheel.
- Support KB tools have the gap loop, but know nothing about code.

The moat, if there is one, is not the generation (everyone has that) — it's the
**accumulated curation**: months of glossary entries, rules, repo-map hints, and
gap-resolutions make *your* instance dramatically better than a fresh run of any
competitor on the same repo. That's a switching cost that compounds.

## The two make-or-break assumptions

1. **Skills transfer** — admin corrections, distilled into markdown rules, must
   measurably improve *future* generations (including after code changes). If every
   regeneration needs the same corrections again, the product collapses into
   "hand-edited docs with an AI first draft," which is much weaker.
   → *Tested by Phase 1's exit test, deliberately first.*
2. **Non-code teams will ask the tool instead of the engineer** — behavior change is
   the hard part of every internal-tool story. If answers are slow, wrong once, or
   miss often, users go back to Slack-ing a developer and never return.
   → *Tested by Phase 2's 20-question test with a real PM/QA/support person.*

## Honest risks and counterarguments

| Risk | Severity | Mitigation / why we proceed anyway |
|---|---|---|
| **Curation burden**: if the admin needs many hours per week, the tool has just moved the documentation tax, not removed it | High | Success criterion #1 caps this: hours (not days) to first useful wiki; incremental sync + skills should make maintenance minutes-per-change. Measure it honestly. |
| **One confident wrong answer destroys trust** (QA tests wrong behavior; support misinforms a customer) | High | Docs-only answering + human review + decline gate is the whole design. F1 makes truthfulness the top NFR. This risk is why competitors' "chat with raw code" is weak for this audience — our design is the mitigation. |
| **Incumbents pivot**: Google/Cognition could add an "explain for PMs" mode in a quarter | Medium | Likely eventually. Our defense is the curation flywheel + self-host/local (they're cloud/public-repo focused) + the gap loop, which requires product workflow, not just a model. Also: we're building a prototype, not betting a company yet. |
| **Some product truth isn't in the code** (pricing decided in spreadsheets, behavior behind remote config, "why" decisions in meetings) | Medium | True and unavoidable. The gap loop is the answer: those questions get declined, land in the inbox, and the admin documents them from human knowledge. The wiki becomes code-derived *plus* curated tribal knowledge — arguably more valuable. |
| **LLM cost/quality variance across the multi-runtime goal** | Low-Med | Adapter design (D5) + skills in neutral markdown means we can chase quality/cost per task. Prototype measures tokens per phase. |
| **"Docs are a feature, not a product"** — hard to sell standalone | Low (for now) | Deferred (Q2). Even as a pure internal tool for our own repos this pays for its build cost; commercialization is a later decision with real data. |

## What would make us stop

- Phase 1 exit test fails after honest iteration on the distiller (skills don't
  transfer → premise broken).
- Phase 2 shows the target users won't change behavior even with good answers.
- A hands-on trial of Driver AI / RepoLens (recommended before Phase 2) shows they
  already deliver the curated, no-code-exposure experience — then we use them instead
  and save the build.

## Bottom line

The idea sits at a real intersection that nobody currently occupies: *curated*,
*audience-first*, *code-derived* knowledge with a *closed feedback loop*. The plan
attacks the riskiest assumptions first and cheaply. Worst realistic case: a few weeks
of work yields a working internal doc generator for our own repos plus a clear-eyed
answer about the bigger opportunity. That is a good trade.
