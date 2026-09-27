import { NextResponse, type NextRequest } from "next/server";

import { aiChatSchema } from "@/lib/domain/schemas";
import { getAIProvider, AIRefusalError } from "@/server/ai";
import { QuotaExceededError, buildAssistantPrompt, consumeAIQuota } from "@/server/ai/context";
import { getSession } from "@/server/auth/session";
import { getSettings } from "@/server/queries/settings";
import { isSameOrigin } from "@/server/security";

export const maxDuration = 60;

const json = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Streams the AI learning assistant's reply as plain text.
 * Auth, enrollment, quota and prompt construction all happen server-side;
 * the provider key never leaves the server.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json(403, "Invalid origin");
  const session = await getSession();
  if (!session || !session.emailVerified) return json(401, "Please log in again.");
  if (session.role !== "STUDENT") return json(403, "The assistant is available to enrolled students.");

  const parsed = aiChatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "Invalid request.");
  const input = parsed.data;
  if (input.messages.at(-1)?.role !== "user") return json(400, "The last message must be from you.");

  const settings = await getSettings();
  const provider = getAIProvider();
  if (!settings.ai.enabled || !provider) return json(503, "The AI assistant isn't available right now.");

  const system = await buildAssistantPrompt(session.uid, {
    intent: input.intent,
    lessonId: input.lessonId || undefined,
    assignmentId: input.assignmentId || undefined,
  });
  if (!system) return json(403, "The assistant unlocks once your enrollment is active.");

  let remaining: number;
  try {
    remaining = await consumeAIQuota(session.uid, settings.ai.dailyLimit);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return json(429, `You've reached today's limit of ${settings.ai.dailyLimit} questions. It resets at midnight IST.`);
    }
    throw error;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.stream({ system, messages: input.messages })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        const message =
          error instanceof AIRefusalError
            ? "\n\n_I can't help with that request. Try rephrasing it as a learning question._"
            : "\n\n_Sorry — the assistant ran into a problem. Please try again._";
        if (!(error instanceof AIRefusalError)) console.error("[ai] stream failed", error);
        controller.enqueue(encoder.encode(message));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-AI-Remaining": String(remaining),
      "X-AI-Provider": provider.id,
    },
  });
}
