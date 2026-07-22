import * as fs from 'node:fs';
import * as path from 'node:path';
import { runSubprocess } from '../runtime/subprocess.js';
import type { AgentResult, AgentRole } from '../runtime/types.js';

export interface Workspace {
  root: string;
  skillsDir: string;
  draftsDir: string;
  publishedDir: string;
}

export function openWorkspace(project: string, baseDir = process.cwd()): Workspace {
  const root = path.resolve(baseDir, 'workspace', project);
  const ws: Workspace = {
    root,
    skillsDir: path.join(root, 'skills'),
    draftsDir: path.join(root, 'drafts'),
    publishedDir: path.join(root, 'published'),
  };
  for (const dir of [ws.root, ws.skillsDir, ws.draftsDir, ws.publishedDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return ws;
}

/** Concatenate all skill files into one prompt section. */
export function loadSkills(ws: Workspace): string {
  if (!fs.existsSync(ws.skillsDir)) return '(no skill files yet)';
  const files = fs.readdirSync(ws.skillsDir).filter((f) => f.endsWith('.md')).sort();
  if (files.length === 0) return '(no skill files yet)';
  return files
    .map((f) => `<skill file="${f}">\n${fs.readFileSync(path.join(ws.skillsDir, f), 'utf8')}\n</skill>`)
    .join('\n\n');
}

export async function repoCommit(repoDir: string): Promise<string> {
  try {
    const r = await runSubprocess('git', ['-C', repoDir, 'rev-parse', '--short', 'HEAD'], {
      timeoutMs: 10_000,
    });
    if (r.code === 0) return r.stdout.trim();
  } catch {
    /* not a git repo */
  }
  return 'unknown';
}

/** F9: structured per-operation metrics, one JSON line per agent run. */
export function logRun(ws: Workspace, role: AgentRole, command: string, result: AgentResult | { error: string }): void {
  const entry = {
    ts: new Date().toISOString(),
    command,
    role,
    ...('error' in result
      ? { ok: false, error: result.error }
      : {
          ok: true,
          runtime: result.runtime,
          model: result.model,
          durationMs: result.durationMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          costUsd: result.usage.costUsd,
        }),
  };
  fs.appendFileSync(path.join(ws.root, 'runs.jsonl'), JSON.stringify(entry) + '\n');
}
