import { app, BrowserWindow, dialog, ipcMain, net, protocol, screen } from "electron";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chatWithPet, chatWithPetStream } from "./agent.js";
import { dbApi, initDb } from "./db.js";
import { runSystemCommand } from "./systemOps.js";

protocol.registerSchemesAsPrivileged([{
  scheme: "pet-asset",
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
}]);

import { runCodexTask } from "./codexBridge.js";

let mainWindow: BrowserWindow | null = null;
const chatControllers = new Map<string, AbortController>();
const petAssetRoot = path.join(app.getPath("userData"), "pet-assets");

const ensureDir = (dir: string) => fs.mkdirSync(dir, { recursive: true });

const copyDirRecursive = (sourceDir: string, targetDir: string) => {
  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
};

const toPetAssetUrl = (folderName: string, entryFile: string) => `pet-asset://${encodeURIComponent(folderName)}/${entryFile.split(path.sep).map(encodeURIComponent).join("/")}`;

const COLLAPSED_SIZE = { width: 116, height: 116 };
const EXPANDED_SIZE = { width: 430, height: 700 };

const setWindowExpanded = (expanded: boolean) => {
  if (!mainWindow) return;

  const target = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
  const bounds = mainWindow.getBounds();
  const right = bounds.x + bounds.width;
  const bottom = bounds.y + bounds.height;

  const { workArea } = screen.getDisplayNearestPoint({ x: right, y: bottom });

  const nextX = Math.min(
    Math.max(workArea.x, right - target.width),
    workArea.x + workArea.width - target.width
  );
  const nextY = Math.min(
    Math.max(workArea.y, bottom - target.height),
    workArea.y + workArea.height - target.height
  );

  mainWindow.setBounds(
    {
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: target.width,
      height: target.height
    },
    true
  );
  mainWindow.focus();
};

const createWindow = async () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: COLLAPSED_SIZE.width,
    height: COLLAPSED_SIZE.height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: false,
    x: Math.max(0, width - COLLAPSED_SIZE.width - 16),
    y: Math.max(0, height - COLLAPSED_SIZE.height - 16),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.on("did-fail-load", async () => {
    if (!mainWindow) return;
    await mainWindow.loadURL(
      "data:text/html,<html><body style='font-family:Segoe UI;padding:16px;background:#0a2f2a;color:#fff'>UI load failed. Keep npm run dev terminal running and check errors.</body></html>"
    );
  });

  try {
    if (process.env.VITE_DEV_SERVER_URL) {
      await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
  } catch {
    await mainWindow.loadURL(
      "data:text/html,<html><body style='font-family:Segoe UI;padding:16px;background:#0a2f2a;color:#fff'>UI load failed. Keep npm run dev terminal running and check errors.</body></html>"
    );
  }

  mainWindow.show();
  mainWindow.focus();
};

app.whenReady().then(async () => {
  ensureDir(petAssetRoot);
  protocol.handle("pet-asset", (request) => {
    const url = new URL(request.url);
    const folderName = decodeURIComponent(url.hostname);
    const relPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const fullPath = path.resolve(path.join(petAssetRoot, folderName, relPath));
    if (!fullPath.startsWith(path.resolve(petAssetRoot))) {
      return new Response("Forbidden", { status: 403 });
    }
    if (!fs.existsSync(fullPath)) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(fullPath).toString());
  });

  await initDb();
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("window:toggle-pin", () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next);
  return next;
});
ipcMain.handle("window:set-expanded", (_, expanded: boolean) => {
  setWindowExpanded(expanded);
  return true;
});

ipcMain.handle("config:get", () => dbApi.getModelConfig());
ipcMain.handle("config:set", (_, config) => {
  dbApi.setModelConfig(config);
  return true;
});

