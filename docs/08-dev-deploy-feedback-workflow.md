# 08 — Development, Deployment & Feedback Workflow

Context (2026-07-13): the development environment (where the owner works with Claude
Code on CodeDocent itself) **cannot reach the real code repositories**. The prototype
must therefore be built here, deployed to a **target server** that does have repo
access, used there, and the results brought back for the next iteration.

## The three loops

```
┌── DEV (this environment, with Claude Code) ─────────────────────────────┐
│  CodeDocent source in git ──▶ develop & test against FIXTURE repos ──▶  │
│  tag release / build image                                              │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ deploy (git pull / docker pull / scp tarball)
┌───────────────▼── TARGET SERVER (has access to real repos) ─────────────┐
│  run CodeDocent ──▶ admin generates & curates docs ──▶ end users chat   │
│  everything lands in workspace/ (markdown + sqlite + logs)              │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ export-feedback bundle (admin-reviewed, optionally redacted)
┌───────────────▼── back to DEV ──────────────────────────────────────────┐
│  drop bundle into feedback/ ──▶ Claude analyzes ──▶ fix/improve ──▶     │
│  next release                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## 1. Dev loop — building without the real code

- **CodeDocent's own source lives in a git repo** (GitHub private repo recommended;
  this environment has internet access, so push/pull works from here).
- Because the real repos are unreachable here, development uses **fixture guinea-pig
  repos**: one or two open-source projects with a stack similar to the real target,
  checked into `fixtures/` or cloned on demand. Every feature must be exercisable
  against fixtures — this also gives us repeatable tests and demo material.
- The Phase 1–3 exit tests ([05-prototype-plan.md](05-prototype-plan.md)) run against
  fixtures first; the *real* validation of the same tests happens on the target server.

### Chosen fixture repos (target stack: C# backend + React web — confirmed 2026-07-13)

| Fixture | Stack | Role |
|---|---|---|
| **[Radarr](https://github.com/Radarr/Radarr)** (or Sonarr — same ".NET/React base stack" family) | .NET/C# backend + React frontend, **single repo** (`src/` + `frontend/`), mid-size | **Primary realism fixture.** Rich, user-visible product behavior that non-devs genuinely ask about (quality profiles, custom formats, import rules, notifications, error states) — ideal for judging audience-first doc quality and the Phase 1 skills-transfer test |
| **[CleanArchitecture template app](https://github.com/jasontaylordev/CleanArchitecture)** (`dotnet new ca-sln -cf react`) | ASP.NET Core Web API + React SPA, small | **Fast-iteration fixture.** Minutes-cheap smoke tests of the pipelines during development; too thin in business logic to judge doc quality, so it never gates a phase exit |

Radarr's single-repo layout (C# and React side by side) also conveniently mirrors both
halves of the real target in one workspace. If the real product is closer to another
domain (e.g. commerce, workflow), we can swap/add a fixture later — nothing binds to
Radarr specifically.

## 2. Deploy loop — getting it onto the target server

Requirement on the target server: **outbound HTTPS to the LLM provider** (the prototype
cannot run without model API access) + Docker or a recent Node/Python runtime.

| Transfer option | When to use |
|---|---|
| `git clone/pull` from the private repo + install script | Server has internet — simplest, recommended |
| Docker image (pushed to a registry, or `docker save` → `scp` → `docker load`) | Reproducible installs; server without registry access |
| Plain tarball via `scp`/`rsync` (or even file share/USB) | Fully restricted networks |

Runtime configuration via a single `.env`: LLM API key(s), path/URL of the real repo,
port, admin credentials. The workspace (`workspace/<project>/`) sits on a mounted
volume/directory so upgrades never touch curated data.

> Note: since the target server must reach the LLM API anyway, it can usually also run
> **Claude Code directly**. If policy allows, that's a shortcut worth considering for
> debugging on the server — but the primary workflow stays "develop here, deploy there,"
> so nothing depends on it.

## 3. Feedback loop — getting results back for iteration

The prototype gets a built-in **`codedocent export-feedback`** command that produces a
single archive designed to be shared with the developing AI (me) without leaking code:

| Bundle content | Purpose |
|---|---|
| `metrics.json` | tokens & cost per operation, latencies, page counts, gap counts — spot cost/perf problems |
| `runs/*.log` | structured agent run logs (steps, tool calls, errors, retries) — diagnose failures |
| `skills/` snapshot | judge whether the distiller produced good rules; the core Phase 1 signal |
| `pages/` samples | admin-selected generated pages (before/after curation) — judge output quality |
| `gaps.json` | the gap inbox export — what end users asked that we couldn't answer |
| `notes.md` | free-form admin observations: what worked, what annoyed, what surprised |

Redaction: `--redact` strips source-code snippets and rewrites file paths to hashes in
logs; the admin reviews the bundle before it leaves the server. (Generated *pages*
contain product behavior descriptions by design — the admin decides which samples are
shareable.)

Transfer back: commit the bundle to a `feedback/` directory (or dedicated branch) of the
CodeDocent repo, or `scp` it and drop it into this environment. Either way, iteration
starts with "here's the bundle from run N" and I analyze it.

## Design consequences (added to requirements)

- **F8 (P0)** — deployability: one-command install (Docker Compose or a single script),
  zero external services (already true: filesystem + SQLite), workspace on a volume,
  config via `.env`.
- **F9 (P0)** — observability for remote feedback: structured run logs + `metrics.json`
  from day one, and the `export-feedback` command with redaction. Built early because
  *all* real-world debugging will flow through it.
- Fixture repos are part of the codebase and CI, not an afterthought.
