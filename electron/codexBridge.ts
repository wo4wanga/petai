import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const run = (command: string) =>
  new Promise<{ ok: boolean; output: string }>((resolve) => {
    exec(command, { windowsHide: true, timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, output: `${stderr || error.message}`.trim() });
        return;
      }
      resolve({ ok: true, output: `${stdout}\n${stderr}`.trim() || "Done." });
    });
  });

const parseWhereOutput = (text: string): string[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /codex(\.exe)?$/i.test(line));

  if (process.platform === "win32") {
    lines.sort((a, b) => {
      const aExe = /\.exe$/i.test(a) ? 1 : 0;
      const bExe = /\.exe$/i.test(b) ? 1 : 0;
      return bExe - aExe;
    });
  }

  return lines;
};

const findInWindowsApps = (): string | null => {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const windowsAppsDir = path.join(programFiles, "WindowsApps");

  try {
    const dirs = fs
      .readdirSync(windowsAppsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("OpenAI.Codex_"))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    for (const dir of dirs) {
      const exe = path.join(windowsAppsDir, dir, "app", "resources", "codex.exe");
      const plain = path.join(windowsAppsDir, dir, "app", "resources", "codex");
      if (fs.existsSync(exe)) return exe;
      if (fs.existsSync(plain)) return plain;
    }
  } catch {
    // Ignore permission errors and continue fallback chain.
  }

  return null;
};

const cloneCodexExecutable = (source: string): string | null => {
  try {
    if (process.platform === "win32" && !/\.exe$/i.test(source)) {
      return null;
    }

    const base = process.env.LOCALAPPDATA || process.cwd();
    const targetDir = path.join(base, "ai-pet-codex", "bin");
    fs.mkdirSync(targetDir, { recursive: true });

    const target = path.join(targetDir, process.platform === "win32" ? "codex.exe" : "codex");
    fs.copyFileSync(source, target);
    return target;
  } catch {
    return null;
  }
};

const resolveCodexExecutable = async (): Promise<string | null> => {
  const direct = await run("codex --version");
  if (direct.ok) return "codex";

  const whereExe = `${process.env.SystemRoot || "C:\\Windows"}\\System32\\where.exe`;
  if (fs.existsSync(whereExe)) {
    const whereResult = await run(`"${whereExe}" codex`);
    if (whereResult.ok) {
      const found = parseWhereOutput(whereResult.output)[0];
      if (found) return found;
    }
  }

  const localAppData = process.env.LOCALAPPDATA || "";
  const localAlias = path.join(localAppData, "Microsoft", "WindowsApps", "codex.exe");
  if (localAppData && fs.existsSync(localAlias)) {
    return localAlias;
  }

  const pkgExec = findInWindowsApps();
  if (pkgExec) return pkgExec;

  return null;
};

const ensureRunnableCodex = async (candidate: string): Promise<{ execPath: string; check: { ok: boolean; output: string } }> => {
  const first = await run(`"${candidate}" --version`);
  if (first.ok) return { execPath: candidate, check: first };

  const accessDenied = /access is denied/i.test(first.output);
  const fromWindowsApps = /\\WindowsApps\\/i.test(candidate);
  if (accessDenied && fromWindowsApps) {
    const cloned = cloneCodexExecutable(candidate);
    if (cloned) {
      const retry = await run(`"${cloned}" --version`);
      if (retry.ok) {
        return { execPath: cloned, check: retry };
      }
      return { execPath: cloned, check: retry };
    }
  }

  return { execPath: candidate, check: first };
};

const buildCommand = (task: string, commandTemplate: string, codexExec: string) => {
  const sanitizedTask = task.replace(/"/g, '\\"');
  const template = commandTemplate?.trim() || 'codex exec "{task}"';

  const withExecutable = template.replace(/^codex(\.exe)?\b/i, `"${codexExec}"`);
  return withExecutable.includes("{task}")
    ? withExecutable.replaceAll("{task}", sanitizedTask)
    : `${withExecutable} "${sanitizedTask}"`;
};

const addSkipRepoCheckIfNeeded = (command: string): string => {
  if (!/codex(?:\.exe)?["\s]+exec/i.test(command)) {
    return command;
  }
  if (/--skip-git-repo-check/i.test(command)) {
    return command;
  }
  return command.replace(/(codex(?:\.exe)?"?\s+exec)/i, "$1 --skip-git-repo-check");
};

export const runCodexTask = async (
  task: string,
  commandTemplate: string
): Promise<{ ok: boolean; output: string }> => {
  const candidate = await resolveCodexExecutable();
  if (!candidate) {
    return {
      ok: false,
      output:
        "Codex CLI not found. Try restarting the app, then ensure Codex is installed and command aliases are enabled."
    };
  }

  const runnable = await ensureRunnableCodex(candidate);
  if (!runnable.check.ok) {
    return {
      ok: false,
      output: `Codex exists but failed to run --version. Path: ${runnable.execPath}\n${runnable.check.output}`
    };
  }

  const command = buildCommand(task, commandTemplate, runnable.execPath);
  let result = await run(command);
  if (!result.ok && /Not inside a trusted directory/i.test(result.output)) {
    result = await run(addSkipRepoCheckIfNeeded(command));
  }
  if (result.ok) {
    return result;
  }

  return {
    ok: false,
    output: `Codex command failed. Command: ${command}\n\n${result.output}`
  };
};
