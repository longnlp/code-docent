/**
 * Google Gemini CLI adapter: drives `gemini -p` in headless mode.
 * Read-only tools (read_file/glob/grep) are auto-approved by the CLI;
 * we do NOT pass --yolo, so write/shell tools stay blocked in
 * non-interactive runs. Auth: GEMINI_API_KEY or GOOGLE_API_KEY, or the
 * CLI's own OAuth login. (Google's Antigravity CLI exposes a compatible
 * headless surface; point GEMINI_BIN at it to use that instead.)
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';
import { runSubprocess, binaryAvailable, defaultTimeoutMs, idleTimeoutMs } from './subprocess.js';

function bin(): string {
  return process.env.GEMINI_BIN ?? 'gemini';
}

export class GeminiCliRuntime implements AgentRuntime {
  readonly name = 'gemini-cli';
  readonly description = 'Google Gemini CLI subprocess (`gemini -p`); set GEMINI_BIN to use Antigravity';

  async check(): Promise<RuntimeCheck> {
    const version = await binaryAvailable(bin());
    if (!version) return { ok: false, detail: `\`${bin()}\` not on PATH` };
    const hasKey = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
    return {
      ok: true,
      detail: `found ${version}${hasKey ? ', API key present' : ' (no key env var — relies on CLI login)'}`,
    };
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const started = Date.now();
    const args = ['-p', task.prompt];
    if (task.model) args.push('-m', task.model);

    const r = await runSubprocess(bin(), args, {
      cwd: task.repoDir,
      timeoutMs: task.timeoutMs ?? defaultTimeoutMs(),
      idleTimeoutMs: idleTimeoutMs(),
      // gemini streams its output progressively; surface a truncated peek
      onStdoutLine: task.onProgress
        ? (line) => line.trim() && task.onProgress!({ kind: 'text', detail: line.trim().slice(0, 80) })
        : undefined,
    });
    if (r.code !== 0) {
      throw new RuntimeError(this.name, `exit ${r.code}: ${r.stderr.slice(0, 500) || r.stdout.slice(0, 500)}`);
    }
    const text = r.stdout.trim();
    if (!text) throw new RuntimeError(this.name, 'empty response');

    return {
      text,
      usage: { inputTokens: 0, outputTokens: 0 },
      runtime: this.name,
      model: task.model,
      durationMs: Date.now() - started,
    };
  }
}
