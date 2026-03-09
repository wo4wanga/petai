const { spawn } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

const procs = [];
let shuttingDown = false;

function start(name, command, args = []) {
  const child = spawn(command, args, {
    shell: true,
    stdio: "inherit",
    windowsHide: false,
    cwd: projectRoot
  });

  child.on("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  child.on("error", (err) => {
    if (!shuttingDown) {
      console.error(`[${name}] failed:`, err.message);
      shutdown(1);
    }
  });

  procs.push(child);
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const p of procs) {
    if (!p.killed) {
      try {
        p.kill();
      } catch {}
    }
  }

  setTimeout(() => process.exit(code), 100);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start("renderer", "npm", ["run", "dev:renderer"]);
start("electron-ts", "npm", ["run", "dev:electron"]);
start("desktop", "npm", ["run", "dev:desktop"]);
