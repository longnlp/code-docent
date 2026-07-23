/**
 * Pass 0 — deterministic pre-scan (no LLM). Extracts the mechanical skeleton
 * that guides the scanner agent and saves tokens. First-class detectors for
 * the target stack (C#/ASP.NET + React); generic fallbacks elsewhere.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'bin', 'obj', 'dist', 'build', 'out',
  '.idea', '.vs', '.vscode', 'packages', '__pycache__', '.next',
]);

const SOURCE_EXTS = new Set([
  '.cs', '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rb', '.php',
  '.vue', '.svelte', '.kt', '.swift', '.rs', '.cpp', '.c', '.h',
]);

export interface PrescanReport {
  repoDir: string;
  fileCount: number;
  /** extension -> file count, sorted desc, top 10 */
  languages: Record<string, number>;
  frameworks: string[];
  routeFiles: string[];
  controllerFiles: string[];
  /** Where periodic/scheduled work is registered (the "every 30 min" source). */
  scheduledTaskRegistrars: string[];
  /** Command/job/worker files — background behavior with no UI/API entry point. */
  backgroundJobFiles: string[];
  /** Reactive background behavior (event handlers). Counted, not listed (often many). */
  eventHandlerCount: number;
  /** Periodic health/monitoring checks. */
  healthCheckCount: number;
  localizationFiles: string[];
  validatorFileCount: number;
  testDirs: string[];
}

function* walk(root: string): Generator<string> {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name) && !e.name.startsWith('.')) stack.push(full);
      } else if (e.isFile()) {
        yield full;
      }
    }
  }
}

export function prescan(repoDir: string): PrescanReport {
  const langCounts: Record<string, number> = {};
  const routeFiles: string[] = [];
  const controllerFiles: string[] = [];
  const scheduledTaskRegistrars: string[] = [];
  const backgroundJobSet = new Set<string>();
  const localizationFiles: string[] = [];
  const testDirSet = new Set<string>();
  let eventHandlerCount = 0;
  let healthCheckCount = 0;
  let validatorFileCount = 0;
  let fileCount = 0;
  let hasCsproj = false;
  let hasReact = false;

  // Background behavior that has no UI route or API controller entry point.
  // Generic filename signal (any backend language); .NET gets precise
  // content-based detection below.
  const JOB_NAME_RE = /(Job|Worker|Consumer|Scheduler|BackgroundService|Cronjob)\.(cs|ts|js|jsx|tsx|py|go|java|rb|kt)$/i;

  // Test files pollute behavior signals — exclude them. Segment-aware so
  // "LatestVersion.cs" is not mistaken for a test.
  const isTestPath = (rel: string): boolean =>
    rel.split(path.sep).some((s) => /(^|\.)tests?$/i.test(s)) ||
    /(Fixture|Tests?|\.spec|\.test)\.[a-z]+$/i.test(path.basename(rel));

  for (const file of walk(repoDir)) {
    fileCount++;
    const rel = path.relative(repoDir, file);
    const base = path.basename(file);
    const ext = path.extname(file).toLowerCase();

    if (SOURCE_EXTS.has(ext)) langCounts[ext] = (langCounts[ext] ?? 0) + 1;
    if (ext === '.csproj') hasCsproj = true;

    if (/routes?\.(tsx?|jsx?)$/i.test(base)) routeFiles.push(rel);
    if (base.endsWith('Controller.cs')) controllerFiles.push(rel);
    if (ext === '.json' && /(localization|locales|i18n|lang)/i.test(rel)) localizationFiles.push(rel);
    const testFile = isTestPath(rel);
    if (JOB_NAME_RE.test(base) && !testFile) backgroundJobSet.add(rel);
    if (testFile) {
      const segs = rel.split(path.sep);
      const idx = segs.findIndex((s: string) => /(^|\.)tests?$/i.test(s));
      if (idx >= 0) testDirSet.add(segs.slice(0, idx + 1).join(path.sep));
    }

    // Precise .NET content detection (one read per file, reused for all
    // markers). Test files are excluded so behavior signals stay clean.
    if (ext === '.cs' && !testFile) {
      try {
        if (fs.statSync(file).size < 200_000) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('AbstractValidator')) validatorFileCount++;
          // Registration site (`new ScheduledTask { Interval = ... }`), not
          // every file that merely references the type.
          if (content.includes('new ScheduledTask')) scheduledTaskRegistrars.push(rel);
          if (/:\s*ICommand\b/.test(content) || content.includes('IExecute<')) backgroundJobSet.add(rel);
          if (content.includes('IHandle<')) eventHandlerCount++;
          if (content.includes('IProvideHealthCheck') || content.includes('HealthCheckBase')) healthCheckCount++;
        }
      } catch {
        /* skip unreadable */
      }
    }
    if (base === 'package.json' && rel.split(path.sep).length <= 2) {
      try {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (pkg.dependencies?.react || pkg.devDependencies?.react) hasReact = true;
      } catch {
        /* skip invalid */
      }
    }
  }

  const frameworks: string[] = [];
  if (hasCsproj || controllerFiles.length > 0) frameworks.push('aspnet-core');
  if (hasReact) frameworks.push('react');

  const languages = Object.fromEntries(
    Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
  );

  return {
    repoDir,
    fileCount,
    languages,
    frameworks,
    routeFiles: routeFiles.slice(0, 20),
    controllerFiles: controllerFiles.slice(0, 100),
    scheduledTaskRegistrars: scheduledTaskRegistrars.slice(0, 8),
    backgroundJobFiles: [...backgroundJobSet].slice(0, 80),
    eventHandlerCount,
    healthCheckCount,
    localizationFiles: localizationFiles.slice(0, 10),
    validatorFileCount,
    testDirs: [...testDirSet].slice(0, 10),
  };
}
