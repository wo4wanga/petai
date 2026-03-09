import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import PetOrb from "./components/PetOrb";
import { Identity, MessageHistoryItem, ModelConfig, ModelProfile, PetAppearance, Skill } from "./types";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; cached?: boolean };
type Language = "zh" | "en";
type SettingsTab = "memory" | "models" | "skills" | "ops";
type ThemeId = "aurora" | "sand" | "midnight" | "mint" | "sunset";
type ChatMode = "api" | "codex";

type TextMap = Record<
  | "open"
  | "collapse"
  | "state"
  | "askAnything"
  | "send"
  | "stop"
  | "cacheHit"
  | "stopped"
  | "settings"
  | "close"
  | "language"
  | "memory"
  | "models"
  | "skills"
  | "ops"
  | "identityMemory"
  | "petName"
  | "petIdentity"
  | "userName"
  | "userIdentity"
  | "saveIdentity"
  | "savedConversations"
  | "currentActiveModel"
  | "profile"
  | "baseUrl"
  | "apiKey"
  | "modelName"
  | "localModelMode"
  | "enableCodex"
  | "saveActiveProfile"
  | "deleteActiveProfile"
  | "addModelProfile"
  | "localModelProfile"
  | "addProfile"
  | "codexBridge"
  | "cmdTemplate"
  | "saveCodexTemplate"
  | "taskForCodex"
  | "runCodexTask"
  | "skillName"
  | "skillPrompt"
  | "saveSkill"
  | "activeSkill"
  | "command"
  | "type"
  | "install"
  | "delete"
  | "other"
  | "confirmDelete"
  | "runCommand"
  | "saveConversation"
  | "resumeConversation"
  | "deleteConversation"
  | "savedOk"
  | "savedFail"
  | "deletedOk"
  | "resumedOk"
  | "copy"
  | "copiedOk"
  | "copyFail"
  | "mode"
  | "apiMode"
  | "codexMode"
  | "codexTaskRequired"
  | "codexResultLabel"
  | "theme"
  | "themeAurora"
  | "themeSand"
  | "themeMidnight"
  | "themeMint"
  | "themeSunset"
  | "petAppearance"
  | "currentAppearance"
  | "chooseAppearance"
  | "resetAppearance"
  | "appearanceUpdated",
  string
>;

