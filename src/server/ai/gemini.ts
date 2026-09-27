import "server-only";

import { AIRefusalError, type AIProvider, type GenerateRequest, type JsonRequest } from "./types";

/** Google Gemini via the Generative Language REST API (server-side key). */
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
  finishReason?: string;
}

function body(req: GenerateRequest, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: req.maxTokens ?? 8192, ...extra },
  });
}

function headers() {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
  };
}

function textOf(candidate: GeminiCandidate | undefined) {
  if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT") {
    throw new AIRefusalError();
  }
  return candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export const geminiProvider: AIProvider = {
  id: "gemini",

  async *stream(req: GenerateRequest) {
    const res = await fetch(`${BASE}/${MODEL}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: headers(),
      body: body(req),
    });
    if (!res.ok || !res.body) throw new Error(`Gemini request failed (${res.status})`);
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        const chunk = JSON.parse(payload) as { candidates?: GeminiCandidate[] };
        const text = textOf(chunk.candidates?.[0]);
        if (text) yield text;
      }
    }
  },

  async json<T>(req: JsonRequest): Promise<T> {
    const res = await fetch(`${BASE}/${MODEL}:generateContent`, {
      method: "POST",
      headers: headers(),
      body: body(req, { responseMimeType: "application/json", responseSchema: req.schema }),
    });
    if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
    const data = (await res.json()) as { candidates?: GeminiCandidate[] };
    return JSON.parse(textOf(data.candidates?.[0])) as T;
  },
};
