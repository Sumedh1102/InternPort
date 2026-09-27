"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  ClipboardList,
  ExternalLink,
  FileCheck,
  FolderGit2,
  GraduationCap,
  Inbox,
  Layers,
  LayoutDashboard,
  Library,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  PlaySquare,
  Settings,
  UserCog,
  UserRound,
  Users,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/feedback";
import { label as enumLabel } from "@/lib/domain/enums";
import type { AppNotification } from "@/lib/domain/types";
import { logout } from "@/lib/firebase/auth-client";
import type { NavGroup } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

const ICONS: Record<string, LucideIcon> = {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  ClipboardList,
  FileCheck,
  FolderGit2,
  GraduationCap,
  Inbox,
  Layers,
  LayoutDashboard,
  Library,
  LifeBuoy,
  Megaphone,
  PlaySquare,
  Settings,
  UserCog,
  UserRound,
  Users,
  Video,
  Wallet,
};

export interface ShellUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
}

interface ShellProps {
  area: "student" | "mentor" | "admin";
  nav: NavGroup[];
  user: ShellUser;
  notifications: AppNotification[];
  notificationsHref?: string;
  profileHref: string;
  children: React.ReactNode;
  banner?: React.ReactNode;
}

const AREA_LABEL = { student: "Student", mentor: "Mentor", admin: "Admin" } as const;

function NavList({ nav, onNavigate }: { nav: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-5">
      {nav.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 pb-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
              {group.label}
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutDashboard;
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "border-ink bg-lime shadow-brutal-xs"
                        : "border-transparent text-ink-2 hover:border-ink hover:bg-paper",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ user, profileHref }: { user: ShellUser; profileHref: string }) {
  const [pending, setPending] = React.useState(false);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex items-center gap-2 rounded-full border-2 border-ink bg-paper py-1 pl-1 pr-3 text-sm font-semibold shadow-brutal-xs transition hover:bg-cream-2"
        aria-label="Account menu"
      >
        <Avatar name={user.name} src={user.image} size={30} />
        <span className="hidden max-w-[10rem] truncate sm:inline">{user.name}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-2xl border-2 border-ink bg-paper p-2 shadow-brutal data-[state=open]:animate-pop"
        >
          <div className="px-3 py-2">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <span className="mt-2 inline-block rounded-full border-2 border-ink bg-lime px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase">
              {enumLabel(user.role)}
            </span>
          </div>
          <DropdownMenu.Separator className="my-1 h-0.5 bg-ink/10" />
          <DropdownMenu.Item asChild>
            <Link href={profileHref} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-lime-soft">
              <UserRound className="size-4" aria-hidden /> Profile
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-lime-soft">
              <ExternalLink className="size-4" aria-hidden /> Public website
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            disabled={pending}
            onSelect={async (e) => {
              e.preventDefault();
              setPending(true);
              await logout();
              window.location.assign("/login");
            }}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold outline-none data-[highlighted]:bg-red-soft"
          >
            <LogOut className="size-4" aria-hidden /> {pending ? "Signing out…" : "Log out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DashboardShell({
  area,
  nav,
  user,
  notifications,
  notificationsHref,
  profileHref,
  children,
  banner,
}: ShellProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <Logo />
        <span className="rounded-full border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wider text-lime">
          {AREA_LABEL[area]}
        </span>
      </div>
      <NavList nav={nav} onNavigate={onNavigate} />
    </div>
  );

  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r-2 border-ink bg-cream-2 lg:block">{sidebar()}</aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b-2 border-ink bg-cream/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger
                className="grid size-10 place-items-center rounded-full border-2 border-ink bg-paper lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </DrawerTrigger>
              <DrawerContent title="Dashboard navigation" className="bg-cream-2">
                <DrawerClose
                  className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full border-2 border-ink bg-paper"
                  aria-label="Close navigation"
                >
                  <X className="size-4" />
                </DrawerClose>
                {sidebar(() => setOpen(false))}
              </DrawerContent>
            </Drawer>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:hidden">
              {AREA_LABEL[area]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell uid={user.uid} initial={notifications} href={notificationsHref} />
            <UserMenu user={user} profileHref={profileHref} />
          </div>
        </header>
        {banner}
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
