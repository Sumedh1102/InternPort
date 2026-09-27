import type { Metadata } from "next";
import { AtSign, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Linkedin } from "@/components/brand/icons";
import { ContactForm } from "@/components/forms/contact-form";
import { Container, PageHero } from "@/components/site/section-heading";
import { SITE } from "@/lib/site";
import { waLink } from "@/lib/utils";
import { getPublicSettings } from "@/server/queries/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE.name} about projects, training or the Winter Internship 2026.`,
  alternates: { canonical: "/contact" },
};

export const revalidate = 300;

export default async function ContactPage() {
  const { contact } = await getPublicSettings();
  const items = [
    contact.email && { icon: Mail, label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { icon: Phone, label: "Phone", value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
    contact.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp, href: waLink(contact.whatsapp) },
    contact.address && { icon: MapPin, label: "Address", value: contact.address },
    contact.hours && { icon: Clock, label: "Hours", value: contact.hours },
    contact.linkedin && { icon: Linkedin, label: "LinkedIn", value: "Follow us", href: contact.linkedin },
    contact.instagram && { icon: AtSign, label: "Instagram", value: "Follow us", href: contact.instagram },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string; href?: string }[];

  return (
    <>
      <PageHero
        kicker="Contact"
        title="Say"
        highlight="hello."
        description="Questions about the internship, a project idea, or training for your team — send us a message and we'll reply by email."
      />
      <section className="py-16 sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <ContactForm />
          <aside className="flex flex-col gap-4">
            {items.length ? (
              items.map((item) => (
                <div key={item.label} className="flex items-start gap-4 rounded-card border-2 border-ink bg-paper p-5 shadow-brutal-sm">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-lime">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="break-words font-semibold underline decoration-pink decoration-2 underline-offset-4">
                        {item.value}
                      </a>
                    ) : (
                      <p className="break-words font-semibold">{item.value}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-card border-2 border-dashed border-ink/40 p-6 text-sm text-muted">
                Use the form to reach the Sainam Technology team — we respond by email.
              </div>
            )}
          </aside>
        </Container>
      </section>
    </>
  );
}
