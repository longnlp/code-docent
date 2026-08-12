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

    // Emit activity lines as live progress. We do NOT drop them from the result
    // text — for the exploration roles the answer is pulled out by fenced/loose
    // JSON/YAML extraction downstream, and dropping lines risks eating a boxed
    // answer (copilot may wrap output in a "│ " gutter). Only the verbatim
    // writer/answerer roles get activity stripped, for a clean page body.
    const activityLines: string[] = [];
    const onStdoutLine = (line: string) => {
      if (ACTIVITY_HEADER.test(line)) {
        task.onProgress?.({ kind: 'tool', detail: line.replace(ACTIVITY_HEADER, '').trim() });
        activityLines.push(line);
      } else if (ACTIVITY_CONT.test(line)) {
        activityLines.push(line);
      }
    };
    const verbatim = task.role === 'writer' || task.role === 'answerer';

    const r = await runSubprocess('copilot', args, {
      cwd: task.repoDir,
      timeoutMs: task.timeoutMs ?? defaultTimeoutMs(),
      // Copilot does not stream its final answer — it goes silent while the
      // model writes the whole response, then prints it at once. So its idle
      // window must tolerate a full silent generation; use a higher floor than
      // the streaming runtimes.
      idleTimeoutMs: Math.max(idleTimeoutMs(), 900_000),
      onStdoutLine,
    });
    if (r.code !== 0) {
      throw new RuntimeError(
        this.name,
        `exit ${r.code}: ${r.stderr.slice(0, 500) || r.stdout.slice(0, 500)}`,
      );
    }
    // Exploration roles (scanner/tracer): return the FULL raw output so
    // downstream extraction can find the JSON/YAML however copilot framed it.
    // Verbatim roles: remove the activity tree for a clean page body.
    let text = r.stdout.trim();
    if (verbatim && activityLines.length) {
      const drop = new Set(activityLines);
      text = r.stdout
        .split('\n')
        .filter((l) => !drop.has(l))
        .join('\n')
        .trim();
    }
    if (!text) throw new RuntimeError(this.name, 'empty response from copilot');

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
