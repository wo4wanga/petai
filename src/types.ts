export type ModelConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  useLocal: number;
  codexEnabled: number;
};

export type ModelProfile = {
  id: number;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  useLocal: number;
};

export type Identity = {
  pet_name: string;
  pet_identity: string;
  user_name: string;
  user_identity: string;
};


export type MessageHistoryItem = {
  id: number;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
};

export type Skill = {
  id: number;
  name: string;
  prompt: string;
};

export type PetAppearance = {
  label: string;
  modelUrl: string;
  isDefault: boolean;
};

declare global {
  interface Window {
    petApi: {
      window: {
        minimize: () => Promise<void>;
        close: () => Promise<void>;
        togglePin: () => Promise<boolean>;
        setExpanded: (expanded: boolean) => Promise<boolean>;
      };
      config: {
        get: () => Promise<ModelConfig>;
        set: (config: Omit<ModelConfig, "codexEnabled">) => Promise<boolean>;
      };
      models: {
        list: () => Promise<{ activeId: number; profiles: ModelProfile[] }>;
        add: (profile: Omit<ModelProfile, "id">) => Promise<ModelProfile[]>;
        update: (profile: ModelProfile) => Promise<ModelProfile[]>;
        delete: (id: number) => Promise<ModelProfile[]>;
        setActive: (id: number) => Promise<number>;
      };
      codex: {
        getEnabled: () => Promise<boolean>;
        setEnabled: (enabled: boolean) => Promise<boolean>;
        getTemplate: () => Promise<string>;
        setTemplate: (template: string) => Promise<boolean>;
        run: (task: string) => Promise<{ ok: boolean; output: string }>;
      };
      identity: {
        get: () => Promise<Identity>;
        set: (identity: Identity) => Promise<boolean>;
      };
      messages: {
        list: () => Promise<MessageHistoryItem[]>;
        append: (payload: { role: "user" | "assistant"; content: string }) => Promise<boolean>;
      };
      pet: {
        getAppearance: () => Promise<PetAppearance>;
        importModel: () => Promise<PetAppearance | null>;
        resetAppearance: () => Promise<PetAppearance>;
      };
      skills: {
        list: () => Promise<Skill[]>;
        upsert: (skill: { name: string; prompt: string }) => Promise<Skill[]>;
      };
      chat: {
        send: (payload: { input: string; skillName: string }) => Promise<{ answer: string; cached: boolean }>;
        startStream: (payload: { requestId: string; input: string; skillName: string }) => void;
        cancel: (requestId: string) => Promise<boolean>;
        onChunk: (handler: (payload: { requestId: string; chunk: string }) => void) => () => void;
        onDone: (handler: (payload: { requestId: string; answer: string; cached: boolean; canceled: boolean }) => void) => () => void;
        onError: (handler: (payload: { requestId: string; error: string }) => void) => () => void;
      };
      system: {
        run: (payload: {
          command: string;
          type: "install" | "delete" | "other";
          allowDelete: boolean;
        }) => Promise<{ ok: boolean; output: string }>;
      };
    };
  }
}

export {};
