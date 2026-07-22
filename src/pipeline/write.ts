/**
 * Pass 2 + render: tracer agent collects the anchored fact sheet, writer
 * renders the page from facts + skills, and the draft lands in drafts/
 * with the fact sheet preserved in front-matter.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';
import type { AgentRuntime } from '../runtime/types.js';
import { tracerPrompt, writerPrompt, type FeatureSpec } from './prompts.js';
import { openWorkspace, loadSkills, repoCommit, logRun } from './workspace.js';
import { extractFenced, loadInventory } from './scan.js';

export interface Fact {
  id: string;
  category: string;
  claim: string;
  anchors: string[];
  evidence?: string;
}

export async function runWrite(
  project: string,
  repoDir: string,
  slug: string,
  runtime: AgentRuntime,
  model?: string,
): Promise<string> {
  const ws = openWorkspace(project);
  const feature: FeatureSpec = loadInventory(ws).find((f) => f.slug === slug) ?? {
    slug,
    name: slug.replace(/-/g, ' '),
  };
  const skills = loadSkills(ws);
  const commit = await repoCommit(repoDir);

  // Pass 2a — trace
  let facts: Fact[];
  let factsYaml: string;
  try {
    const traced = await runtime.run({
      role: 'tracer',
      prompt: tracerPrompt(feature, skills, commit),
      repoDir,
      model,
      maxTurns: 60,
    });
    logRun(ws, 'tracer', `write ${slug}`, traced);

    factsYaml = extractFenced(traced.text, 'yaml') ?? extractFenced(traced.text, '') ?? '';
    if (!factsYaml) throw new Error('tracer returned no fenced fact sheet');
    const parsed = YAML.parse(factsYaml);
    facts = (parsed?.facts ?? []) as Fact[];
    const invalid = facts.filter((f) => !f.id || !f.claim || !f.anchors?.length);
    if (facts.length === 0) throw new Error('fact sheet has no facts');
    if (invalid.length > 0) {
      throw new Error(`facts missing id/claim/anchors: ${invalid.map((f) => f.id ?? '?').join(', ')}`);
    }
  } catch (err) {
    logRun(ws, 'tracer', `write ${slug}`, { error: (err as Error).message });
    throw err;
  }

  // Pass 2b — render (no repo access: facts are the only source of truth)
  let body: string;
  try {
    const written = await runtime.run({
      role: 'writer',
      prompt: writerPrompt(feature, factsYaml, skills),
      model,
    });
    logRun(ws, 'writer', `write ${slug}`, written);
    body = written.text.trim();
    if (!body.startsWith('#')) {
      const h1 = body.indexOf('\n# ');
      if (h1 >= 0) body = body.slice(h1 + 1);
    }
  } catch (err) {
    logRun(ws, 'writer', `write ${slug}`, { error: (err as Error).message });
    throw err;
  }

  const frontMatter = YAML.stringify({
    title: feature.name,
    feature: feature.slug,
    state: 'draft',
    audience: ['product', 'qa', 'support'],
    source_commit: commit,
    generated: new Date().toISOString().slice(0, 10),
    verified: false,
    runtime: runtime.name,
    facts,
  });

  const outPath = path.join(ws.draftsDir, `${slug}.md`);
  fs.writeFileSync(outPath, `---\n${frontMatter}---\n\n${body}\n`);
  return outPath;
}
