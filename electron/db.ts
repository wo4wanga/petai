import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";

export type Role = "system" | "user" | "assistant";

export interface MessageRow {
  id: number;
  role: Role;
  content: string;
  created_at: string;
}

export interface Identity {
  pet_name: string;
  pet_identity: string;
  user_name: string;
  user_identity: string;
}

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  useLocal: number;
  codexEnabled: number;
}

export interface ModelProfile {
  id: number;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  useLocal: number;
}

export interface PetAppearance {
  label: string;
  modelUrl: string;
  isDefault: boolean;
}

type DbParam = string | number | null | Uint8Array;

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let dbPath = "";

const schemaSql = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS identity (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pet_name TEXT NOT NULL,
  pet_identity TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_identity TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model_name TEXT NOT NULL,
  use_local INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS snippets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qa_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  q_norm TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL
);
`;

const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
};

const persist = () => {
  const current = getDb();
  const data = current.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
};

const selectAll = <T>(sql: string, params: DbParam[] = []): T[] => {
  const current = getDb();
  const stmt = current.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
};

const selectOne = <T>(sql: string, params: DbParam[] = []): T | null => {
  const rows = selectAll<T>(sql, params);
  return rows[0] ?? null;
};

const run = (sql: string, params: DbParam[] = []) => {
  const current = getDb();
  current.run(sql, params);
  persist();
};

const getSetting = (key: string) => {
  const row = selectOne<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? "";
};

const setSetting = (key: string, value: string) => {
  run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
};

const ensureDefaults = () => {
  const identityRow = selectOne<{ count: number }>("SELECT COUNT(*) as count FROM identity");
  if (!identityRow || Number(identityRow.count) === 0) {
    run(
      `INSERT INTO identity (id, pet_name, pet_identity, user_name, user_identity)
       VALUES (1, ?, ?, ?, ?)`,
      [
        "Nova",
        "A desktop AI pet focused on useful, concise help.",
        "Owner",
        "Wants practical answers and direct execution help."
      ]
    );
  }

  const settingsDefaults: Record<string, string> = {
    codexEnabled: "0",
    summary: "",
    codexCommandTemplate: "codex exec \"{task}\"",
    petAppearanceLabel: "Default Dog",
    petAppearanceUrl: "/models/dog.gltf"
  };

  Object.entries(settingsDefaults).forEach(([key, value]) => {
    run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
  });

  const profileCount = selectOne<{ count: number }>("SELECT COUNT(*) as count FROM model_profiles");
  if (!profileCount || Number(profileCount.count) === 0) {
    run(
      `INSERT INTO model_profiles (name, base_url, api_key, model_name, use_local)
       VALUES (?, ?, ?, ?, ?)`,
      ["OpenAI Default", "https://api.openai.com/v1", "", "gpt-4.1-mini", 0]
    );
  }

  const firstProfile = selectOne<{ id: number }>("SELECT id FROM model_profiles ORDER BY id ASC LIMIT 1");
  if (firstProfile) {
    run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ["activeProfileId", String(firstProfile.id)]);
  }

  run("INSERT OR IGNORE INTO skills (name, prompt) VALUES (?, ?)", [
    "Default",
    "Give concise, actionable help aligned to the user's explicit goal."
  ]);
};

const listModelProfiles = (): ModelProfile[] => {
  return selectAll<{
    id: number;
    name: string;
    base_url: string;
    api_key: string;
    model_name: string;
    use_local: number;
  }>("SELECT id, name, base_url, api_key, model_name, use_local FROM model_profiles ORDER BY id ASC").map((row) => ({
    id: Number(row.id),
    name: row.name,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    model: row.model_name,
    useLocal: Number(row.use_local)
  }));
};

const getActiveProfileId = () => Number(getSetting("activeProfileId") || 0);

const ensureActiveProfile = () => {
  const activeId = getActiveProfileId();
  const row = selectOne<{ id: number }>("SELECT id FROM model_profiles WHERE id = ?", [activeId]);
  if (!row) {
    const first = selectOne<{ id: number }>("SELECT id FROM model_profiles ORDER BY id ASC LIMIT 1");
    if (first) {
      setSetting("activeProfileId", String(first.id));
    }
  }
};

export const initDb = async () => {
  if (db) return;

  const wasmPath = path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
  SQL = await initSqlJs({ locateFile: () => wasmPath });

  dbPath = path.join(app.getPath("userData"), "ai-pet.sqlite");
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }

  getDb().run(schemaSql);
  ensureDefaults();
  ensureActiveProfile();
  persist();
};

export const dbApi = {
  getModelConfig(): ModelConfig {
    ensureActiveProfile();
    const activeId = getActiveProfileId();
    const row = selectOne<{
      base_url: string;
      api_key: string;
      model_name: string;
      use_local: number;
    }>("SELECT base_url, api_key, model_name, use_local FROM model_profiles WHERE id = ?", [activeId]);

    if (!row) {
      throw new Error("No active model profile found.");
    }

    return {
      baseUrl: row.base_url,
      apiKey: row.api_key,
      model: row.model_name,
      useLocal: Number(row.use_local),
      codexEnabled: Number(getSetting("codexEnabled") || 0)
    };
  },
  setModelConfig(config: Omit<ModelConfig, "codexEnabled">) {
    ensureActiveProfile();
    const activeId = getActiveProfileId();
    run(
      `UPDATE model_profiles
       SET base_url = ?, api_key = ?, model_name = ?, use_local = ?
       WHERE id = ?`,
      [config.baseUrl, config.apiKey, config.model, config.useLocal, activeId]
    );
  },
  listModelProfiles,
  addModelProfile(profile: { name: string; baseUrl: string; apiKey: string; model: string; useLocal: number }) {
    run(
      `INSERT INTO model_profiles (name, base_url, api_key, model_name, use_local)
       VALUES (?, ?, ?, ?, ?)`,
      [profile.name, profile.baseUrl, profile.apiKey, profile.model, profile.useLocal]
    );
    ensureActiveProfile();
    return listModelProfiles();
  },
  updateModelProfile(profile: { id: number; name: string; baseUrl: string; apiKey: string; model: string; useLocal: number }) {
    run(
      `UPDATE model_profiles
       SET name = ?, base_url = ?, api_key = ?, model_name = ?, use_local = ?
       WHERE id = ?`,
      [profile.name, profile.baseUrl, profile.apiKey, profile.model, profile.useLocal, profile.id]
    );
    return listModelProfiles();
  },
  deleteModelProfile(id: number) {
    const countRow = selectOne<{ count: number }>("SELECT COUNT(*) as count FROM model_profiles");
    const count = Number(countRow?.count ?? 0);
    if (count <= 1) {
      throw new Error("At least one model profile must remain.");
    }
    run("DELETE FROM model_profiles WHERE id = ?", [id]);
    ensureActiveProfile();
    return listModelProfiles();
  },
  getActiveModelProfileId() {
    ensureActiveProfile();
    return getActiveProfileId();
  },
  setActiveModelProfileId(id: number) {
    const exists = selectOne<{ id: number }>("SELECT id FROM model_profiles WHERE id = ?", [id]);
    if (!exists) {
      throw new Error("Model profile not found.");
    }
    setSetting("activeProfileId", String(id));
    return id;
  },
  getCodexEnabled(): boolean {
    return getSetting("codexEnabled") === "1";
  },
  setCodexEnabled(enabled: boolean) {
    setSetting("codexEnabled", enabled ? "1" : "0");
  },
  getCodexCommandTemplate(): string {
    return getSetting("codexCommandTemplate") || "codex exec \"{task}\"";
  },
  setCodexCommandTemplate(template: string) {
    setSetting("codexCommandTemplate", template.trim() || "codex exec \"{task}\"");
  },
  getIdentity(): Identity {
    const row = selectOne<Identity>(
      "SELECT pet_name, pet_identity, user_name, user_identity FROM identity WHERE id = 1"
    );
    if (!row) {
      throw new Error("Identity row missing");
    }
    return row;
  },
  setIdentity(next: Identity) {
    run(
      `UPDATE identity
       SET pet_name = ?, pet_identity = ?, user_name = ?, user_identity = ?
       WHERE id = 1`,
      [next.pet_name, next.pet_identity, next.user_name, next.user_identity]
    );
  },
  saveMessage(role: Role, content: string) {
    run("INSERT INTO messages (role, content) VALUES (?, ?)", [role, content]);
  },
  listRecentMessages(limit = 20): MessageRow[] {
    return selectAll<MessageRow>(
      `SELECT id, role, content, created_at
       FROM (
         SELECT id, role, content, created_at
         FROM messages
         ORDER BY id DESC
         LIMIT ?
       )
       ORDER BY id ASC`,
      [limit]
    );
  },
  listAllMessages(): MessageRow[] {
    return selectAll<MessageRow>(
      "SELECT id, role, content, created_at FROM messages ORDER BY id ASC"
    );
  },
  saveSnippet(title: string, content: string) {
    run("INSERT INTO snippets (title, content) VALUES (?, ?)", [title, content]);
  },
  listSnippets() {
    return selectAll<{
      id: number;
      title: string;
      content: string;
      created_at: string;
    }>("SELECT id, title, content, created_at FROM snippets ORDER BY id DESC");
  },
  deleteSnippet(id: number) {
    run("DELETE FROM snippets WHERE id = ?", [id]);
  },
  listSkills() {
    return selectAll<{
      id: number;
      name: string;
      prompt: string;
    }>("SELECT id, name, prompt FROM skills ORDER BY id ASC");
  },
  upsertSkill(name: string, prompt: string) {
    run(
      "INSERT INTO skills (name, prompt) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET prompt = excluded.prompt",
      [name, prompt]
    );
  },
  getSummary(): string {
    return getSetting("summary");
  },
  setSummary(summary: string) {
    setSetting("summary", summary);
  },
  getPetAppearance(): PetAppearance {
    const modelUrl = getSetting("petAppearanceUrl") || "/models/dog.gltf";
    const label = getSetting("petAppearanceLabel") || "Default Dog";
    return {
      label,
      modelUrl,
      isDefault: modelUrl === "/models/dog.gltf"
    };
  },
  setPetAppearance(next: PetAppearance) {
    setSetting("petAppearanceUrl", next.modelUrl);
    setSetting("petAppearanceLabel", next.label);
  },
  resetPetAppearance(): PetAppearance {
    const next = { label: "Default Dog", modelUrl: "/models/dog.gltf", isDefault: true };
    setSetting("petAppearanceUrl", next.modelUrl);
    setSetting("petAppearanceLabel", next.label);
    return next;
  },
  getCachedAnswer(normalizedQuestion: string): string | null {
    const row = selectOne<{ answer: string }>("SELECT answer FROM qa_cache WHERE q_norm = ?", [normalizedQuestion]);
    return row?.answer ?? null;
  },
  setCachedAnswer(normalizedQuestion: string, answer: string) {
    run(
      `INSERT INTO qa_cache (q_norm, answer)
       VALUES (?, ?)
       ON CONFLICT(q_norm) DO UPDATE SET answer = excluded.answer, updated_at = datetime('now')`,
      [normalizedQuestion, answer]
    );
  }
};



