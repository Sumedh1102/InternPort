import "server-only";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  system: string;
  messages: ChatTurn[];
  maxTokens?: number;
}

export interface JsonRequest extends GenerateRequest {
  /** JSON Schema the response must follow. */
  schema: Record<string, unknown>;
}

/**
 * Provider seam: the product brief leaves the AI vendor to be chosen later, so every
 * feature talks to this interface and the vendor is selected by `AI_PROVIDER`.
 * Implementations run server-side only; API keys never reach the browser.
 */
export interface AIProvider {
  id: "anthropic" | "gemini" | "mock";
  /** Streams plain-text chunks. */
  stream(req: GenerateRequest): AsyncIterable<string>;
  /** Returns a JSON value matching `req.schema`. */
  json<T>(req: JsonRequest): Promise<T>;
}

/** The model declined to answer (e.g. a safety classifier) — show a friendly message. */
export class AIRefusalError extends Error {
  constructor(message = "The assistant can't help with that request.") {
    super(message);
    this.name = "AIRefusalError";
  }
}