ipcMain.handle("models:list", () => ({
  activeId: dbApi.getActiveModelProfileId(),
  profiles: dbApi.listModelProfiles()
}));
ipcMain.handle("models:add", (_, profile) => dbApi.addModelProfile(profile));
ipcMain.handle("models:update", (_, profile) => dbApi.updateModelProfile(profile));
ipcMain.handle("models:delete", (_, id: number) => dbApi.deleteModelProfile(id));
ipcMain.handle("models:set-active", (_, id: number) => dbApi.setActiveModelProfileId(id));

ipcMain.handle("codex:get", () => dbApi.getCodexEnabled());
ipcMain.handle("codex:set", (_, enabled: boolean) => {
  dbApi.setCodexEnabled(enabled);
  return true;
});
ipcMain.handle("codex:get-template", () => dbApi.getCodexCommandTemplate());
ipcMain.handle("codex:set-template", (_, template: string) => {
  dbApi.setCodexCommandTemplate(template);
  return true;
});

ipcMain.handle("identity:get", () => dbApi.getIdentity());
ipcMain.handle("identity:set", (_, identity) => {
  dbApi.setIdentity(identity);
  return true;
});

ipcMain.handle("skills:list", () => dbApi.listSkills());
ipcMain.handle("skills:upsert", (_, skill) => {
  dbApi.upsertSkill(skill.name, skill.prompt);
  return dbApi.listSkills();
});

ipcMain.handle("messages:list", () => dbApi.listAllMessages());
ipcMain.handle("messages:append", (_, payload: { role: "user" | "assistant"; content: string }) => {
  if (!payload?.content?.trim()) return false;
  dbApi.saveMessage(payload.role, payload.content);
  return true;
});

ipcMain.handle("pet:get-appearance", () => dbApi.getPetAppearance());
ipcMain.handle("pet:reset-appearance", () => dbApi.resetPetAppearance());
ipcMain.handle("pet:import-model", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "3D Pet Model", extensions: ["gltf", "glb"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const selectedPath = result.filePaths[0];
  const sourceDir = path.dirname(selectedPath);
  const folderName = `custom-${Date.now()}`;
  const targetDir = path.join(petAssetRoot, folderName);
  copyDirRecursive(sourceDir, targetDir);

  const entryFile = path.basename(selectedPath);
  const next = {
    label: entryFile,
    modelUrl: toPetAssetUrl(folderName, entryFile),
    isDefault: false
  };
  dbApi.setPetAppearance(next);
  return next;
});

ipcMain.handle("chat:send", async (_, payload: { input: string; skillName: string }) => {
  return chatWithPet(payload.input, payload.skillName || "Default");
});

ipcMain.on("chat:stream-start", async (event, payload: { requestId: string; input: string; skillName: string }) => {
  const { requestId, input, skillName } = payload;
  if (!requestId || !input) {
    event.sender.send("chat:error", { requestId, error: "Invalid stream payload." });
    return;
  }

  if (chatControllers.has(requestId)) {
    chatControllers.get(requestId)?.abort();
  }

  const controller = new AbortController();
  chatControllers.set(requestId, controller);

  try {
    const result = await chatWithPetStream(input, skillName || "Default", controller.signal, (chunk) => {
      event.sender.send("chat:chunk", { requestId, chunk });
    });

    event.sender.send("chat:done", {
      requestId,
      answer: result.answer,
      cached: result.cached,
      canceled: result.canceled ?? false
    });
  } catch (error) {
    event.sender.send("chat:error", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown stream error"
    });
  } finally {
    chatControllers.delete(requestId);
  }
});

ipcMain.handle("chat:cancel", (_, requestId: string) => {
  chatControllers.get(requestId)?.abort();
  return true;
});

ipcMain.handle(
  "system:run",
  async (_, payload: { command: string; type: "install" | "delete" | "other"; allowDelete: boolean }) => {
    return runSystemCommand(payload.command, payload.type, payload.allowDelete);
  }
);

ipcMain.handle("codex:run", async (_, task: string) => {
  if (!dbApi.getCodexEnabled()) {
    return { ok: false, output: "Codex integration is disabled." };
  }
  return runCodexTask(task, dbApi.getCodexCommandTemplate());
});
