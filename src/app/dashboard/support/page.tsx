import { LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";

import { SupportForm } from "@/components/forms/support-form";
import { FaqList } from "@/components/site/blocks";
import { DashboardCard, PageHeader } from "@/components/dashboard/ui";
import { GENERAL_FAQ } from "@/lib/content";
import { waLink } from "@/lib/utils";
import { requireRole } from "@/server/auth/session";
import { getSettings } from "@/server/queries/settings";
import { getStudentContext } from "@/server/queries/student";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await requireRole(["STUDENT"]);
  const [ctx, settings] = await Promise.all([getStudentContext(session.uid), getSettings()]);
  const { contact } = settings;
  return (
    <>
      <PageHeader title="Support" description="Stuck on something that isn't about the learning content? The Sainam team is here to help." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <DashboardCard title="Send a support request" icon={<LifeBuoy />}>
            <SupportForm />
          </DashboardCard>
          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold">Common questions</h2>
            <FaqList items={GENERAL_FAQ} />
          </section>
        </div>
        <aside className="flex flex-col gap-4">
          {ctx?.enrollment?.mentorName && (
            <DashboardCard title="Your mentor" tone="lime">
              <p className="font-semibold">{ctx.enrollment.mentorName}</p>
              <p className="text-sm">Bring learning questions to your live sessions — or try the AI assistant for hints.</p>
            </DashboardCard>
          )}
          <DashboardCard title="Contact">
            <ul className="flex flex-col gap-3 text-sm">
              {contact.email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4" aria-hidden />
                  <a href={`mailto:${contact.email}`} className="underline">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4" aria-hidden /> {contact.phone}
                </li>
              )}
              {contact.whatsapp && (
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-4" aria-hidden />
                  <a href={waLink(contact.whatsapp)} target="_blank" rel="noreferrer" className="underline">
                    WhatsApp
                  </a>
                </li>
              )}
              {!contact.email && !contact.phone && !contact.whatsapp && (
                <li className="text-muted">Use the form — replies come by email.</li>
              )}
            </ul>
          </DashboardCard>
        </aside>
      </div>
    </>
  );
}
