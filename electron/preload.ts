import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("petApi", {
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    close: () => ipcRenderer.invoke("window:close"),
    togglePin: () => ipcRenderer.invoke("window:toggle-pin"),
    setExpanded: (expanded: boolean) => ipcRenderer.invoke("window:set-expanded", expanded)
  },
  config: {
    get: () => ipcRenderer.invoke("config:get"),
    set: (config: unknown) => ipcRenderer.invoke("config:set", config)
  },
  models: {
    list: () => ipcRenderer.invoke("models:list"),
    add: (profile: unknown) => ipcRenderer.invoke("models:add", profile),
    update: (profile: unknown) => ipcRenderer.invoke("models:update", profile),
    delete: (id: number) => ipcRenderer.invoke("models:delete", id),
    setActive: (id: number) => ipcRenderer.invoke("models:set-active", id)
  },
  codex: {
    getEnabled: () => ipcRenderer.invoke("codex:get"),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke("codex:set", enabled),
    getTemplate: () => ipcRenderer.invoke("codex:get-template"),
    setTemplate: (template: string) => ipcRenderer.invoke("codex:set-template", template),
    run: (task: string) => ipcRenderer.invoke("codex:run", task)
  },
  identity: {
    get: () => ipcRenderer.invoke("identity:get"),
    set: (identity: unknown) => ipcRenderer.invoke("identity:set", identity)
  },
  messages: {
    list: () => ipcRenderer.invoke("messages:list"),
    append: (payload: { role: "user" | "assistant"; content: string }) => ipcRenderer.invoke("messages:append", payload)
  },
  skills: {
    list: () => ipcRenderer.invoke("skills:list"),
    upsert: (skill: { name: string; prompt: string }) => ipcRenderer.invoke("skills:upsert", skill)
  },
  pet: {
    getAppearance: () => ipcRenderer.invoke("pet:get-appearance"),
    importModel: () => ipcRenderer.invoke("pet:import-model"),
    resetAppearance: () => ipcRenderer.invoke("pet:reset-appearance")
  },
  chat: {
    send: (payload: { input: string; skillName: string }) => ipcRenderer.invoke("chat:send", payload),
    startStream: (payload: { requestId: string; input: string; skillName: string }) =>
      ipcRenderer.send("chat:stream-start", payload),
    cancel: (requestId: string) => ipcRenderer.invoke("chat:cancel", requestId),
    onChunk: (handler: (payload: { requestId: string; chunk: string }) => void) => {
      const wrapped = (_: IpcRendererEvent, payload: { requestId: string; chunk: string }) => handler(payload);
      ipcRenderer.on("chat:chunk", wrapped);
      return () => ipcRenderer.removeListener("chat:chunk", wrapped);
    },
    onDone: (handler: (payload: { requestId: string; answer: string; cached: boolean; canceled: boolean }) => void) => {
      const wrapped = (
        _: IpcRendererEvent,
        payload: { requestId: string; answer: string; cached: boolean; canceled: boolean }
      ) => handler(payload);
      ipcRenderer.on("chat:done", wrapped);
      return () => ipcRenderer.removeListener("chat:done", wrapped);
    },
    onError: (handler: (payload: { requestId: string; error: string }) => void) => {
      const wrapped = (_: IpcRendererEvent, payload: { requestId: string; error: string }) => handler(payload);
      ipcRenderer.on("chat:error", wrapped);
      return () => ipcRenderer.removeListener("chat:error", wrapped);
    }
  },
  system: {
    run: (payload: { command: string; type: "install" | "delete" | "other"; allowDelete: boolean }) =>
      ipcRenderer.invoke("system:run", payload)
  }
});
