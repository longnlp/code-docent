# CodeDocent

> A *docent* explains the museum's collection to visitors who never touch it.
> Here the collection is your code; the visitors are product, QA, and support.

CodeDocent generates **audience-first documentation from a code repository** —
organized by feature and product behavior, not by code structure — with a human
curator in the loop, persistent learned "skills", and (later) a chat interface for
non-code teams with a knowledge-gap feedback loop.

Planning and design docs live in [docs/](docs/README.md).
The generation method is described in [docs/09-generation-method.md](docs/09-generation-method.md).

## Status

Early prototype (Phase 1). Working today: multi-runtime agent layer, Pass 0 prescan,
Pass 1 feature inventory, Pass 2 trace + render of a feature page into `workspace/<project>/drafts/`.

## Quickstart

```bash
npm install
npx tsx src/cli.ts doctor        # which agent runtimes are usable on this machine?

# Pass 0+1: build the feature inventory (review workspace/<p>/inventory.md when done)
npx tsx src/cli.ts scan --project myapp --repo /path/to/repo

# Pass 2: trace one feature and render its draft page
npx tsx src/cli.ts write <feature-slug> --project myapp --repo /path/to/repo
```

## Agent runtimes (pick any one)

CodeDocent talks to LLMs through a runtime adapter — use whichever you have access to:

| Runtime | Needs | Notes |
|---|---|---|
| `claude-sdk` | `ANTHROPIC_API_KEY` | Claude Agent SDK |
| `claude-cli` | `claude` CLI installed & logged in | uses the CLI's own auth (subscription or key) |
| `copilot-cli` | `copilot` CLI + `GH_TOKEN`/login | GitHub Copilot subscription |
| `gemini-cli` | `gemini` CLI + `GEMINI_API_KEY`/login | set `GEMINI_BIN` to use Antigravity |
| `anthropic-api` | `ANTHROPIC_API_KEY` | raw API, built-in read-only tool loop |
| `openai-api` | `OPENAI_API_KEY` (+ `OPENAI_BASE_URL` for Azure/vLLM/Ollama…) | any OpenAI-compatible endpoint, incl. local models |

Select with `--runtime <name>` or `CODEDOCENT_RUNTIME=<name>`; otherwise the first
usable runtime is picked. All learned knowledge lives in markdown skill files
(`workspace/<project>/skills/`), so switching runtimes never loses curation.

Agents run **read-only** against the repo in every runtime (native tool permissions
for the SDK/CLIs; a sandboxed tool loop for the raw APIs).

### Setting up the terminal-CLI runtimes

**Claude Code CLI** (`claude-cli` runtime — works with a Claude subscription, no API key):

```bash
npm install -g @anthropic-ai/claude-code
claude                      # first run: log in (Claude Pro/Max or Console account)
npx tsx src/cli.ts doctor   # should show ✅ claude-cli
CODEDOCENT_RUNTIME=claude-cli npx tsx src/cli.ts scan --project myapp --repo /path/to/repo
```

Under the hood CodeDocent runs `claude -p <prompt> --output-format json
--allowedTools Read,Glob,Grep` with the repo as working directory — read-only,
using whatever auth the CLI has.

**GitHub Copilot CLI** (`copilot-cli` runtime — works with a Copilot subscription):

```bash
npm install -g @github/copilot
copilot                     # first run: /login (GitHub device flow)
                            # or set COPILOT_GITHUB_TOKEN / GH_TOKEN instead
npx tsx src/cli.ts doctor   # should show ✅ copilot-cli
CODEDOCENT_RUNTIME=copilot-cli npx tsx src/cli.ts scan --project myapp --repo /path/to/repo
```

Under the hood: `copilot -p <prompt> -s --allow-tool read --deny-tool write
--deny-tool shell --add-dir <repo>`. Pick a model with `--model` (e.g.
`--model claude-sonnet-4.6` or `gpt-5.2` — whatever your Copilot plan offers).

Gemini CLI is analogous: `npm install -g @google/gemini-cli`, log in or set
`GEMINI_API_KEY`, select `gemini-cli`.

## Workspace layout

```
workspace/<project>/
  skills/       style-guide.md, glossary.md, rules.md, repo-map.md — the learned knowledge
  drafts/       generated pages awaiting admin review (fact sheet in front-matter)
  published/    what end users will see (nothing lands here without admin action)
  prescan.json  Pass 0 output
  inventory.md  Pass 1 output (admin reviews this)
  runs.jsonl    per-agent-run metrics: tokens, cost, duration (F9)
```

## Development

- `npm run typecheck`
- Fixture repo for development: `git clone --depth 1 https://github.com/Radarr/Radarr.git fixtures/Radarr`
- Deploy/feedback workflow for machines where this repo's authors have no code access:
  [docs/08-dev-deploy-feedback-workflow.md](docs/08-dev-deploy-feedback-workflow.md)
