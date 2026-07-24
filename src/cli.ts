#!/usr/bin/env node
/**
 * codedocent — audience-first docs generated from code.
 *
 *   codedocent doctor                                   check all agent runtimes
 *   codedocent prescan --project p --repo path          Pass 0 only (no LLM)
 *   codedocent scan    --project p --repo path          Pass 0+1: feature inventory
 *   codedocent write <slug> --project p --repo path     Pass 2: trace + render one page
 *
 * Common flags: --runtime <name> (else CODEDOCENT_RUNTIME, else first usable),
 *               --model <name>
 * Env: CODEDOCENT_RUNTIME, CODEDOCENT_TIMEOUT_MS (per-run agent timeout, default 15m).
 *
 * Progress: on a TTY, a single status line shows a live elapsed clock, step
 * count, and last activity; piped/redirected, real events are logged and a
 * quiet runtime heartbeats at most once a minute (with elapsed + step count).
 */

import { RUNTIMES, resolveRuntime } from './runtime/index.js';
import type { AgentProgress } from './runtime/types.js';
import { runPrescan, runScan } from './pipeline/scan.js';
import { runWrite } from './pipeline/write.js';

/**
 * Live progress reporter. Two rendering modes so it works both interactively
 * and when piped to a file/CI log:
 *
 * - **TTY**: one status line pinned at the bottom, redrawn every second with a
 *   spinner + live elapsed clock + step count + last activity. Real events
 *   (tool calls) scroll as permanent lines above it. No repeated spam.
 * - **non-TTY** (piped/redirected, e.g. background task logs): real events are
 *   logged as they arrive; when a runtime has no live stream (copilot -s), a
 *   heartbeat prints at most once a minute — and shows the elapsed clock and
 *   step count, so consecutive lines differ instead of repeating verbatim.
 */
function progressPrinter(label: string): {
  onProgress: (ev: AgentProgress) => void;
  done: (summary?: string) => void;
} {
  const started = Date.now();
  const isTTY = !!process.stdout.isTTY;
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frame = 0;
  let steps = 0;
  let lastActivity = 'starting…';
  let lastHeartbeatMs = 0;

  const mmss = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const drawStatus = () => {
    if (!isTTY) return;
    frame = (frame + 1) % spinner.length;
    const line = `${spinner[frame]} ${mmss()}  ${label}  ·  ${steps} steps  ·  ${lastActivity}`;
    const width = (process.stdout.columns ?? 120) - 1;
    process.stdout.write('\r\x1b[2K' + line.slice(0, width));
  };

  const printLine = (text: string) => {
    if (isTTY) {
      process.stdout.write('\r\x1b[2K'); // clear the status line
      console.log(text); // permanent scrollback line
      drawStatus(); // redraw status beneath it
    } else {
      console.log(text);
    }
  };

  const ticker = setInterval(
    () => {
      if (isTTY) {
        drawStatus();
      } else {
        const elapsed = Date.now() - started;
        if (elapsed - lastHeartbeatMs >= 60_000) {
          lastHeartbeatMs = elapsed;
          console.log(`  [${mmss()}] still working — ${steps} steps so far`);
        }
      }
    },
    isTTY ? 1000 : 5000,
  );
  ticker.unref?.();

  return {
    onProgress: (ev) => {
      if (ev.kind === 'tool') {
        steps++;
        lastActivity = ev.detail;
        printLine(`  [${mmss()}] 🔧 ${ev.detail.slice(0, 100)}`);
      } else if (ev.kind === 'status') {
        lastActivity = ev.detail;
        printLine(`  [${mmss()}] ▸ ${ev.detail.slice(0, 100)}`);
      } else {
        // 'text' peeks: update the live line only; never spam the log.
        lastActivity = ev.detail;
        if (isTTY) drawStatus();
      }
    },
    done: (summary?: string) => {
      clearInterval(ticker);
      if (isTTY) process.stdout.write('\r\x1b[2K');
      if (summary) console.log(summary);
    },
  };
}

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): Args {
  const [command = 'help', ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) {
      flags[rest[i].slice(2)] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : 'true';
    } else {
      positional.push(rest[i]);
    }
  }
  return { command, positional, flags };
}

function need(args: Args, flag: string): string {
  const v = args.flags[flag];
  if (!v) {
    console.error(`missing required flag --${flag}`);
    process.exit(2);
  }
  return v;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'doctor': {
      console.log('CodeDocent runtime check:\n');
      for (const rt of RUNTIMES) {
        const c = await rt.check();
        console.log(`  ${c.ok ? '✅' : '❌'} ${rt.name.padEnd(14)} ${c.detail}`);
        console.log(`     ${rt.description}`);
      }
      console.log('\nSelect with --runtime <name> or CODEDOCENT_RUNTIME=<name>.');
      break;
    }

    case 'prescan': {
      const out = await runPrescan(need(args, 'project'), need(args, 'repo'));
      console.log(`prescan written to ${out}`);
      break;
    }

    case 'scan': {
      const runtime = await resolveRuntime(args.flags.runtime);
      console.log(`scanning with runtime ${runtime.name}…`);
      const progress = progressPrinter('scan');
      try {
        const { inventoryPath, features } = await runScan(
          need(args, 'project'),
          need(args, 'repo'),
          runtime,
          args.flags.model,
          progress.onProgress,
        );
        console.log(`${features.length} features → ${inventoryPath}`);
        console.log('review the inventory, then: codedocent write <slug> --project … --repo …');
      } finally {
        progress.done();
      }
      break;
    }

    case 'write': {
      const slug = args.positional[0];
      if (!slug) {
        console.error('usage: codedocent write <feature-slug> --project p --repo path');
        process.exit(2);
      }
      const runtime = await resolveRuntime(args.flags.runtime);
      console.log(`tracing + writing "${slug}" with runtime ${runtime.name}…`);
      const progress = progressPrinter(`write ${slug}`);
      try {
        const out = await runWrite(
          need(args, 'project'),
          need(args, 'repo'),
          slug,
          runtime,
          args.flags.model,
          progress.onProgress,
        );
        console.log(`draft written to ${out}`);
      } finally {
        progress.done();
      }
      break;
    }

    default:
      console.log('commands: doctor | prescan | scan | write  (see header of src/cli.ts)');
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