const texts: Record<Language, TextMap> = {
  zh: {
    open: "\u6253\u5f00",
    collapse: "\u6536\u8d77",
    state: "\u72b6\u6001",
    askAnything: "\u8f93\u5165\u4f60\u7684\u95ee\u9898...",
    send: "\u53d1\u9001",
    stop: "\u505c\u6b62",
    cacheHit: "\u7f13\u5b58\u547d\u4e2d",
    stopped: "\u5df2\u505c\u6b62",
    settings: "\u8bbe\u7f6e",
    close: "\u5173\u95ed",
    language: "\u8bed\u8a00",
    memory: "\u8bb0\u5fc6",
    models: "\u6a21\u578b",
    skills: "\u6280\u80fd",
    ops: "\u7cfb\u7edf",
    identityMemory: "\u8eab\u4efd\u8bb0\u5fc6",
    petName: "\u5ba0\u7269\u540d\u79f0",
    petIdentity: "\u5ba0\u7269\u8bbe\u5b9a",
    userName: "\u7528\u6237\u540d\u79f0",
    userIdentity: "\u7528\u6237\u8bbe\u5b9a",
    saveIdentity: "\u4fdd\u5b58\u8eab\u4efd",
    savedConversations: "\u5df2\u6536\u85cf\u5bf9\u8bdd",
    currentActiveModel: "\u5f53\u524d\u6fc0\u6d3b\u6a21\u578b",
    profile: "\u914d\u7f6e\u6863",
    baseUrl: "Base URL",
    apiKey: "API Key",
    modelName: "\u6a21\u578b\u540d",
    localModelMode: "\u672c\u5730\u6a21\u578b\u6a21\u5f0f",
    enableCodex: "\u542f\u7528 Codex \u96c6\u6210",
    saveActiveProfile: "\u4fdd\u5b58\u5f53\u524d\u914d\u7f6e",
    deleteActiveProfile: "\u5220\u9664\u5f53\u524d\u914d\u7f6e",
    addModelProfile: "\u65b0\u589e\u6a21\u578b\u914d\u7f6e",
    localModelProfile: "\u672c\u5730\u6a21\u578b\u914d\u7f6e",
    addProfile: "\u6dfb\u52a0\u914d\u7f6e",
    codexBridge: "Codex \u6865\u63a5",
    cmdTemplate: "\u547d\u4ee4\u6a21\u677f\uff08\u4f7f\u7528 {task}\uff09",
    saveCodexTemplate: "\u4fdd\u5b58\u6a21\u677f",
    taskForCodex: "Codex \u4efb\u52a1",
    runCodexTask: "\u6267\u884c Codex \u4efb\u52a1",
    skillName: "\u6280\u80fd\u540d\u79f0",
    skillPrompt: "\u6280\u80fd\u63d0\u793a\u8bcd",
    saveSkill: "\u4fdd\u5b58\u6280\u80fd",
    activeSkill: "\u5f53\u524d\u6280\u80fd",
    command: "\u547d\u4ee4",
    type: "\u7c7b\u578b",
    install: "\u5b89\u88c5",
    delete: "\u5220\u9664",
    other: "\u5176\u4ed6",
    confirmDelete: "\u6211\u786e\u8ba4\u672c\u6b21\u5141\u8bb8\u5220\u9664",
    runCommand: "\u6267\u884c\u547d\u4ee4",
    saveConversation: "\u6536\u85cf\u5f53\u524d\u4f1a\u8bdd",
    resumeConversation: "\u7ee7\u7eed\u5bf9\u8bdd",
    deleteConversation: "\u5220\u9664",
    savedOk: "\u5df2\u6536\u85cf\u5f53\u524d\u4f1a\u8bdd",
    savedFail: "\u6536\u85cf\u5931\u8d25",
    deletedOk: "\u5df2\u5220\u9664\u6536\u85cf",
    resumedOk: "\u5df2\u6062\u590d\u5bf9\u8bdd\u4e0a\u4e0b\u6587",
    copy: "\u590d\u5236",
    copiedOk: "\u5df2\u590d\u5236",
    copyFail: "\u590d\u5236\u5931\u8d25",
    mode: "\u6a21\u5f0f",
    apiMode: "API",
    codexMode: "CODEX",
    codexTaskRequired: "\u8bf7\u5728 /codex \u540e\u8f93\u5165\u4efb\u52a1",
    codexResultLabel: "Codex \u6267\u884c\u7ed3\u679c",
    theme: "\u914d\u8272",
    themeAurora: "\u6781\u5149\u6df1\u6d77",
    themeSand: "\u6e29\u67d4\u6c99\u6d32",
    themeMidnight: "\u591c\u5e55\u77f3\u58a8",
    themeMint: "\u8584\u8377\u7eff\u6d32",
    themeSunset: "\u843d\u65e5\u73ca\u745a",
    petAppearance: "\u5ba0\u7269\u5f62\u8c61",
    currentAppearance: "\u5f53\u524d\u5f62\u8c61",
    chooseAppearance: "\u9009\u62e9\u5f62\u8c61\u6587\u4ef6",
    resetAppearance: "\u6062\u590d\u9ed8\u8ba4\u5f62\u8c61",
    appearanceUpdated: "\u5df2\u66f4\u65b0\u5ba0\u7269\u5f62\u8c61"
  },
  en: {
    open: "Open",
    collapse: "Collapse",
    state: "state",
    askAnything: "Ask anything...",
    send: "Send",
    stop: "Stop",
    cacheHit: "cache hit",
    stopped: "[stopped]",
    settings: "Settings",
    close: "Close",
    language: "Language",
    memory: "Memory",
    models: "Models",
    skills: "Skills",
    ops: "Ops",
    identityMemory: "Identity Memory",
    petName: "Pet Name",
    petIdentity: "Pet Identity",
    userName: "User Name",
    userIdentity: "User Identity",
    saveIdentity: "Save Identity",
    savedConversations: "Saved Conversations",
    currentActiveModel: "Current Active Model",
    profile: "Profile",
    baseUrl: "Base URL",
    apiKey: "API Key",
    modelName: "Model Name",
    localModelMode: "Local Model Mode",
    enableCodex: "Enable Codex Integration",
    saveActiveProfile: "Save Active Profile",
    deleteActiveProfile: "Delete Active Profile",
    addModelProfile: "Add Model Profile",
    localModelProfile: "Local model profile",
    addProfile: "Add Profile",
    codexBridge: "Codex Bridge",
    cmdTemplate: "Command Template (use {task})",
    saveCodexTemplate: "Save Codex Template",
    taskForCodex: "Task for Codex",
    runCodexTask: "Run Codex Task",
    skillName: "Skill Name",
    skillPrompt: "Skill Prompt",
    saveSkill: "Save Skill",
    activeSkill: "Active Skill",
    command: "Command",
    type: "Type",
    install: "install",
    delete: "delete",
    other: "other",
    confirmDelete: "I confirm delete permission for this run",
    runCommand: "Run Command",
    saveConversation: "Save Session",
    resumeConversation: "Resume",
    deleteConversation: "Delete",
    savedOk: "Session saved",
    savedFail: "Save failed",
    deletedOk: "Deleted",
    resumedOk: "Context restored",
    copy: "Copy",
    copiedOk: "Copied",
    copyFail: "Copy failed",
    mode: "Mode",
    apiMode: "API",
    codexMode: "CODEX",
    codexTaskRequired: "Please provide a task after /codex",
    codexResultLabel: "Codex Result",
    theme: "Theme",
    themeAurora: "Aurora Sea",
    themeSand: "Warm Sand",
    themeMidnight: "Midnight Graphite",
    themeMint: "Mint Oasis",
    themeSunset: "Sunset Coral",
    petAppearance: "Pet Appearance",
    currentAppearance: "Current Appearance",
    chooseAppearance: "Choose Model File",
    resetAppearance: "Reset Default",
    appearanceUpdated: "Pet appearance updated"
  }
};

