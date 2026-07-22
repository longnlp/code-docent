/**
 * OpenAI-compatible Chat Completions adapter with the same built-in tool
 * loop. Covers OpenAI itself plus any compatible endpoint (Azure OpenAI,
 * vLLM, Ollama, LM Studio, ...) via OPENAI_BASE_URL. Model comes from the
 * task or OPENAI_MODEL.
 */

import type { AgentRuntime, AgentTask, AgentResult, RuntimeCheck } from './types.js';
import { RuntimeError } from './types.js';
import { REPO_TOOL_DEFS, runRepoTool } from '../tools/repo-tools.js';

export class OpenAiApiRuntime implements AgentRuntime {
  readonly name = 'openai-api';
  readonly description = 'OpenAI-compatible API with built-in tool loop (OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL)';

  private baseUrl(): string {
    return (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  async check(): Promise<RuntimeCheck> {
    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_BASE_URL) {
      return { ok: false, detail: 'OPENAI_API_KEY not set (or OPENAI_BASE_URL for keyless local endpoints)' };
    }
    return { ok: true, detail: `endpoint ${this.baseUrl()}, model ${process.env.OPENAI_MODEL ?? '(per task)'}` };
  }

  async run(task: AgentTask): Promise<AgentResult> {
    const started = Date.now();
    const model = task.model ?? process.env.OPENAI_MODEL;
    if (!model) throw new RuntimeError(this.name, 'no model: set task model or OPENAI_MODEL');
    const maxTurns = task.maxTurns ?? 50;

    const tools = REPO_TOOL_DEFS.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));
    const messages: any[] = [{ role: 'user', content: task.prompt }];
    const usage = { inputTokens: 0, outputTokens: 0 };

    for (let turn = 0; turn < maxTurns; turn++) {
      const resp = await fetch(`${this.baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.OPENAI_API_KEY ? { authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          ...(task.repoDir ? { tools } : {}),
        }),
      });
      if (!resp.ok) {
        throw new RuntimeError(this.name, `HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      }
      const data: any = await resp.json();
      usage.inputTokens += data.usage?.prompt_tokens ?? 0;
      usage.outputTokens += data.usage?.completion_tokens ?? 0;

      const msg = data.choices?.[0]?.message;
      if (!msg) throw new RuntimeError(this.name, 'no choices in response');

      if (msg.tool_calls?.length && task.repoDir) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(call.function.arguments ?? '{}');
          } catch {
            /* leave empty; tool reports the error */
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: runRepoTool(task.repoDir, call.function.name, input),
          });
        }
        continue;
      }

      return {
        text: msg.content ?? '',
        usage,
        runtime: this.name,
        model,
        durationMs: Date.now() - started,
      };
    }
    throw new RuntimeError(this.name, `exceeded ${maxTurns} turns without a final answer`);
  }
}
