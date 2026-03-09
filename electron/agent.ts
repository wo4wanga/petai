import { dbApi } from "./db.js";

export interface ChatResult {
  answer: string;
  cached: boolean;
  canceled?: boolean;
}

type ChatRole = "system" | "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string };

const normalizeQuestion = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

const generateSummary = (messages: Array<{ role: string; content: string }>) => {
  const recentUser = messages
    .filter((m) => m.role === "user")
    .slice(-5)
    .map((m) => m.content)
    .join(" | ");
  const summary = recentUser.slice(0, 600);
  dbApi.setSummary(summary);
  return summary;
};

const buildPromptMessages = (input: string, selectedSkill: string): { model: ReturnType<typeof dbApi.getModelConfig>; messages: ChatMsg[] } => {
  const model = dbApi.getModelConfig();
  if (!model.model || !model.baseUrl) {
    throw new Error("Model config missing. Please set baseURL and model in settings.");
  }
  if (!model.useLocal && !model.apiKey) {
    throw new Error("API key missing. Please set API key in settings.");
  }

  const identity = dbApi.getIdentity();
  const recent = dbApi.listRecentMessages(12).map((m) => ({ role: m.role as ChatRole, content: m.content }));
  const summary = dbApi.getSummary();
  const skills = dbApi.listSkills();
  const skillPrompt = skills.find((s) => s.name === selectedSkill)?.prompt ?? skills[0]?.prompt ?? "";

  const systemPrompt = [
    `You are ${identity.pet_name}. ${identity.pet_identity}`,
    `The user is ${identity.user_name}. ${identity.user_identity}`,
    `Use this conversation policy: ${skillPrompt}`,
    summary ? `Session summary: ${summary}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...recent, { role: "user", content: input }]
  };
};

const callCompatibleChatApi = async (baseUrl: string, apiKey: string, model: string, messages: ChatMsg[]) => {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, temperature: 0.6, messages })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Model request failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "No answer returned from model.";
};

const callCompatibleChatApiStream = async (
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMsg[],
  signal: AbortSignal,
  onChunk: (chunk: string) => void
) => {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      stream: true,
      messages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Model request failed (${response.status}): ${err}`);
  }

  if (!response.body) {
    throw new Error("Model stream not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = parsed.choices?.[0]?.delta?.content ?? "";
        if (chunk) {
          answer += chunk;
          onChunk(chunk);
        }
      } catch {
        continue;
      }
    }
  }

  return answer.trim() || "No answer returned from model.";
};

const persistExchange = (input: string, answer: string) => {
  dbApi.saveMessage("user", input);
  dbApi.saveMessage("assistant", answer);

  const latest = dbApi.listRecentMessages(20).map((m) => ({ role: m.role, content: m.content }));
  if (latest.length % 10 === 0) {
    generateSummary(latest);
  }
};

export const chatWithPet = async (input: string, selectedSkill: string): Promise<ChatResult> => {
  const normalized = normalizeQuestion(input);
  const cached = dbApi.getCachedAnswer(normalized);
  if (cached) {
    persistExchange(input, cached);
    return { answer: cached, cached: true };
  }

  const { model, messages } = buildPromptMessages(input, selectedSkill);
  const answer = await callCompatibleChatApi(model.baseUrl, model.apiKey, model.model, messages);

  dbApi.setCachedAnswer(normalized, answer);
  persistExchange(input, answer);
  return { answer, cached: false };
};

export const chatWithPetStream = async (
  input: string,
  selectedSkill: string,
  signal: AbortSignal,
  onChunk: (chunk: string) => void
): Promise<ChatResult> => {
  const normalized = normalizeQuestion(input);
  const cached = dbApi.getCachedAnswer(normalized);
  if (cached) {
    onChunk(cached);
    persistExchange(input, cached);
    return { answer: cached, cached: true, canceled: false };
  }

  const { model, messages } = buildPromptMessages(input, selectedSkill);
  let answer = "";

  try {
    answer = await callCompatibleChatApiStream(model.baseUrl, model.apiKey, model.model, messages, signal, onChunk);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { answer, cached: false, canceled: true };
    }
    throw error;
  }

  dbApi.setCachedAnswer(normalized, answer);
  persistExchange(input, answer);
  return { answer, cached: false, canceled: false };
};
