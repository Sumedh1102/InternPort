import { Logo } from "@/components/brand/logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-cream">
      <div aria-hidden className="bg-grid absolute inset-0 opacity-60" />
      <header className="relative border-b-2 border-ink bg-cream/90">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="main" className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
