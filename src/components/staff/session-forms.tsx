"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Pencil } from "lucide-react";
import type { z } from "zod";

import { applyServerErrors, isoToLocal, localToIso } from "@/components/forms/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { ATTENDANCE_STATUSES, SESSION_STATUSES, SESSION_TYPES, label, type AttendanceStatus } from "@/lib/domain/enums";
import { sessionSchema } from "@/lib/domain/schemas";
import type { Session } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { markAttendance, saveSession } from "@/server/actions/sessions";
import type { Option } from "./assignment-form";
import { FormDialog } from "./form-dialog";

type Values = z.input<typeof sessionSchema>;

function SessionForm({ session, batches, onDone }: { session?: Session; batches: Option[]; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const defaultStart = session?.startAt ?? new Date(Math.ceil(Date.now() / 3600e3) * 3600e3 + 86400e3).toISOString();
  const [startLocal, setStartLocal] = React.useState(isoToLocal(defaultStart));
  const form = useForm<Values>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      batchId: session?.batchId ?? batches[0]?.id ?? "",
      title: session?.title ?? "",
      description: session?.description ?? "",
      type: session?.type ?? "LIVE_CLASS",
      startAt: defaultStart,
      durationMinutes: session?.durationMinutes ?? 60,
      meetingUrl: session?.meetingUrl ?? "",
      status: session?.status ?? "SCHEDULED",
    },
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await saveSession(session?.id ?? null, values);
    if (result.ok) {
      toast.success(result.message ?? "Saved");
      onDone();
      router.refresh();
    } else {
      setError(result.error);
      applyServerErrors(form, result);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="se-batch" label="Batch" error={errors.batchId?.message} required>
          <Select {...register("batchId")} disabled={Boolean(session)}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="se-type" label="Type" error={errors.type?.message}>
          <Select {...register("type")}>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="se-title" label="Title" error={errors.title?.message} required className="sm:col-span-2">
          <Input {...register("title")} />
        </Field>
        <Field id="se-start" label="Starts at" error={errors.startAt?.message} required>
          <Input
            type="datetime-local"
            value={startLocal}
            onChange={(e) => {
              setStartLocal(e.target.value);
              setValue("startAt", localToIso(e.target.value), { shouldValidate: true });
            }}
          />
        </Field>
        <Field id="se-duration" label="Duration (minutes)" error={errors.durationMinutes?.message} required>
          <Input type="number" min={10} max={600} {...register("durationMinutes", { valueAsNumber: true })} />
        </Field>
        <Field id="se-url" label="Meeting link" error={errors.meetingUrl?.message} className="sm:col-span-2">
          <Input type="url" placeholder="https://meet.google.com/…" {...register("meetingUrl")} />
        </Field>
        <Field id="se-desc" label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea rows={3} {...register("description")} />
        </Field>
        {session && (
          <Field id="se-status" label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              {SESSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Button type="submit" loading={isSubmitting} className="self-start">
        {session ? "Save session" : "Schedule session"}
      </Button>
    </form>
  );
}

export function SessionFormDialog({ session, batches }: { session?: Session; batches: Option[] }) {
  return (
    <FormDialog
      wide
      title={session ? "Edit session" : "Schedule a session"}
      description={session ? undefined : "Students in the batch are notified automatically."}
      trigger={
        session ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${session.title}`}>
            <Pencil aria-hidden />
          </Button>
        ) : (
          <Button size="sm" disabled={!batches.length}>
            <CalendarPlus aria-hidden /> Schedule session
          </Button>
        )
      }
    >
      {(close) => <SessionForm session={session} batches={batches} onDone={close} />}
    </FormDialog>
  );
}

/* ----------------------------- Attendance ----------------------------- */

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-soft",
  LATE: "bg-amber-soft",
  ABSENT: "bg-red-soft",
  EXCUSED: "bg-cream-2",
};

export function AttendanceMarker({
  sessionId,
  roster,
}: {
  sessionId: string;
  roster: { uid: string; name: string; status?: AttendanceStatus }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [statuses, setStatuses] = React.useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(roster.map((r) => [r.uid, r.status ?? "PRESENT"])),
  );
  const [prevRoster, setPrevRoster] = React.useState(roster);
  if (roster !== prevRoster) {
    setPrevRoster(roster);
    setStatuses(Object.fromEntries(roster.map((r) => [r.uid, r.status ?? "PRESENT"])));
  }
  const alreadyMarked = roster.some((r) => r.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {ATTENDANCE_STATUSES.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setStatuses(Object.fromEntries(roster.map((r) => [r.uid, s])))}
          >
            Mark all {label(s).toLowerCase()}
          </Button>
        ))}
      </div>
      <ul className="overflow-hidden rounded-card border-2 border-ink bg-paper">
        {roster.map((r) => (
          <li key={r.uid} className={cn("flex flex-col gap-2 border-b-2 border-ink/10 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between", STATUS_STYLE[statuses[r.uid]!])}>
            <span className="font-semibold">{r.name}</span>
            <fieldset className="flex flex-wrap gap-1.5">
              <legend className="sr-only">Attendance for {r.name}</legend>
              {ATTENDANCE_STATUSES.map((s) => (
                <label
                  key={s}
                  className={cn(
                    "cursor-pointer rounded-full border-2 border-ink px-3 py-1 text-xs font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-blue",
                    statuses[r.uid] === s ? "bg-ink text-paper" : "bg-paper",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`att-${r.uid}`}
                    checked={statuses[r.uid] === s}
                    onChange={() => setStatuses((m) => ({ ...m, [r.uid]: s }))}
                  />
                  {label(s)}
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ul>
      <Button
        className="self-start"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await markAttendance({
              sessionId,
              records: roster.map((r) => ({ uid: r.uid, status: statuses[r.uid]! })),
            });
            if (result.ok) {
              toast.success(`Attendance saved for ${result.data.count} students`);
              router.refresh();
            } else toast.error(result.error);
          })
        }
      >
        {alreadyMarked ? "Update attendance" : "Save attendance"}
      </Button>
    </div>
  );
}
