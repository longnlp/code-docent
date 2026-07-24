import { spawn } from 'node:child_process';

export interface SubprocessResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export function runSubprocess(
  cmd: string,
  args: string[],
  opts: {
    cwd?: string;
    /** Absolute cap (backstop). Kills even while output is flowing. */
    timeoutMs?: number;
    /**
     * Idle cap — kills only after this long with NO output on stdout/stderr.
     * This is the real "stuck vs slow" detector: a CLI streaming steady tool
     * activity keeps running; one that goes silent is treated as stuck. Omit
     * to disable idle killing.
     */
    idleTimeoutMs?: number;
    env?: NodeJS.ProcessEnv;
    /** Called for each complete stdout line as it arrives (streaming). */
    onStdoutLine?: (line: string) => void;
    /** Called for each complete stderr line as it arrives. */
    onStderrLine?: (line: string) => void;
  } = {},
): Promise<SubprocessResult> {
  // CODEDOCENT_DEBUG live-echoes the exact command and the child's raw stdout
  // AND stderr as they arrive — the way to see what a silent/hung CLI (e.g.
  // copilot waiting on an approval or auth prompt) is actually doing.
  const debug = !!process.env.CODEDOCENT_DEBUG;
  return new Promise((resolve, reject) => {
    if (debug) process.stderr.write(`\n[debug] exec: ${cmd} ${args.join(' ')}\n`);
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let outBuf = '';
    let errBuf = '';
    let lastActivity = Date.now();
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(absTimer);
      if (idleTimer) clearInterval(idleTimer);
      fn();
    };
    const absMs = opts.timeoutMs ?? 600_000;
    const absTimer = setTimeout(() => {
      finish(() => {
        child.kill('SIGKILL');
        reject(new Error(`${cmd} exceeded the total budget (${absMs}ms) while still active`));
      });
    }, absMs);
    const idleTimer = opts.idleTimeoutMs
      ? setInterval(() => {
          if (Date.now() - lastActivity > opts.idleTimeoutMs!) {
            finish(() => {
              child.kill('SIGKILL');
              const tail = debug ? '' : ' — re-run with CODEDOCENT_DEBUG=1 to inspect';
              reject(
                new Error(
                  `${cmd} produced no output for ${opts.idleTimeoutMs}ms — treating as stuck${tail}`,
                ),
              );
            });
          }
        }, Math.max(5_000, Math.min(opts.idleTimeoutMs, 15_000)))
      : null;

    const pump = (buf: string, chunk: string, cb?: (line: string) => void): string => {
      if (!cb) return buf;
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        cb(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
      return buf;
    };

    child.stdout.on('data', (d) => {
      lastActivity = Date.now();
      stdout += d;
      if (debug) process.stderr.write(`[debug:out] ${d}`);
      outBuf = pump(outBuf, String(d), opts.onStdoutLine);
    });
    child.stderr.on('data', (d) => {
      lastActivity = Date.now();
      stderr += d;
      if (debug) process.stderr.write(`[debug:err] ${d}`);
      errBuf = pump(errBuf, String(d), opts.onStderrLine);
    });
    child.on('error', (err) => finish(() => reject(err)));
    child.on('close', (code) => finish(() => resolve({ stdout, stderr, code })));
  });
}

/** Idle (no-output) cap; override with CODEDOCENT_IDLE_TIMEOUT_MS (default 5 min). */
export function idleTimeoutMs(): number {
  const v = Number(process.env.CODEDOCENT_IDLE_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 300_000;
}

/**
 * Absolute per-run cap (backstop); override with CODEDOCENT_TIMEOUT_MS.
 * Default 30 min — generous because the idle timeout is the primary guard: an
 * actively-streaming run should be allowed to finish, only true silence is killed.
 */
export function defaultTimeoutMs(): number {
  const v = Number(process.env.CODEDOCENT_TIMEOUT_MS);
  return Number.isFinite(v) && v > 0 ? v : 1_800_000;
}

export async function binaryAvailable(cmd: string): Promise<string | null> {
  try {
    const r = await runSubprocess(cmd, ['--version'], { timeoutMs: 15_000 });
    return r.code === 0 ? r.stdout.trim().split('\n')[0] : null;
  } catch {
    return null;
  }
}
