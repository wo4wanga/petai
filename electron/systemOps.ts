import { exec } from "node:child_process";

const INSTALL_ALLOWLIST = [/^winget\s+/i, /^choco\s+/i, /^npm\s+install\s+/i, /^pip\s+install\s+/i];
const DELETE_BLOCKLIST = [/\bdel\b/i, /\brd\b/i, /\brmdir\b/i, /\bRemove-Item\b/i, /\buninstall\b/i];

export const runSystemCommand = (
  command: string,
  type: "install" | "delete" | "other",
  allowDelete: boolean
): Promise<{ ok: boolean; output: string }> => {
  if (type === "install") {
    const allowed = INSTALL_ALLOWLIST.some((pattern) => pattern.test(command));
    if (!allowed) {
      return Promise.resolve({ ok: false, output: "Install command rejected: not in allowlist." });
    }
  }

  if (type === "delete") {
    if (!allowDelete) {
      return Promise.resolve({ ok: false, output: "Delete command requires explicit confirmation." });
    }
  }

  if (type === "other") {
    const likelyDelete = DELETE_BLOCKLIST.some((pattern) => pattern.test(command));
    if (likelyDelete && !allowDelete) {
      return Promise.resolve({ ok: false, output: "Potential delete command blocked without confirmation." });
    }
  }

  return new Promise((resolve) => {
    exec(command, { windowsHide: true, timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, output: `${stderr || error.message}`.trim() });
        return;
      }
      resolve({ ok: true, output: `${stdout}\n${stderr}`.trim() });
    });
  });
};