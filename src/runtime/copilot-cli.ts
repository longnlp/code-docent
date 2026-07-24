/**
 * GitHub Copilot CLI adapter: drives `copilot -p` as a subprocess.
 * (The @github/copilot-sdk stdio interface was removed upstream, so the
 * supported programmatic surface is the CLI.) Read-only enforcement:
 * allow the `read` tool kind, deny `write` and `shell`, scope paths to the
 * repo via --add-dir. Auth: COPILOT_GITHUB_TOKEN > GH_TOKEN > GITHUB_TOKEN
 * or prior interactive `copilot` login.
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';
import { runSubprocess, binaryAvailable, defaultTimeoutMs } from './subprocess.js';

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
    task.onProgress?.({
      kind: 'status',
      detail: 'copilot -s mode gives no live tool stream — elapsed clock / heartbeat only',
    });
    // --no-ask-user is critical headless: without it copilot pauses for
    // confirmation and hangs until the timeout. read allowed, write/shell denied.
    const args = ['-p', task.prompt, '-s', '--no-ask-user', '--deny-tool', 'write', '--deny-tool', 'shell'];
    if (task.repoDir) {
      args.push('--allow-tool', 'read', '--add-dir', task.repoDir);
    }
    if (task.model) args.push('--model', task.model);

    const r = await runSubprocess('copilot', args, {
      cwd: task.repoDir,
      timeoutMs: task.timeoutMs ?? defaultTimeoutMs(),
    });
    if (r.code !== 0) {
      throw new RuntimeError(this.name, `exit ${r.code}: ${r.stderr.slice(0, 500) || r.stdout.slice(0, 500)}`);
    }
    const text = r.stdout.trim();
    if (!text) throw new RuntimeError(this.name, 'empty response');

    // The CLI does not report token usage in -s mode.
    return {
      text,
      usage: { inputTokens: 0, outputTokens: 0 },
      runtime: this.name,
      model: task.model,
      durationMs: Date.now() - started,
    };
  }
}
