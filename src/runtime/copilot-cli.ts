/**
 * GitHub Copilot CLI adapter: drives `copilot -p` as a subprocess.
 * (The @github/copilot-sdk stdio interface was removed upstream, so the
 * supported programmatic surface is the CLI.)
 *
 * Read-only enforcement: allow the `read` tool + `shell` scoped to read-only
 * commands (repo SEARCH — grep/ls/find — has no dedicated tool in copilot, it
 * runs through `shell`), deny `write`. Auth: COPILOT_GITHUB_TOKEN > GH_TOKEN >
 * GITHUB_TOKEN or a prior interactive `copilot` login.
 *
 * We do NOT use `-s`: it suppresses copilot's activity output, leaving the run
 * silent so you can't tell "working" from "stuck". Instead we stream copilot's
 * activity lines as live progress and reconstruct the answer from the rest;
 * downstream fenced-block extraction (json / yaml) is robust to the remaining
 * decoration.
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';
import { runSubprocess, binaryAvailable, defaultTimeoutMs, idleTimeoutMs } from './subprocess.js';

// Copilot renders tool activity as a box-drawing tree, e.g.
//   ● Read Foo.cs
//     │ Foo.cs
//     └ 77 lines read
// Header lines start with ●/○/►; continuation lines with │/└/├.
const ACTIVITY_HEADER = /^\s*[●○◍►▶]/u;
const ACTIVITY_CONT = /^\s*[│└├╰╭─⎿]/u;

export class CopilotCliRuntime implements AgentRuntime {
  readonly name = 'copilot-cli';
  readonly description = 'GitHub Copilot CLI subprocess (`copilot -p`)';

  async check(): Promise<RuntimeCheck> {
    const version = await binaryAvailable('copilot');
    if (!version) return { ok: false, detail: '`copilot` not on PATH' };
    const hasToken =
      !!process.env.COPILOT_GITHUB_TOKEN || !!process.env.GH_TOKEN || !!process.env.GITHUB_TOKEN;
    return {
      ok: true,
      detail: `found ${version}${hasToken ? ', token present' : ' (no token env var — relies on interactive login)'}`,
    };
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const started = Date.now();
    // --no-ask-user: headless, copilot must not pause for confirmation.
    // shell(<cmd>) allowances let the agent search the repo read-only; write denied.
    const readonlyShell = ['grep', 'rg', 'ls', 'find', 'cat', 'head', 'tail', 'wc', 'sed', 'awk'];
    const args = ['-p', task.prompt, '--no-ask-user', '--deny-tool', 'write'];
    if (task.repoDir) {
      args.push('--allow-tool', 'read', '--add-dir', task.repoDir);
      for (const cmd of readonlyShell) args.push('--allow-tool', `shell(${cmd})`);
    }
    if (task.model) args.push('--model', task.model);

    // Separate activity (→ live progress) from the answer (→ result text).
    const answerLines: string[] = [];
    const onStdoutLine = (line: string) => {
      if (ACTIVITY_HEADER.test(line)) {
        task.onProgress?.({ kind: 'tool', detail: line.replace(ACTIVITY_HEADER, '').trim() });
      } else if (!ACTIVITY_CONT.test(line)) {
        answerLines.push(line);
      }
    };

    const r = await runSubprocess('copilot', args, {
      cwd: task.repoDir,
      timeoutMs: task.timeoutMs ?? defaultTimeoutMs(),
      idleTimeoutMs: idleTimeoutMs(),
      onStdoutLine,
    });
    if (r.code !== 0) {
      throw new RuntimeError(
        this.name,
        `exit ${r.code}: ${r.stderr.slice(0, 500) || r.stdout.slice(0, 500)}`,
      );
    }
    const text = answerLines.join('\n').trim();
    if (!text) throw new RuntimeError(this.name, 'empty response (only activity, no answer text)');

    // copilot does not emit token usage on stdout.
    return {
      text,
      usage: { inputTokens: 0, outputTokens: 0 },
      runtime: this.name,
      model: task.model,
      durationMs: Date.now() - started,
    };
  }
}
