const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

let keyIndex = 0;

export function getApiKeys(): string[] {
  const keys: string[] = [];
  const combined = process.env.OPENROUTER_API_KEYS;
  if (combined) {
    keys.push(
      ...combined
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    );
  }
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`];
    if (k?.trim()) keys.push(k.trim());
  }
  return [...new Set(keys)];
}

export function getModels(): string[] {
  const raw =
    process.env.OPENROUTER_MODELS ??
    "openrouter/free,deepseek/deepseek-chat-v3-0324:free,qwen/qwen-2.5-coder-32b-instruct:free";
  const models = raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  
  // OpenRouter allows max 3 models in fallback array
  return models.slice(0, 3);
}

export function nextApiKey(): string {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No OpenRouter API keys configured. Set OPENROUTER_API_KEY_1, _2, _3 or OPENROUTER_API_KEYS."
    );
  }
  const key = keys[keyIndex % keys.length];
  keyIndex += 1;
  return key;
}

export function keyForIndex(index: number): string {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("No OpenRouter API keys configured.");
  return keys[index % keys.length];
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  model: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  keyOverride?: string
): Promise<ChatResult> {
  const apiKey = keyOverride ?? nextApiKey();
  const models = getModels();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const body: Record<string, unknown> = {
    models,
    messages,
    temperature: 0.2,
    max_tokens: 8192,
  };

  if (models.length === 1) {
    body.model = models[0];
    delete body.models;
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": siteUrl,
      "X-Title": "Vettcode Engine",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenRouter");

  return { content, model: data.model ?? models[0] };
}

export function parseJsonFromModel<T>(raw: string): T {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonStr) as T;
}