const defaultIdentity: Identity = {
  pet_name: "Nova",
  pet_identity: "A desktop AI pet focused on useful, concise help.",
  user_name: "Owner",
  user_identity: "Wants practical answers and direct execution help."
};

const defaultAppearance: PetAppearance = {
  label: "Default Dog",
  modelUrl: "/models/dog.gltf",
  isDefault: true
};

const defaultConfig: ModelConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4.1-mini",
  useLocal: 0,
  codexEnabled: 0
};

const createId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const detectLanguage = (): Language => {
  const stored = localStorage.getItem("ui_language");
  if (stored === "zh" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
};


const detectTheme = (): ThemeId => {
  const stored = localStorage.getItem("ui_theme");
  if (stored === "aurora" || stored === "sand" || stored === "midnight" || stored === "mint" || stored === "sunset") {
    return stored;
  }
  return "aurora";
};

const themeStyles: Record<ThemeId, CSSProperties> = {
  aurora: {
    "--text-primary": "#e8fffd",
    "--panel-bg-collapsed": "radial-gradient(circle at 30% 20%, #145a56, #062f2c)",
    "--panel-bg-expanded": "radial-gradient(circle at 30% 20%, #127069, #063a36)",
    "--topbar-bg": "rgba(4, 36, 33, 0.9)",
    "--surface-1": "rgba(8, 66, 62, 0.55)",
    "--surface-2": "rgba(3, 25, 22, 0.95)",
    "--surface-3": "rgba(0, 0, 0, 0.25)",
    "--border-color": "rgba(255, 255, 255, 0.2)",
    "--message-user-bg": "rgba(14, 116, 144, 0.45)",
    "--message-assistant-bg": "rgba(21, 94, 117, 0.55)",
    "--accent-bg": "#14b8a6",
    "--accent-text": "#03201d",
    "--toast-bg": "rgba(20, 184, 166, 0.92)",
    "--toast-text": "#042f2e"
  } as CSSProperties,
  sand: {
    "--text-primary": "#fff7e8",
    "--panel-bg-collapsed": "radial-gradient(circle at 30% 20%, #7f6040, #392716)",
    "--panel-bg-expanded": "radial-gradient(circle at 30% 20%, #8f6b45, #49331d)",
    "--topbar-bg": "rgba(46, 31, 18, 0.9)",
    "--surface-1": "rgba(107, 75, 49, 0.6)",
    "--surface-2": "rgba(38, 26, 16, 0.95)",
    "--surface-3": "rgba(20, 12, 8, 0.3)",
    "--border-color": "rgba(255, 233, 205, 0.26)",
    "--message-user-bg": "rgba(179, 104, 51, 0.5)",
    "--message-assistant-bg": "rgba(120, 84, 55, 0.55)",
    "--accent-bg": "#f59e0b",
    "--accent-text": "#2a1b0f",
    "--toast-bg": "rgba(245, 158, 11, 0.92)",
    "--toast-text": "#2a1b0f"
  } as CSSProperties,
  midnight: {
    "--text-primary": "#f3f6ff",
    "--panel-bg-collapsed": "radial-gradient(circle at 30% 20%, #363d57, #141926)",
    "--panel-bg-expanded": "radial-gradient(circle at 30% 20%, #3f496b, #1a2030)",
    "--topbar-bg": "rgba(17, 22, 36, 0.9)",
    "--surface-1": "rgba(47, 57, 85, 0.58)",
    "--surface-2": "rgba(14, 18, 30, 0.96)",
    "--surface-3": "rgba(0, 0, 0, 0.32)",
    "--border-color": "rgba(194, 209, 255, 0.24)",
    "--message-user-bg": "rgba(92, 120, 220, 0.45)",
    "--message-assistant-bg": "rgba(74, 97, 186, 0.56)",
    "--accent-bg": "#7c9bff",
    "--accent-text": "#10162a",
    "--toast-bg": "rgba(124, 155, 255, 0.92)",
    "--toast-text": "#10162a"
  } as CSSProperties,
  mint: {
    "--text-primary": "#e8fff5",
    "--panel-bg-collapsed": "radial-gradient(circle at 30% 20%, #236f5d, #10352e)",
    "--panel-bg-expanded": "radial-gradient(circle at 30% 20%, #2c856d, #15463b)",
    "--topbar-bg": "rgba(14, 46, 38, 0.9)",
    "--surface-1": "rgba(37, 115, 95, 0.58)",
    "--surface-2": "rgba(11, 36, 30, 0.95)",
    "--surface-3": "rgba(0, 0, 0, 0.28)",
    "--border-color": "rgba(203, 255, 235, 0.25)",
    "--message-user-bg": "rgba(46, 174, 140, 0.45)",
    "--message-assistant-bg": "rgba(40, 130, 110, 0.55)",
    "--accent-bg": "#34d399",
    "--accent-text": "#0f2f28",
    "--toast-bg": "rgba(52, 211, 153, 0.92)",
    "--toast-text": "#0f2f28"
  } as CSSProperties,
  sunset: {
    "--text-primary": "#fff2f0",
    "--panel-bg-collapsed": "radial-gradient(circle at 30% 20%, #9a4c57, #4d1f2a)",
    "--panel-bg-expanded": "radial-gradient(circle at 30% 20%, #af5d69, #5b2732)",
    "--topbar-bg": "rgba(62, 26, 33, 0.9)",
    "--surface-1": "rgba(143, 68, 79, 0.56)",
    "--surface-2": "rgba(44, 18, 24, 0.95)",
    "--surface-3": "rgba(0, 0, 0, 0.28)",
    "--border-color": "rgba(255, 214, 214, 0.24)",
    "--message-user-bg": "rgba(232, 96, 114, 0.45)",
    "--message-assistant-bg": "rgba(163, 74, 90, 0.56)",
    "--accent-bg": "#fb7185",
    "--accent-text": "#3d121a",
    "--toast-bg": "rgba(251, 113, 133, 0.92)",
    "--toast-text": "#3d121a"
  } as CSSProperties
};


export default function App() {
  const [language, setLanguage] = useState<Language>(() => detectLanguage());
  const t = texts[language];
  const [theme, setTheme] = useState<ThemeId>(() => detectTheme());

  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("memory");
  const [petState, setPetState] = useState<"idle" | "thinking" | "speaking">("idle");

  const [config, setConfig] = useState<ModelConfig>(defaultConfig);
  const [identity, setIdentity] = useState<Identity>(defaultIdentity);
  const [petAppearance, setPetAppearance] = useState<PetAppearance>(defaultAppearance);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("Default");
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillPrompt, setNewSkillPrompt] = useState("");

  const [modelProfiles, setModelProfiles] = useState<ModelProfile[]>([]);
  const [activeModelId, setActiveModelId] = useState<number>(0);
  const [newProfile, setNewProfile] = useState<Omit<ModelProfile, "id">>({
    name: "",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4.1-mini",
    useLocal: 0
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("api");
  const [streamingRequestId, setStreamingRequestId] = useState<string | null>(null);
  const streamingAssistantIdRef = useRef<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [command, setCommand] = useState("");
  const [opType, setOpType] = useState<"install" | "delete" | "other">("install");
  const [allowDelete, setAllowDelete] = useState(false);
  const [opOutput, setOpOutput] = useState("");

  const [codexRunning, setCodexRunning] = useState(false);
  const [codexTemplate, setCodexTemplate] = useState('codex exec "{task}"');

  const [toast, setToast] = useState<string | null>(null);

  const reloadModels = async () => {
    const data = await window.petApi.models.list();
    setModelProfiles(data.profiles);
    setActiveModelId(data.activeId);

    const active = data.profiles.find((p) => p.id === data.activeId);
    if (active) {
      setConfig((prev) => ({
        ...prev,
        baseUrl: active.baseUrl,
        apiKey: active.apiKey,
        model: active.model,
        useLocal: active.useLocal
      }));
    }
  };

  useEffect(() => {
    localStorage.setItem("ui_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      const [cfg, idt, appearance, history, skillList, codexEnabled, template] = await Promise.all([
        window.petApi.config.get(),
        window.petApi.identity.get(),
        window.petApi.pet.getAppearance(),
        window.petApi.messages.list(),
        window.petApi.skills.list(),
        window.petApi.codex.getEnabled(),
        window.petApi.codex.getTemplate()
      ]);
      setConfig({ ...cfg, codexEnabled: codexEnabled ? 1 : 0 });
      setIdentity(idt);
      setPetAppearance(appearance);
      setMessages(history.map((msg: MessageHistoryItem) => ({ id: `history-${msg.id}`, role: msg.role === "assistant" ? "assistant" : "user", content: msg.content })));
      setSkills(skillList);
      setCodexTemplate(template);
      if (skillList.length > 0) {
        setSelectedSkill(skillList[0].name);
      }
      await reloadModels();
    };
    init();
  }, []);

  useEffect(() => {
    window.petApi.window.setExpanded(expanded);
    if (!expanded) {
      setSettingsOpen(false);
    }
  }, [expanded]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const scrollMessagesToBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (!expanded) return;
    requestAnimationFrame(scrollMessagesToBottom);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    requestAnimationFrame(scrollMessagesToBottom);
  }, [expanded, messages.length]);

  useEffect(() => {
    const offChunk = window.petApi.chat.onChunk(({ requestId, chunk }) => {
      if (requestId !== streamingRequestId || !streamingAssistantIdRef.current) return;
      const targetId = streamingAssistantIdRef.current;
      setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: m.content + chunk } : m)));
      setPetState("speaking");
    });

    const offDone = window.petApi.chat.onDone(({ requestId, cached, canceled }) => {
      if (requestId !== streamingRequestId || !streamingAssistantIdRef.current) return;
      const targetId = streamingAssistantIdRef.current;
      setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, cached } : m)));
      if (canceled) {
        setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: `${m.content}\n\n${t.stopped}` } : m)));
      }
      setStreamingRequestId(null);
      streamingAssistantIdRef.current = null;
      setPetState("idle");
    });

    const offError = window.petApi.chat.onError(({ requestId, error }) => {
      if (requestId !== streamingRequestId || !streamingAssistantIdRef.current) return;
      const targetId = streamingAssistantIdRef.current;
      setMessages((prev) => prev.map((m) => (m.id === targetId ? { ...m, content: `Error: ${error}` } : m)));
      setStreamingRequestId(null);
      streamingAssistantIdRef.current = null;
      setPetState("idle");
    });

    return () => {
      offChunk();
      offDone();
      offError();
    };
  }, [streamingRequestId, t.stopped]);

  const appendMessageHistory = async (role: "user" | "assistant", content: string) => {
    const api = (window.petApi as unknown as { messages?: { append?: (payload: { role: "user" | "assistant"; content: string }) => Promise<boolean> } }).messages;
    if (!api?.append) return;
    try {
      await api.append({ role, content });
    } catch {
      // Keep chat usable even when preload is stale or append is unavailable.
    }
  };

  const runCodexFromChat = async (taskText: string, userDisplayText: string) => {
    const task = taskText.trim();
    if (!task) {
      setToast(t.codexTaskRequired);
      return;
    }

    const userId = createId();
    const assistantId = createId();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: userDisplayText },
      { id: assistantId, role: "assistant", content: "" }
    ]);
    setInput("");
    setPetState("thinking");
    setCodexRunning(true);

    try {
      await appendMessageHistory("user", userDisplayText);
      const result = await window.petApi.codex.run(task);
      const content = t.codexResultLabel + "\n" + (result.ok ? "OK" : "FAILED") + "\n" + result.output;
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)));
      await appendMessageHistory("assistant", content);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      const content = t.codexResultLabel + "\nFAILED\n" + msg;
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)));
    } finally {
      setCodexRunning(false);
      setPetState("idle");
    }
  };

  const sendMessage = async (text: string) => {
    if (!text || streamingRequestId || codexRunning) return;

    if (chatMode === "codex") {
      await runCodexFromChat(text, text);
      return;
    }

    if (/^\/codex\b/i.test(text)) {
      const task = text.replace(/^\/codex\b/i, "").trim();
      await runCodexFromChat(task, text);
      return;
    }

    const requestId = createId();
    const userId = createId();
    const assistantId = createId();

    streamingAssistantIdRef.current = assistantId;
    setStreamingRequestId(requestId);
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" }
    ]);
    setInput("");
    setPetState("thinking");

    window.petApi.chat.startStream({ requestId, input: text, skillName: selectedSkill });
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    void sendMessage(text);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = input.trim();
      if (text) void sendMessage(text);
    }
  };

  const copyMessage = async (content: string) => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setToast(t.copiedOk);
    } catch {
      setToast(t.copyFail);
    }
  };

  const stopStreaming = async () => {
    if (!streamingRequestId) return;
    await window.petApi.chat.cancel(streamingRequestId);
  };

  const saveConfig = async () => {
    await window.petApi.config.set({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      useLocal: config.useLocal
    });
    await reloadModels();
  };

  const addModelProfile = async () => {
    if (!newProfile.name.trim()) return;
    await window.petApi.models.add({
      name: newProfile.name.trim(),
      baseUrl: newProfile.baseUrl.trim(),
      apiKey: newProfile.apiKey,
      model: newProfile.model.trim(),
      useLocal: newProfile.useLocal
    });
    setNewProfile({
      name: "",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-4.1-mini",
      useLocal: 0
    });
    await reloadModels();
  };

  const selectModelProfile = async (id: number) => {
    await window.petApi.models.setActive(id);
    await reloadModels();
  };

  const deleteModelProfile = async (id: number) => {
    await window.petApi.models.delete(id);
    await reloadModels();
  };

  const saveIdentity = async () => {
    await window.petApi.identity.set(identity);
  };

  const importPetAppearance = async () => {
    const next = await window.petApi.pet.importModel();
    if (!next) return;
    setPetAppearance(next);
    setToast(t.appearanceUpdated);
  };

  const resetPetAppearance = async () => {
    const next = await window.petApi.pet.resetAppearance();
    setPetAppearance(next);
    setToast(t.appearanceUpdated);
  };

  const upsertSkill = async () => {
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;
    const next = await window.petApi.skills.upsert({ name: newSkillName.trim(), prompt: newSkillPrompt.trim() });
    setSkills(next);
    setSelectedSkill(newSkillName.trim());
    setNewSkillName("");
    setNewSkillPrompt("");
  };

  const runSystemOp = async () => {
    if (!command.trim()) return;
    const result = await window.petApi.system.run({ command, type: opType, allowDelete });
    setOpOutput(`${result.ok ? "OK" : "FAILED"}\n${result.output}`);
  };

  const saveCodexTemplate = async () => {
    await window.petApi.codex.setTemplate(codexTemplate);
  };

  const toggleCodex = async (value: boolean) => {
    await window.petApi.codex.setEnabled(value);
    setConfig((prev) => ({ ...prev, codexEnabled: value ? 1 : 0 }));
  };

  const panelClass = useMemo(() => (expanded ? "panel expanded" : "panel"), [expanded]);
  const themeStyle = useMemo(() => themeStyles[theme], [theme]);

  return (
    <div className="shell" style={themeStyle}>
      <div className={panelClass}>
        {toast && <div className="toast">{toast}</div>}

        {expanded && (
          <header className="topbar">
            <button onClick={() => setExpanded(false)}>{t.collapse}</button>
            <button onClick={() => setSettingsOpen((v) => !v)}>{settingsOpen ? t.close : t.settings}</button>
            <div className="grow" />
            <button onClick={() => window.petApi.window.minimize()}>_</button>
            <button onClick={() => window.petApi.window.close()}>X</button>
          </header>
        )}

        {!expanded && (
          <button className="float-ball" onClick={() => setExpanded(true)} title={t.open}>
            <PetOrb state={petState} modelUrl={petAppearance.modelUrl} />
          </button>
        )}

        {expanded && (
          <>
            <div className="pet-row">
              <PetOrb state={petState} modelUrl={petAppearance.modelUrl} />
              <div>
                <div className="title">{identity.pet_name}</div>
                <div className="sub">{t.state}: {petState}</div>
              </div>
            </div>

            <section className="view chat-main">
              <div className="messages" ref={messagesRef}>
                {messages.map((m) => (
                  <div className={`msg ${m.role}`} key={m.id}>
                    <div className="msg-content">{m.content || (m.role === "assistant" && streamingRequestId ? "..." : "")}</div>
                    <div className="msg-actions">
                      {m.cached && <small>{t.cacheHit}</small>}
                      {m.role === "assistant" && m.content && (
                        <button type="button" className="copy-btn" onClick={() => copyMessage(m.content)}>{t.copy}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="row mode-row">
                <label>{t.mode}</label>
                <div className="mode-switch">
                  <button type="button" className={chatMode === "api" ? "active" : ""} onClick={() => setChatMode("api")}>{t.apiMode}</button>
                  <button type="button" className={chatMode === "codex" ? "active" : ""} onClick={() => setChatMode("codex")}>{t.codexMode}</button>
                </div>
              </div>

              {chatMode === "api" && (
                <div className="row">
                  <label>{t.activeSkill}</label>
                  <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)}>
                    {skills.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <form className="composer" onSubmit={handleSend}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={t.askAnything}
                />
                <div className="row">
                  <button type="submit" disabled={!!streamingRequestId || codexRunning}>{t.send}</button>
                  <button type="button" className="danger" disabled={!streamingRequestId} onClick={stopStreaming}>{t.stop}</button>
                </div>
              </form>
            </section>

            {settingsOpen && (
              <section className="settings-panel">
                <div className="settings-tabs">
                  <button className={settingsTab === "memory" ? "active" : ""} onClick={() => setSettingsTab("memory")}>{t.memory}</button>
                  <button className={settingsTab === "models" ? "active" : ""} onClick={() => setSettingsTab("models")}>{t.models}</button>
                  <button className={settingsTab === "skills" ? "active" : ""} onClick={() => setSettingsTab("skills")}>{t.skills}</button>
                  <button className={settingsTab === "ops" ? "active" : ""} onClick={() => setSettingsTab("ops")}>{t.ops}</button>
                </div>

                <div className="settings-lang">
                  <label>{t.language}</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                    <option value="zh">{"\u4e2d\u6587"}</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="settings-lang">
                  <label>{t.theme}</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
                    <option value="aurora">{t.themeAurora}</option>
                    <option value="sand">{t.themeSand}</option>
                    <option value="midnight">{t.themeMidnight}</option>
                    <option value="mint">{t.themeMint}</option>
                    <option value="sunset">{t.themeSunset}</option>
                  </select>
                </div>

                <div className="settings-body">
                  {settingsTab === "memory" && (
                    <section className="view">
                      <h3>{t.identityMemory}</h3>
                      <label>{t.petName}</label>
                      <input value={identity.pet_name} onChange={(e) => setIdentity((p) => ({ ...p, pet_name: e.target.value }))} />
                      <label>{t.petIdentity}</label>
                      <textarea value={identity.pet_identity} onChange={(e) => setIdentity((p) => ({ ...p, pet_identity: e.target.value }))} />
                      <label>{t.userName}</label>
                      <input value={identity.user_name} onChange={(e) => setIdentity((p) => ({ ...p, user_name: e.target.value }))} />
                      <label>{t.userIdentity}</label>
                      <textarea value={identity.user_identity} onChange={(e) => setIdentity((p) => ({ ...p, user_identity: e.target.value }))} />
                      <button onClick={saveIdentity}>{t.saveIdentity}</button>

                      <h3>{t.petAppearance}</h3>
                      <article className="appearance-card">
                        <div className="appearance-preview">
                          <PetOrb state={petState} modelUrl={petAppearance.modelUrl} />
                        </div>
                        <div className="appearance-info">
                          <strong>{t.currentAppearance}</strong>
                          <div className="sub">{petAppearance.label}</div>
                          <div className="row">
                            <button onClick={importPetAppearance}>{t.chooseAppearance}</button>
                            <button onClick={resetPetAppearance} disabled={petAppearance.isDefault}>{t.resetAppearance}</button>
                          </div>
                        </div>
                      </article>
                    </section>
                  )}

                  {settingsTab === "models" && (
                    <section className="view">
                      <h3>{t.currentActiveModel}</h3>
                      <label>{t.profile}</label>
                      <select value={activeModelId} onChange={(e) => selectModelProfile(Number(e.target.value))}>
                        {modelProfiles.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.model})</option>
                        ))}
                      </select>

                      <label>{t.baseUrl}</label>
                      <input value={config.baseUrl} onChange={(e) => setConfig((p) => ({ ...p, baseUrl: e.target.value }))} />
                      <label>{t.apiKey}</label>
                      <input value={config.apiKey} onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))} />
                      <label>{t.modelName}</label>
                      <input value={config.model} onChange={(e) => setConfig((p) => ({ ...p, model: e.target.value }))} />

                      <label className="check">
                        <input type="checkbox" checked={!!config.useLocal} onChange={(e) => setConfig((p) => ({ ...p, useLocal: e.target.checked ? 1 : 0 }))} />
                        {t.localModelMode}
                      </label>

                      <label className="check">
                        <input type="checkbox" checked={!!config.codexEnabled} onChange={(e) => toggleCodex(e.target.checked)} />
                        {t.enableCodex}
                      </label>

                      <div className="row">
                        <button onClick={saveConfig}>{t.saveActiveProfile}</button>
                        <button onClick={() => activeModelId && deleteModelProfile(activeModelId)}>{t.deleteActiveProfile}</button>
                      </div>

                      <h3>{t.addModelProfile}</h3>
                      <input value={newProfile.name} onChange={(e) => setNewProfile((p) => ({ ...p, name: e.target.value }))} placeholder="My OpenAI" />
                      <input value={newProfile.baseUrl} onChange={(e) => setNewProfile((p) => ({ ...p, baseUrl: e.target.value }))} placeholder="Base URL" />
                      <input value={newProfile.apiKey} onChange={(e) => setNewProfile((p) => ({ ...p, apiKey: e.target.value }))} placeholder="API Key" />
                      <input value={newProfile.model} onChange={(e) => setNewProfile((p) => ({ ...p, model: e.target.value }))} placeholder="Model" />
                      <label className="check">
                        <input type="checkbox" checked={!!newProfile.useLocal} onChange={(e) => setNewProfile((p) => ({ ...p, useLocal: e.target.checked ? 1 : 0 }))} />
                        {t.localModelProfile}
                      </label>
                      <button onClick={addModelProfile}>{t.addProfile}</button>

                      <h3>{t.codexBridge}</h3>
                      <label>{t.cmdTemplate}</label>
                      <input value={codexTemplate} onChange={(e) => setCodexTemplate(e.target.value)} />
                      <button onClick={saveCodexTemplate}>{t.saveCodexTemplate}</button>
                    </section>
                  )}

                  {settingsTab === "skills" && (
                    <section className="view">
                      <label>{t.skillName}</label>
                      <input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder="Coding" />
                      <label>{t.skillPrompt}</label>
                      <textarea value={newSkillPrompt} onChange={(e) => setNewSkillPrompt(e.target.value)} />
                      <button onClick={upsertSkill}>{t.saveSkill}</button>

                      <div className="snippets">
                        {skills.map((s) => (
                          <article key={s.id}>
                            <strong>{s.name}</strong>
                            <p>{s.prompt}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  {settingsTab === "ops" && (
                    <section className="view">
                      <label>{t.command}</label>
                      <textarea value={command} onChange={(e) => setCommand(e.target.value)} placeholder="winget install Git.Git" />

                      <label>{t.type}</label>
                      <select value={opType} onChange={(e) => setOpType(e.target.value as "install" | "delete" | "other")}>
                        <option value="install">{t.install}</option>
                        <option value="delete">{t.delete}</option>
                        <option value="other">{t.other}</option>
                      </select>

                      <label className="check">
                        <input type="checkbox" checked={allowDelete} onChange={(e) => setAllowDelete(e.target.checked)} />
                        {t.confirmDelete}
                      </label>

                      <button onClick={runSystemOp}>{t.runCommand}</button>
                      {opOutput && <pre>{opOutput}</pre>}
                    </section>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
