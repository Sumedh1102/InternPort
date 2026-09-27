"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleCheck, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/domain/schemas";
import {
  authErrorMessage,
  completeRedirectLogin,
  loginWithEmail,
  loginWithGoogle,
  logout,
  refreshVerifiedSession,
  registerWithEmail,
  requestPasswordReset,
  resendVerification,
} from "@/lib/firebase/auth-client";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import { safeNext } from "@/lib/utils";
import type { z } from "zod";

/** Full navigation so server components render with the fresh session cookie. */
function go(to: string) {
  window.location.assign(to);
}

function destination(redirectTo: string, next: string | null): string {
  const target = safeNext(next, "");
  const isHome = ["/dashboard", "/mentor", "/admin"].includes(redirectTo);
  return isHome && target ? target : redirectTo;
}

function NotConfigured() {
  return (
    <Alert tone="warning" title="Sign-in is not configured">
      Firebase environment variables are missing. See <code>.env.example</code>.
    </Alert>
  );
}

function GoogleButton({ onDone, onError, disabled }: { onDone: (to: string) => void; onError: (m: string) => void; disabled?: boolean }) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      loading={pending}
      disabled={disabled}
      onClick={async () => {
        setPending(true);
        try {
          const to = await loginWithGoogle();
          if (to) onDone(to);
        } catch (error) {
          onError(authErrorMessage(error));
          setPending(false);
        }
      }}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted" aria-hidden>
      <span className="h-0.5 flex-1 bg-ink/20" /> or <span className="h-0.5 flex-1 bg-ink/20" />
    </div>
  );
}

/* --------------------------------- Login --------------------------------- */

export function LoginForm({ next }: { next: string | null }) {
  const configured = isFirebaseClientConfigured();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (!configured) return;
    completeRedirectLogin()
      .then((to) => to && go(destination(to, next)))
      .catch((e) => setError(authErrorMessage(e)));
  }, [configured, next]);

  if (!configured) return <NotConfigured />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      go(destination(await loginWithEmail(email, password), next));
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton onDone={(to) => go(destination(to, next))} onError={setError} />
      <Divider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field id="login-email" label="Email" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field id="login-password" label="Password" error={errors.password?.message} required>
          <Input type="password" autoComplete="current-password" {...register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold underline decoration-pink decoration-2 underline-offset-4">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Log in <ArrowRight aria-hidden />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------- Register -------------------------------- */

export function RegisterForm({ next }: { next: string | null }) {
  const configured = isFirebaseClientConfigured();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", terms: false as unknown as true },
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  if (!configured) return <NotConfigured />;

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setError(null);
    try {
      go(destination(await registerWithEmail(name, email, password), next));
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton onDone={(to) => go(destination(to, next))} onError={setError} />
      <Divider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={error} />
        <Field id="reg-name" label="Full name" error={errors.name?.message} required>
          <Input autoComplete="name" {...register("name")} />
        </Field>
        <Field id="reg-email" label="Email" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="reg-password" label="Password" error={errors.password?.message} hint="8+ characters, letters & numbers" required>
            <Input type="password" autoComplete="new-password" {...register("password")} />
          </Field>
          <Field id="reg-confirm" label="Confirm password" error={errors.confirmPassword?.message} required>
            <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
          </Field>
        </div>
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-sm" htmlFor="reg-terms">
            <Checkbox id="reg-terms" aria-invalid={errors.terms ? true : undefined} {...register("terms")} />
            <span>I agree to Sainam Technology storing my details to manage my account and internship.</span>
          </label>
          {errors.terms && (
            <p role="alert" className="text-xs font-semibold text-red">
              {errors.terms.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Create account <ArrowRight aria-hidden />
        </Button>
      </form>
    </div>
  );
}

/* ---------------------------- Forgot password ---------------------------- */

export function ForgotPasswordForm() {
  const configured = isFirebaseClientConfigured();
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  if (!configured) return <NotConfigured />;
  if (sent) {
    return (
      <Alert tone="success" title="Check your inbox">
        If an account exists for that email, we&apos;ve sent a link to reset your password.
      </Alert>
    );
  }
  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <Field id="forgot-email" label="Email" error={form.formState.errors.email?.message} required>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" loading={form.formState.isSubmitting} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}

/* ------------------------------ Verify email ------------------------------ */

export function VerifyEmailPanel({ email }: { email: string | null }) {
  const [status, setStatus] = React.useState<"idle" | "checking" | "sent" | "not-yet">("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function check() {
    setError(null);
    setStatus("checking");
    try {
      const to = await refreshVerifiedSession();
      if (to) go(to);
      else setStatus("not-yet");
    } catch (e) {
      setError(authErrorMessage(e));
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-lime-soft p-4">
        <MailCheck className="size-6 shrink-0" aria-hidden />
        <p className="text-sm">
          We sent a verification link to <strong>{email ?? "your email"}</strong>. Open it, then come back here.
        </p>
      </div>
      <FormError message={error} />
      {status === "not-yet" && (
        <Alert tone="warning">We couldn&apos;t confirm verification yet. Click the link in the email first.</Alert>
      )}
      {status === "sent" && (
        <Alert tone="success">
          <span className="inline-flex items-center gap-1.5">
            <CircleCheck className="size-4" aria-hidden /> Verification email sent again.
          </span>
        </Alert>
      )}
      <Button size="lg" onClick={check} loading={status === "checking"} className="w-full">
        I&apos;ve verified my email
      </Button>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <button
          type="button"
          className="font-semibold underline decoration-pink decoration-2 underline-offset-4"
          onClick={async () => {
            setError(null);
            try {
              await resendVerification();
              setStatus("sent");
            } catch (e) {
              setError(authErrorMessage(e));
            }
          }}
        >
          Resend email
        </button>
        <button
          type="button"
          className="font-semibold underline decoration-pink decoration-2 underline-offset-4"
          onClick={async () => {
            await logout();
            go("/login");
          }}
        >
          Use a different account
        </button>
      </div>
    </div>
  );
}
