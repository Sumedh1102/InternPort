import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Sparkle } from "@/components/brand/decor";
import { Logo } from "@/components/brand/logo";
import { FOOTER_NAV, SITE } from "@/lib/site";
import { getPublicSettings } from "@/server/queries/settings";

export async function Footer() {
  const { contact } = await getPublicSettings();
  return (
    <footer className="relative overflow-hidden border-t-2 border-ink bg-ink text-paper">
      <div aria-hidden className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_2fr] lg:px-8">
        <div className="flex flex-col gap-5">
          <Logo inverted />
          <p className="max-w-sm text-sm text-paper/75">
            Software, AI/ML, web, mobile and cloud — plus hands-on internships that turn students into builders.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-paper/85">
            {contact.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-lime" aria-hidden />
                <a href={`mailto:${contact.email}`} className="hover:text-lime">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-lime" aria-hidden />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-lime">
                  {contact.phone}
                </a>
              </li>
            )}
            {contact.address && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden />
                <span>{contact.address}</span>
              </li>
            )}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {Object.entries(FOOTER_NAV).map(([group, links]) => (
            <nav key={group} aria-label={group}>
              <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-lime">{group}</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-paper/85 transition hover:text-lime">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="relative border-t-2 border-paper/15">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-paper/70 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-2 font-mono uppercase tracking-wider">
            <Sparkle className="size-4 text-lime" /> Learn today. Build tomorrow.
          </p>
        </div>
      </div>
    </footer>
  );
}
