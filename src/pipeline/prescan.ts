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

// Background work is identified by HOW IT IS WIRED, not by what it is named —
// a job class called `NightlyReconciler` has no "job"/"task" in its name but is
// still discoverable via its scheduling/registration mechanism. These marker
// lists make detection name-agnostic across ecosystems.

// Schedule DECLARATION markers — the registration site where recurring/
// background work is wired up. Highest signal: the scanner reads these files to
// enumerate what runs automatically and how often, regardless of class names.
const SCHEDULE_DECL_MARKERS = [
  'new ScheduledTask',                                   // .NET (this codebase)
  'AddHostedService',                                    // .NET generic host
  'RecurringJob.', 'BackgroundJob.Schedule',             // Hangfire
  'beat_schedule', 'add_periodic_task',                  // Celery beat
  'BackgroundScheduler', 'BlockingScheduler', '.add_job(', // APScheduler
  'cron.schedule', 'new CronJob(', 'node-cron',          // node-cron
  '@Scheduled',                                          // Spring
  'sidekiq-scheduler', 'config.cron',                    // Ruby (sidekiq-scheduler)
  'gocron', 'cron.New(',                                 // Go
];

// IMPLEMENTATION markers — the code IS background/async work, whatever it is
// named. Feeds the candidate job-file list.
const BG_IMPL_MARKERS = [
  'BackgroundService', 'IHostedService',                 // .NET
  '@shared_task', '@app.task', '@celery',                // Celery
  '@Cron(', '@Interval(', '@Timeout(', 'WorkerHost',     // NestJS schedule
  'new Worker(', 'agenda.define',                        // BullMQ / Agenda
  '@Async', '@KafkaListener', '@RabbitListener', 'implements Job', // Java
  'Sidekiq::Job', 'Sidekiq::Worker', 'ActiveJob::Base', 'perform_async', // Ruby
  'time.NewTicker', 'time.Tick(',                        // Go
];

// Infra that declares schedules outside code (highest-signal, name-proof).
const INFRA_SCHEDULE_NAME = /(^|[/\\])(Procfile|crontab)$|\.(timer|cron)$/i;

// Background jobs live server-side; skip web/UI trees so setInterval, web
// workers, etc. don't pollute the signal.
const FRONTEND_SEGMENTS = new Set(['frontend', 'client', 'web', 'webapp', 'ui', 'public', 'static', 'assets']);

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
  const scheduleDeclSet = new Set<string>();
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
  const isFrontendPath = (rel: string): boolean =>
    rel.split(path.sep).some((s) => FRONTEND_SEGMENTS.has(s.toLowerCase()));

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
    // Infra that declares schedules outside code (crontab, systemd timer, …).
    if (INFRA_SCHEDULE_NAME.test(rel) && !rel.startsWith('.github')) scheduleDeclSet.add(rel);
    const testFile = isTestPath(rel);
    const frontendFile = isFrontendPath(rel);
    if (JOB_NAME_RE.test(base) && !testFile && !frontendFile) backgroundJobSet.add(rel);
    if (testFile) {
      const segs = rel.split(path.sep);
      const idx = segs.findIndex((s: string) => /(^|\.)tests?$/i.test(s));
      if (idx >= 0) testDirSet.add(segs.slice(0, idx + 1).join(path.sep));
    }

    // Content detection over server-side source (one read per file, reused for
    // all markers). Tests and frontend are excluded so signals stay clean.
    // Name-agnostic: matches how background work is WIRED, not what it's called.
    const scanContent =
      (SOURCE_EXTS.has(ext) && !testFile && !frontendFile) ||
      (/\.ya?ml$/i.test(ext) && !rel.startsWith('.github'));
    if (scanContent) {
      try {
        if (fs.statSync(file).size < 200_000) {
          const content = fs.readFileSync(file, 'utf8');
          // Cross-ecosystem, name-agnostic markers.
          if (SCHEDULE_DECL_MARKERS.some((m) => content.includes(m))) scheduleDeclSet.add(rel);
          if (BG_IMPL_MARKERS.some((m) => content.includes(m))) backgroundJobSet.add(rel);
          // Kubernetes CronJob / compose worker schedules declared in YAML.
          if (/\.ya?ml$/i.test(ext) && /kind:\s*CronJob|schedule:\s*["']?\S/.test(content)) {
            scheduleDeclSet.add(rel);
          }
          // Precise .NET signals (this codebase's stack).
          if (ext === '.cs') {
            if (content.includes('AbstractValidator')) validatorFileCount++;
            if (/:\s*ICommand\b/.test(content) || content.includes('IExecute<')) backgroundJobSet.add(rel);
            if (content.includes('IHandle<')) eventHandlerCount++;
            if (content.includes('IProvideHealthCheck') || content.includes('HealthCheckBase')) healthCheckCount++;
          }
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
    scheduledTaskRegistrars: [...scheduleDeclSet].slice(0, 12),
    backgroundJobFiles: [...backgroundJobSet].slice(0, 80),
    eventHandlerCount,
    healthCheckCount,
    localizationFiles: localizationFiles.slice(0, 10),
    validatorFileCount,
    testDirs: [...testDirSet].slice(0, 10),
  };
}
