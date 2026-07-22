# CodeDocent — Planning Docs

> **CodeDocent**: a docent explains the museum's collection to visitors who never touch
> it. Here, the collection is the code; the visitors are product, QA, and support.
>
> Status: **Discussion / planning phase** (started 2026-07-10; name decided 2026-07-13).
> These docs capture research, requirements, and decisions before we build a prototype.

## The idea in one paragraph

A system where an **admin connects a code repository** (GitHub or local) and works
**interactively with an LLM** to generate product-oriented documentation from the code.
Through this iteration the system **learns reusable "skills"** (style, terminology,
structure rules) so documents can be **regenerated automatically when code changes**.
**End users** (product, QA, support — people who should never touch the code) get a
**chat interface** that answers questions about product logic and flows from the curated
documentation. Questions the LLM **cannot answer are recorded** for the admin to review
and improve the docs — a continuous knowledge-gap feedback loop.

## Reading order

| Doc | What it covers |
|---|---|
| [01-problem-and-vision.md](01-problem-and-vision.md) | Problem statement, target personas, what makes this different |
| [02-competitive-landscape.md](02-competitive-landscape.md) | Google Code Wiki, DeepWiki, understand-anything, Swimm, Driver AI — and the gap we fill |
| [03-requirements.md](03-requirements.md) | Functional & non-functional requirements for admin side, end-user side, learning loop |
| [04-architecture.md](04-architecture.md) | Proposed architecture, key design decisions and their rationale |
| [05-prototype-plan.md](05-prototype-plan.md) | MVP scope, suggested tech stack, phased milestones |
| [06-open-questions.md](06-open-questions.md) | Decision log — all questions resolved 2026-07-13 except the guinea-pig repo pick |
| [07-viability-assessment.md](07-viability-assessment.md) | Honest "is this idea useful?" analysis: evidence, risks, kill criteria |
| [08-dev-deploy-feedback-workflow.md](08-dev-deploy-feedback-workflow.md) | How we develop here (no repo access), deploy to the target server, and get feedback back |
| [09-generation-method.md](09-generation-method.md) | How docs are actually generated from code: passes, fact sheets, worked example |

## Core thesis

Existing AI code-wiki tools answer *"how does this code work?"* for **developers**.
This project answers *"how does this product behave and why?"* for **everyone else** —
with a human curator in the loop and a system that gets smarter from every correction
and every unanswered question.
