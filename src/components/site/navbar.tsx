import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { PUBLIC_NAV } from "@/lib/site";
import { MobileNav, NavAccount, NavLink } from "./navbar-client";

/** Navbar — server-rendered; only the account button and mobile drawer hydrate. */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <NavAccount />
          </div>
          <Link
            href="/apply"
            className="hidden h-10 items-center rounded-full border-2 border-ink bg-lime px-4 text-sm font-bold shadow-brutal-xs transition hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal-sm md:inline-flex"
          >
            Apply now
          </Link>
          <MobileNav items={PUBLIC_NAV} />
        </div>
      </div>
    </header>
  );
}
