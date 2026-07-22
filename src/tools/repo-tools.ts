/**
 * Sandboxed read-only repo tools for the raw-API runtimes (anthropic-api,
 * openai-api), which own their agent loop. CLI/SDK runtimes use their native
 * tools instead. Pure TypeScript (no shelling out) for portability.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'bin', 'obj', 'dist', 'build', 'out',
  '.idea', '.vs', '.vscode', 'packages', '__pycache__', '.next',
]);
const MAX_FILE_BYTES = 1_000_000;
const MAX_READ_LINES = 2000;
const MAX_GREP_RESULTS = 60;
const MAX_WALK_FILES = 100_000;

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const REPO_TOOL_DEFS: ToolDef[] = [
  {
    name: 'list_dir',
    description: 'List entries of a directory (repo-relative path, "" = repo root). Directories end with "/".',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'repo-relative directory path' } },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: `Read a text file (repo-relative path). Returns numbered lines. Optional offset (1-based start line) and limit (max lines, default ${MAX_READ_LINES}).`,
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        offset: { type: 'number' },
        limit: { type: 'number' },
      },
      required: ['path'],
    },
  },
  {
    name: 'grep',
    description: `Search file contents with a JavaScript regex. Returns "path:line: text" matches (max ${MAX_GREP_RESULTS}). Optional dir to scope the search, and extension filter like ".cs".`,
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'JavaScript regular expression' },
        dir: { type: 'string', description: 'repo-relative directory to search (default repo root)' },
        ext: { type: 'string', description: 'only files with this extension, e.g. ".cs"' },
      },
      required: ['pattern'],
    },
  },
];

function resolveSafe(repoDir: string, rel: string): string {
  const repoReal = fs.realpathSync(repoDir);
  const target = path.resolve(repoReal, rel === '' ? '.' : rel);
  // realpath the closest existing ancestor to defeat symlink escapes
  let probe = target;
  while (!fs.existsSync(probe)) probe = path.dirname(probe);
  const probeReal = fs.realpathSync(probe);
  if (probeReal !== repoReal && !probeReal.startsWith(repoReal + path.sep)) {
    throw new Error(`path escapes the repository sandbox: ${rel}`);
  }
  return target;
}

function* walkFiles(root: string): Generator<string> {
  const stack = [root];
  let seen = 0;
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name) && !e.name.startsWith('.')) stack.push(full);
      } else if (e.isFile()) {
        if (++seen > MAX_WALK_FILES) return;
        yield full;
      }
    }
  }
}

function isProbablyText(buf: Buffer): boolean {
  const n = Math.min(buf.length, 512);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
  return true;
}

export function runRepoTool(repoDir: string, name: string, input: Record<string, unknown>): string {
  try {
    switch (name) {
      case 'list_dir': {
        const dir = resolveSafe(repoDir, String(input.path ?? ''));
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        return entries
          .filter((e) => !IGNORED_DIRS.has(e.name))
          .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
          .sort()
          .join('\n') || '(empty directory)';
      }
      case 'read_file': {
        const file = resolveSafe(repoDir, String(input.path ?? ''));
        const stat = fs.statSync(file);
        if (stat.size > MAX_FILE_BYTES) return `error: file too large (${stat.size} bytes)`;
        const buf = fs.readFileSync(file);
        if (!isProbablyText(buf)) return 'error: binary file';
        const lines = buf.toString('utf8').split('\n');
        const offset = Math.max(1, Number(input.offset ?? 1));
        const limit = Math.min(MAX_READ_LINES, Number(input.limit ?? MAX_READ_LINES));
        return lines
          .slice(offset - 1, offset - 1 + limit)
          .map((l, i) => `${offset + i}\t${l}`)
          .join('\n');
      }
      case 'grep': {
        const root = resolveSafe(repoDir, String(input.dir ?? ''));
        const re = new RegExp(String(input.pattern), 'i');
        const ext = input.ext ? String(input.ext) : undefined;
        const results: string[] = [];
        for (const file of walkFiles(root)) {
          if (ext && !file.endsWith(ext)) continue;
          let buf: Buffer;
          try {
            if (fs.statSync(file).size > MAX_FILE_BYTES) continue;
            buf = fs.readFileSync(file);
          } catch {
            continue;
          }
          if (!isProbablyText(buf)) continue;
          const lines = buf.toString('utf8').split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              results.push(`${path.relative(repoDir, file)}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
              if (results.length >= MAX_GREP_RESULTS) {
                results.push(`(truncated at ${MAX_GREP_RESULTS} matches)`);
                return results.join('\n');
              }
            }
          }
        }
        return results.join('\n') || '(no matches)';
      }
      default:
        return `error: unknown tool ${name}`;
    }
  } catch (err) {
    return `error: ${(err as Error).message}`;
  }
}
