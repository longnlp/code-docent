/**
 * Claude Code CLI adapter: drives `claude -p` as a subprocess.
 * Unlike the SDK, this uses whatever auth the installed CLI has
 * (subscription login or API key) — handy on developer machines.
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';
import { runSubprocess, binaryAvailable, defaultTimeoutMs } from './subprocess.js';

export class ClaudeCliRuntime implements AgentRuntime {
  readonly name = 'claude-cli';
  readonly description = 'Claude Code CLI subprocess (`claude -p`), uses the CLI\'s own login';

  async check(): Promise<RuntimeCheck> {
    const version = await binaryAvailable('claude');
    return version
      ? { ok: true, detail: `found ${version}` }
      : { ok: false, detail: '`claude` not on PATH' };
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const started = Date.now();
    // stream-json (requires --verbose in print mode) emits one JSON message
    // per line as the agent works, enabling live progress reporting.
    const args = ['-p', task.prompt, '--output-format', 'stream-json', '--verbose'];
    if (task.repoDir) {
      args.push('--allowedTools', 'Read,Glob,Grep');
    } else {
      args.push('--allowedTools', '');
    }
    if (task.model) args.push('--model', task.model);
    if (task.maxTurns) args.push('--max-turns', String(task.maxTurns));

    let parsed: any = null;
    const onStdoutLine = (line: string) => {
      if (!line.trim()) return;
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      if (msg.type === 'result') {
        parsed = msg;
      } else if (msg.type === 'assistant' && task.onProgress) {
        for (const block of msg.message?.content ?? []) {
          if (block.type === 'tool_use') {
            const input = block.input ?? {};
            const detail = input.file_path ?? input.path ?? input.pattern ?? input.query ?? '';
            task.onProgress({ kind: 'tool', detail: `${block.name} ${detail}`.trim() });
          } else if (block.type === 'text' && block.text?.trim()) {
            task.onProgress({ kind: 'text', detail: `composing: ${block.text.trim().slice(0, 60)}…` });
          }
        }
      }
    };

    const r = await runSubprocess('claude', args, {
      cwd: task.repoDir,
      timeoutMs: task.timeoutMs ?? defaultTimeoutMs(),
      onStdoutLine,
    });
    if (r.code !== 0) {
      throw new RuntimeError(this.name, `exit ${r.code}: ${r.stderr.slice(0, 500) || r.stdout.slice(0, 500)}`);
    }
    if (!parsed) {
      throw new RuntimeError(this.name, `no result message in output: ${r.stdout.slice(0, 300)}`);
    }
    if (parsed.subtype && parsed.subtype !== 'success') {
      throw new RuntimeError(this.name, `run ended with ${parsed.subtype}`);
    }

    return {
      text: parsed.result ?? '',
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? 0,
        outputTokens: parsed.usage?.output_tokens ?? 0,
        costUsd: parsed.total_cost_usd,
      },
      runtime: this.name,
      model: task.model,
      durationMs: Date.now() - started,
    };
  }
}
