/**
 * Raw Anthropic Messages API adapter: we run the tool-use loop ourselves
 * with the sandboxed read-only repo tools. Works against any
 * Anthropic-compatible endpoint (ANTHROPIC_BASE_URL to override).
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';
import { REPO_TOOL_DEFS, runRepoTool } from '../tools/repo-tools.js';

const DEFAULT_MODEL = 'claude-sonnet-5';

export class AnthropicApiRuntime implements AgentRuntime {
  readonly name = 'anthropic-api';
  readonly description = 'Anthropic Messages API with built-in tool loop (needs ANTHROPIC_API_KEY)';

  private baseUrl(): string {
    return (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, '');
  }

  async check(): Promise<RuntimeCheck> {
    return process.env.ANTHROPIC_API_KEY
      ? { ok: true, detail: `API key present, endpoint ${this.baseUrl()}` }
      : { ok: false, detail: 'ANTHROPIC_API_KEY is not set' };
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const started = Date.now();
    const model = task.model ?? DEFAULT_MODEL;
    const maxTurns = task.maxTurns ?? 50;
    const messages: unknown[] = [{ role: 'user', content: task.prompt }];
    const usage = { inputTokens: 0, outputTokens: 0 };

    for (let turn = 0; turn < maxTurns; turn++) {
      const resp = await fetch(`${this.baseUrl()}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          messages,
          ...(task.repoDir ? { tools: REPO_TOOL_DEFS } : {}),
        }),
      });
      if (!resp.ok) {
        throw new RuntimeError(this.name, `HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      }
      const data: any = await resp.json();
      usage.inputTokens += data.usage?.input_tokens ?? 0;
      usage.outputTokens += data.usage?.output_tokens ?? 0;

      if (data.stop_reason === 'tool_use' && task.repoDir) {
        messages.push({ role: 'assistant', content: data.content });
        const results = data.content
          .filter((b: any) => b.type === 'tool_use')
          .map((b: any) => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: runRepoTool(task.repoDir!, b.name, b.input ?? {}),
          }));
        messages.push({ role: 'user', content: results });
        continue;
      }

      const text = (data.content ?? [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
      return { text, usage, runtime: this.name, model, durationMs: Date.now() - started };
    }
    throw new RuntimeError(this.name, `exceeded ${maxTurns} turns without a final answer`);
  }
}
