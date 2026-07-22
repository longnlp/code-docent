/**
 * Claude Agent SDK adapter (@anthropic-ai/claude-agent-sdk).
 * Requires ANTHROPIC_API_KEY (the SDK does not use Claude Code's login);
 * for subscription-auth machines use the claude-cli runtime instead.
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';

const READ_ONLY_TOOLS = ['Read', 'Glob', 'Grep'];

export class ClaudeSdkRuntime implements AgentRuntime {
  readonly name = 'claude-sdk';
  readonly description = 'Claude Agent SDK (needs ANTHROPIC_API_KEY)';

  async check(): Promise<RuntimeCheck> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, detail: 'ANTHROPIC_API_KEY is not set' };
    }
    try {
      await import('@anthropic-ai/claude-agent-sdk');
      return { ok: true, detail: 'SDK installed, API key present' };
    } catch {
      return { ok: false, detail: 'package @anthropic-ai/claude-agent-sdk not installed' };
    }
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');
    const started = Date.now();

    const options: Record<string, unknown> = {
      settingSources: [],
      permissionMode: 'dontAsk',
      allowedTools: task.repoDir ? READ_ONLY_TOOLS : [],
      maxTurns: task.maxTurns ?? 50,
    };
    if (task.repoDir) options.cwd = task.repoDir;
    if (task.model) options.model = task.model;

    let text = '';
    let usage = { inputTokens: 0, outputTokens: 0, costUsd: undefined as number | undefined };

    for await (const message of query({ prompt: task.prompt, options }) as AsyncIterable<any>) {
      if (message.type === 'result') {
        if (message.subtype !== 'success') {
          throw new RuntimeError(this.name, `run ended with ${message.subtype}`);
        }
        text = message.result ?? '';
        usage = {
          inputTokens: message.usage?.input_tokens ?? 0,
          outputTokens: message.usage?.output_tokens ?? 0,
          costUsd: message.total_cost_usd,
        };
      }
    }
    if (!text) throw new RuntimeError(this.name, 'no result message received');

    return { text, usage, runtime: this.name, model: task.model, durationMs: Date.now() - started };
  }
}
