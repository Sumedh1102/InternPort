import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { QrCode, Search } from "lucide-react";

import { Container, PageHero } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: "Check that a Sainam Technology internship certificate is genuine.",
  alternates: { canonical: "/verify" },
};

export default async function VerifyLookupPage({ searchParams }: PageProps<"/verify">) {
  const { id } = await searchParams;
  if (typeof id === "string" && id.trim()) {
    redirect(`/verify/${encodeURIComponent(id.trim().toUpperCase())}`);
  }
  return (
    <>
      <PageHero
        kicker="Certificate verification"
        title="Is it"
        highlight="genuine?"
        description="Scan the QR code on the certificate, or enter its certificate ID below."
      />
      <Container className="py-16">
        <form
          action="/verify"
          method="get"
          className="mx-auto flex max-w-xl flex-col gap-4 rounded-card border-2 border-ink bg-paper p-6 shadow-brutal sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="cert-id" className="flex items-center gap-2 text-sm font-semibold">
              <QrCode className="size-4" aria-hidden /> Certificate ID
            </label>
            <Input id="cert-id" name="id" placeholder="ST-W26-XXXX-XXXX" required autoCapitalize="characters" className="font-mono uppercase" />
          </div>
          <Button type="submit" size="md">
            <Search aria-hidden /> Verify
          </Button>
        </form>
      </Container>
    </>
  );
}
