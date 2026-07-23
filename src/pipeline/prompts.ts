/**
 * Prompt templates for the pipeline agents. These are the prompts validated
 * by the manual dry run on the Radarr fixture (2026-07-14) — see
 * docs/09-generation-method.md. Change with care: prompt edits invalidate
 * comparability of runs.jsonl metrics across versions.
 */

import type { PrescanReport } from './prescan.js';

export interface FeatureSpec {
  slug: string;
  name: string;
  description?: string;
  entryPoints?: string[];
  codeAreas?: string[];
}

export function scannerPrompt(pre: PrescanReport, skills: string, commit: string): string {
  return `You are the feature-inventory scanner of a documentation generator. You are inside a code repository (read-only). Commit: ${commit}.
Your ONLY tools are Read, Glob, and Grep — do not attempt Bash or any other tool; such calls are denied and waste turns.

A deterministic pre-scan already extracted this skeleton — trust it and start from these entry points instead of exploring blindly:

${JSON.stringify({ languages: pre.languages, frameworks: pre.frameworks, routeFiles: pre.routeFiles, controllerFiles: pre.controllerFiles.slice(0, 60), scheduledTaskRegistrars: pre.scheduledTaskRegistrars, backgroundJobFiles: pre.backgroundJobFiles, eventHandlerCount: pre.eventHandlerCount, healthCheckCount: pre.healthCheckCount, localizationFiles: pre.localizationFiles, testDirs: pre.testDirs }, null, 2)}

Project skill files (obey them, especially repo-map hints and exclusions):

${skills}

Task: cluster the product's behavior into PRODUCT FEATURES — the units a product manager, QA engineer, or support agent would recognize ("Adding movies", "Quality profiles"), NOT code modules. 10-30 features is typical.

Cover ALL THREE kinds of entry point, not just the UI:
1. **User-facing screens** — UI routes and the API controllers behind them.
2. **Background / automatic behavior** — scheduled tasks and background jobs that run on their own with no user click. READ the scheduledTaskRegistrars file(s) above to enumerate what runs automatically and how often (e.g. periodic release searches, backups, library refresh, cleanup/housekeeping, import-list sync, update checks). These are real features users ask about ("how often does it check?", "when does it back up?") — give them their own feature entries, grouped sensibly. Also account for health/monitoring checks and significant event-driven behavior.
3. Anything in backgroundJobFiles that is product-meaningful but not tied to a screen.

Read the registrar and a few page/controller/job files as needed.

Output EXACTLY this structure:
1. A markdown table: | # | Feature | User entry points | Key code areas |
2. A fenced json block:
\`\`\`json
{"features": [{"slug": "kebab-case", "name": "Feature name", "description": "one sentence", "entryPoints": ["/route", "..."], "codeAreas": ["path/prefix", "..."]}]}
\`\`\`
No other commentary. Every feature MUST have at least one entry point or code area you actually saw.`;
}

export function tracerPrompt(feature: FeatureSpec, skills: string, commit: string, factStartId = 1): string {
  return `You are the evidence-collector of a documentation generator. You are inside a code repository (read-only). Commit: ${commit}.
Your ONLY tools are Read, Glob, and Grep — do not attempt Bash or any other tool; such calls are denied and waste turns.

Project skill files (obey repo-map hints and exclusions; the style guide tells you what the eventual audience cares about):

${skills}

Task: trace the complete vertical slice of the feature "${feature.name}"${feature.description ? ` (${feature.description})` : ''} and return a FACT SHEET. Do NOT summarize architecture — collect specific, citable behavioral facts a product manager, QA engineer, or support agent would care about.

Known entry points: ${JSON.stringify(feature.entryPoints ?? [])}. Key code areas: ${JSON.stringify(feature.codeAreas ?? [])}.

Collect facts across these categories:
- ui: what the user sees and can do — inputs, options, defaults, client-side validation, labels
- api: endpoints the UI calls (method + path)
- rule: server-side business rules and validations — required fields, uniqueness, limits, state transitions
- failure: every failure path with the EXACT user-facing message text (cross-reference localization files; quote strings verbatim; note when a message is hardcoded/non-localized)
- lifecycle: everything that happens AFTER the user action, stage by stage — background jobs, schedules and retry intervals, notifications, where the user can watch progress on which screen
- test: expected behaviors and edge cases encoded in tests (test names and assertions); also NOTE coverage gaps you observe

If this feature is BACKGROUND / AUTOMATIC behavior (a scheduled task or job, not a screen), center the trace on: what TRIGGERS it (schedule + exact interval, or which event) and whether the interval is configurable; what it DOES, step by step; what the user can SEE or CONTROL (relevant settings, System→Tasks / Activity / History screens, and any health warnings it can raise) and where; and its failure modes. Use the 'lifecycle' category for these facts.

Output EXACTLY one fenced block:
\`\`\`yaml
commit: ${commit}
facts:
  - id: f${factStartId}
    category: ui
    claim: "one precise behavioral statement"
    anchors:
      - "repo-relative/path.ext:START-END"
    evidence: "short verbatim code/string quote"
\`\`\`

Rules:
- Target 15-30 facts. Number sequentially from f${factStartId}.
- Every claim MUST have at least one anchor with line numbers you actually verified by reading the file.
- Exact user-facing message strings are the highest-value facts.
- If a commonly-expected behavior is NOT true in this code, that is a high-value fact — call it out.
- No commentary outside the fenced block.`;
}

export function writerPrompt(feature: FeatureSpec, factsYaml: string, skills: string): string {
  return `You are the page writer of a documentation generator. Render a documentation page for the feature "${feature.name}" for a NON-CODE audience (product managers, QA engineers, support agents).

Project skill files — these are binding rules (style guide, glossary terms, learned rules like lifecycle depth, exclusions):

${skills}

Fact sheet (the ONLY source of truth — you may state nothing that these facts do not support):

\`\`\`yaml
${factsYaml}
\`\`\`

Page structure:
1. H1 title, then a short orientation paragraph.
2. Sections following the user's journey through the feature (what they see/do, in order).
3. Failure paths as a table: | Message (verbatim) | Cause | What to do | — quote exact strings in italics.
4. If the feature involves an action with consequences, a full lifecycle walkthrough per the style guide's learned rules (stages in order, timing/schedules, which screen shows each stage).
5. A final "## For QA" section: edge cases, boundary behaviors, surprising truths, and any test-coverage gaps from the facts.

Rules:
- Cite facts inline as [fN] after each claim (these are kept in the published page).
- NEVER mention file names, class names, or code structure in the body.
- Use glossary terms exactly.
- Where the facts are silent, say nothing — do not fill gaps with plausible generalities.
- Output ONLY the markdown page body (no front-matter, no commentary).`;
}
