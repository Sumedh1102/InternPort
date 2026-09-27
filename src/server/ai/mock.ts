import "server-only";

import type { AIProvider, GenerateRequest, JsonRequest } from "./types";

/**
 * Deterministic offline provider for local development and automated tests
 * (AI_PROVIDER=mock). It never claims to be a real model.
 */
export const mockProvider: AIProvider = {
  id: "mock",

  async *stream(req: GenerateRequest) {
    const question = req.messages.at(-1)?.content ?? "";
    const programLine = req.system.match(/^Program: (.+)$/m)?.[1];
    const reply =
      `**(Demo assistant — no AI provider is configured.)**\n\n` +
      `You asked: “${question.slice(0, 160)}”.\n\n` +
      `Here's a hint-first approach${programLine ? ` for *${programLine}*` : ""}:\n\n` +
      `1. Restate the problem in your own words.\n` +
      `2. Identify the smallest piece you can test.\n` +
      `3. Try it, then tell me what happened — I'll help you reason about the next step.`;
    for (const word of reply.split(/(\s+)/)) {
      yield word;
    }
  },

  async json<T>(req: JsonRequest): Promise<T> {
    const metrics = req.messages.at(-1)?.content ?? "";
    return {
      summary: "Demo insight generated without an AI provider, based on your recorded progress.",
      recommendations: [
        metrics.includes('"lessonPercent":100') ? "Revisit a lesson you found hardest and summarise it in your own words." : "Complete your next lesson to keep momentum.",
        "Submit pending assignments before their due dates.",
        "Ask your mentor one specific question in the next live session.",
      ],
    } as T;
  },
};
