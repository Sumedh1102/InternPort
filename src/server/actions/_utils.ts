import "server-only";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

import type { Role } from "@/lib/domain/enums";
import { fieldErrorsFrom } from "@/lib/domain/schemas";
import type { ActionResult } from "@/lib/domain/types";
import { TransitionError } from "@/lib/domain/workflows";
import { getSession, type SessionUser } from "../auth/session";

/** An error whose message is safe to show to the user. */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Every server action authenticates from the verified session cookie — never from
 * client-supplied identity or role — and optionally restricts by custom-claim role.
 */
export async function actor(roles?: readonly Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new ActionError("Your session has expired. Please log in again.");
  if (!session.emailVerified) throw new ActionError("Please verify your email address first.");
  if (roles && !roles.includes(session.role)) {
    throw new ActionError("You don't have permission to do that.");
  }
  return session;
}

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw result.error;
  return result.data;
}

export async function run<T>(
  fn: () => Promise<T>,
  message?: string,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ActionError || error instanceof TransitionError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof z.ZodError) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: fieldErrorsFrom(error),
      };
    }
    console.error("[action] unexpected error", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
