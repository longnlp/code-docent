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
 */

import { RUNTIMES, resolveRuntime } from './runtime/index.js';
import { runPrescan, runScan } from './pipeline/scan.js';
import { runWrite } from './pipeline/write.js';

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
      const { inventoryPath, features } = await runScan(
        need(args, 'project'),
        need(args, 'repo'),
        runtime,
        args.flags.model,
      );
      console.log(`${features.length} features → ${inventoryPath}`);
      console.log('review the inventory, then: codedocent write <slug> --project … --repo …');
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
      const out = await runWrite(need(args, 'project'), need(args, 'repo'), slug, runtime, args.flags.model);
      console.log(`draft written to ${out}`);
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
