import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { AIRefusalError, type AIProvider, type GenerateRequest, type JsonRequest } from "./types";

/**
 * Claude via the official Anthropic SDK.
 * - Model defaults to `claude-opus-5` (override with ANTHROPIC_MODEL).
 * - Adaptive thinking is on by default for this model, so no `thinking` param is sent.
 * - Server-side refusal fallbacks are enabled (`fallbacks: "default"`): if a safety
 *   classifier declines, the API re-runs the request on Anthropic's recommended model.
 */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const anthropicProvider: AIProvider = {
  id: "anthropic",

  async *stream(req: GenerateRequest) {
    const stream = anthropic().beta.messages.stream({
      model: MODEL,
      max_tokens: req.maxTokens ?? 16000,
      system: req.system,
      messages: req.messages,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new AIRefusalError();
  },

  async json<T>(req: JsonRequest): Promise<T> {
    const message = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: req.maxTokens ?? 16000,
      system: req.system,
      messages: req.messages,
      output_config: { format: { type: "json_schema", schema: req.schema } },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });
    if (message.stop_reason === "refusal") throw new AIRefusalError();
    const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return JSON.parse(text) as T;
  },
};
