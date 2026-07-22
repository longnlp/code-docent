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
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
    /** Called for each complete stdout line as it arrives (streaming). */
    onStdoutLine?: (line: string) => void;
  } = {},
): Promise<SubprocessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let lineBuf = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${cmd} timed out after ${opts.timeoutMs}ms`));
    }, opts.timeoutMs ?? 600_000);
    child.stdout.on('data', (d) => {
      stdout += d;
      if (opts.onStdoutLine) {
        lineBuf += d;
        let nl;
        while ((nl = lineBuf.indexOf('\n')) >= 0) {
          opts.onStdoutLine(lineBuf.slice(0, nl));
          lineBuf = lineBuf.slice(nl + 1);
        }
      }
    });
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, code });
    });
  });
}

export async function binaryAvailable(cmd: string): Promise<string | null> {
  try {
    const r = await runSubprocess(cmd, ['--version'], { timeoutMs: 15_000 });
    return r.code === 0 ? r.stdout.trim().split('\n')[0] : null;
  } catch {
    return null;
  }
}
