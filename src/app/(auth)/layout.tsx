import { Bot, Code, GraduationCap } from "lucide-react";

import { Burst, Sparkle, Star, StickerLabel } from "@/components/brand/decor";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/site";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden border-r-2 border-ink bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div aria-hidden className="bg-grid-dark absolute inset-0" />
        <Burst className="absolute -bottom-16 -right-16 size-72 animate-spin-slow text-lime" aria-hidden />
        <Star className="absolute right-24 top-28 size-10 text-pink" aria-hidden />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative flex flex-col gap-6">
          <StickerLabel tone="lime">{SITE.program}</StickerLabel>
          <p className="font-display-wide text-6xl uppercase leading-[0.88] xl:text-7xl">
            Learn today.
            <br />
            <span className="text-lime">Build</span> tomorrow.
          </p>
          <ul className="flex flex-col gap-3 text-paper/85">
            {[
              { icon: GraduationCap, text: "Structured 3-month programs" },
              { icon: Code, text: "Mentor-reviewed assignments & projects" },
              { icon: Bot, text: "An AI assistant that teaches, not cheats" },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full border-2 border-paper bg-ink-2">
                  <f.icon className="size-4 text-lime" aria-hidden />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-paper/60">
          <Sparkle className="size-4 text-lime" /> {SITE.name}
        </p>
      </aside>
      <main id="main" className="relative flex flex-col bg-cream">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-60" />
        <div className="relative flex items-center justify-between p-4 sm:p-6 lg:hidden">
          <Logo />
        </div>
        <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
