/**
 * The agent-runtime abstraction (architecture D5 / requirement F7).
 *
 * Pipelines never talk to an LLM provider directly — they hand an AgentTask to
 * an AgentRuntime. All persistent knowledge lives in markdown skill files, so a
 * project curated under one runtime regenerates correctly under another.
 */

export type AgentRole = 'scanner' | 'tracer' | 'writer' | 'distiller' | 'answerer';

export interface AgentTask {
  role: AgentRole;
  /** Fully assembled instructions (task + skills + output contract). */
  prompt: string;
  /**
   * Directory the agent may read. Absent = no repo access (pure text task,
   * e.g. the writer rendering a page from a fact sheet).
   */
  repoDir?: string;
  /** Provider-specific model name; adapters fall back to a sane default. */
  model?: string;
  /** Cap on agentic tool-use turns (ignored by pure text tasks). */
  maxTurns?: number;
  timeoutMs?: number;
}

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

export interface AgentResult {
  text: string;
  usage: AgentUsage;
  runtime: string;
  model?: string;
  durationMs: number;
}

export interface RuntimeCheck {
  ok: boolean;
  detail: string;
}

export interface AgentRuntime {
  /** Registry name, e.g. "claude-sdk", "copilot-cli", "anthropic-api". */
  readonly name: string;
  /** Human description shown by `codedocent doctor`. */
  readonly description: string;
  /** Cheap availability probe: binary on PATH, API key present, etc. */
  check(): Promise<RuntimeCheck>;
  run(task: AgentTask): Promise<AgentResult>;
}

export class RuntimeError extends Error {
  constructor(
    public readonly runtime: string,
    message: string,
  ) {
    super(`[${runtime}] ${message}`);
  }
}
