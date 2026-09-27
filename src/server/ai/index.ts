import "server-only";

import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { mockProvider } from "./mock";
import type { AIProvider } from "./types";

/** Selects the AI vendor from server env. Returns null when AI is not configured. */
export function getAIProvider(): AIProvider | null {
  const choice = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  if (choice === "anthropic" && process.env.ANTHROPIC_API_KEY) return anthropicProvider;
  if (choice === "gemini" && process.env.GEMINI_API_KEY) return geminiProvider;
  if (choice === "mock") return mockProvider;
  return null;
}

export { AIRefusalError } from "./types";
export type { AIProvider, ChatTurn } from "./types";
