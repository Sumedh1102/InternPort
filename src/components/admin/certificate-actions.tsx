"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Award, Ban } from "lucide-react";

import { FormDialog } from "@/components/staff/form-dialog";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Checkbox, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { issueCertificate, revokeCertificate } from "@/server/actions/certificates";

export function IssueCertificateButton({ enrollmentId, eligible, studentName }: { enrollmentId: string; eligible: boolean; studentName: string }) {
  const router = useRouter();
  const [override, setOverride] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const issue = (close?: () => void) =>
    startTransition(async () => {
      const result = await issueCertificate({ enrollmentId, override: eligible ? undefined : override });
      if (result.ok) {
        toast.success(`Certificate ${result.data.certificateId} issued`);
        close?.();
        router.refresh();
      } else toast.error(result.error);
    });

  if (eligible) {
    return (
      <Button size="sm" loading={pending} onClick={() => issue()}>
        <Award aria-hidden /> Issue
      </Button>
    );
  }
  return (
    <FormDialog
      title={`Issue certificate to ${studentName}?`}
      description="This student hasn't met every completion criterion."
      trigger={
        <Button size="sm" variant="ghost">
          Override…
        </Button>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-3 text-sm" htmlFor="cert-override">
            <Checkbox id="cert-override" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            I confirm this student has completed the internship requirements agreed with Sainam Technology.
          </label>
          <Button disabled={!override} loading={pending} onClick={() => issue(close)} className="self-start">
            <Award aria-hidden /> Issue anyway
          </Button>
        </div>
      )}
    </FormDialog>
  );
}

export function RevokeCertificateDialog({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <FormDialog
      title={`Revoke ${certificateId}?`}
      description="The public verification page will show this certificate as revoked."
      trigger={
        <Button size="sm" variant="ghost">
          <Ban aria-hidden /> Revoke
        </Button>
      }
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          <FormError message={error} />
          <Field id="revoke-reason" label="Reason" required>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button
            variant="danger"
            loading={pending}
            disabled={reason.trim().length < 3}
            className="self-start"
            onClick={() =>
              startTransition(async () => {
                const result = await revokeCertificate({ certificateId, reason });
                if (result.ok) {
                  toast.success(result.message ?? "Revoked");
                  close();
                  router.refresh();
                } else setError(result.error);
              })
            }
          >
            Revoke certificate
          </Button>
        </div>
      )}
    </FormDialog>
  );
}
