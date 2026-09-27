"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@/components/ui/dialog";
import type { Role } from "@/lib/domain/enums";
import { ROLE_HOME } from "@/lib/domain/workflows";
import { cn } from "@/lib/utils";

function useRoleHint(): Role | null {
  return React.useSyncExternalStore(
    () => () => {},
    () => {
      const match = document.cookie.match(/(?:^|;\s*)sainam_role=([A-Z_]+)/);
      return (match?.[1] as Role | undefined) ?? null;
    },
    () => null,
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm font-semibold transition hover:bg-ink hover:text-paper",
        active && "bg-ink text-paper",
      )}
    >
      {children}
    </Link>
  );
}

export function NavAccount({ block }: { block?: boolean }) {
  const role = useRoleHint();
  const cls = cn(
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-paper px-4 text-sm font-semibold transition hover:bg-cream-2",
    block && "w-full",
  );
  if (role && ROLE_HOME[role]) {
    return (
      <Link href={ROLE_HOME[role]} className={cls}>
        Dashboard <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    );
  }
  return (
    <Link href="/login" className={cls}>
      Log in
    </Link>
  );
}

export function MobileNav({ items }: { items: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        className="grid size-10 place-items-center rounded-full border-2 border-ink bg-paper lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </DrawerTrigger>
      <DrawerContent title="Site menu" side="right" className="bg-cream">
        <div className="flex items-center justify-between border-b-2 border-ink px-4 py-3">
          <Logo />
          <DrawerClose
            className="grid size-10 place-items-center rounded-full border-2 border-ink bg-paper"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </DrawerClose>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-4">
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border-2 border-ink bg-paper px-4 py-3 font-display text-lg font-extrabold shadow-brutal-xs"
                >
                  {item.label}
                  <ArrowUpRight className="size-5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 border-t-2 border-ink p-4">
          <NavAccount block />
          <Link
            href="/apply"
            className="inline-flex h-12 items-center justify-center rounded-full border-2 border-ink bg-lime font-bold shadow-brutal-xs"
          >
            Apply now
          </Link>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
