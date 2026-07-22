import type { AgentRuntime } from './types.js';
import { ClaudeSdkRuntime } from './claude-sdk.js';
import { ClaudeCliRuntime } from './claude-cli.js';
import { CopilotCliRuntime } from './copilot-cli.js';
import { GeminiCliRuntime } from './gemini-cli.js';
import { AnthropicApiRuntime } from './anthropic-api.js';
import { OpenAiApiRuntime } from './openai-api.js';

export const RUNTIMES: AgentRuntime[] = [
  new ClaudeSdkRuntime(),
  new ClaudeCliRuntime(),
  new CopilotCliRuntime(),
  new GeminiCliRuntime(),
  new AnthropicApiRuntime(),
  new OpenAiApiRuntime(),
];

export function getRuntime(name: string): AgentRuntime {
  const rt = RUNTIMES.find((r) => r.name === name);
  if (!rt) {
    throw new Error(`unknown runtime "${name}" (available: ${RUNTIMES.map((r) => r.name).join(', ')})`);
  }
  return rt;
}

/**
 * Resolve the runtime to use: explicit flag > CODEDOCENT_RUNTIME env >
 * first runtime whose check() passes.
 */
export async function resolveRuntime(explicit?: string): Promise<AgentRuntime> {
  if (explicit) return getRuntime(explicit);
  if (process.env.CODEDOCENT_RUNTIME) return getRuntime(process.env.CODEDOCENT_RUNTIME);
  for (const rt of RUNTIMES) {
    if ((await rt.check()).ok) return rt;
  }
  throw new Error(
    'no usable agent runtime found — run `codedocent doctor` to see what each runtime needs',
  );
}

export type { AgentRuntime, AgentTask, AgentResult, AgentRole } from './types.js';
