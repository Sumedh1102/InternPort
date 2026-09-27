import * as React from "react";

import { StickerLabel, Underline } from "@/components/brand/decor";
import { cn } from "@/lib/utils";

/** SectionHeading — kicker sticker + oversized editorial heading. */
export function SectionHeading({
  kicker,
  title,
  highlight,
  description,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  kicker?: string;
  title: React.ReactNode;
  /** A word or phrase rendered with a lime brush underline. */
  highlight?: string;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-4", align === "center" && "items-center text-center", className)}>
      {kicker && <StickerLabel tone="lime">{kicker}</StickerLabel>}
      <Tag
        className={cn(
          "font-display-wide text-4xl leading-[0.95] sm:text-5xl lg:text-6xl",
          Tag === "h1" && "text-5xl sm:text-6xl lg:text-7xl",
        )}
      >
        {title}
        {highlight && (
          <>
            {" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10">{highlight}</span>
              <Underline className="absolute -bottom-1 left-0 z-0 h-4 w-full text-lime sm:-bottom-2 sm:h-5" />
            </span>
          </>
        )}
      </Tag>
      {description && (
        <p className={cn("max-w-2xl text-base text-muted sm:text-lg", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function PageHero({
  kicker,
  title,
  highlight,
  description,
  children,
}: {
  kicker: string;
  title: React.ReactNode;
  highlight?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b-2 border-ink">
      <div aria-hidden className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <Container className="relative py-14 sm:py-20">
        <SectionHeading as="h1" kicker={kicker} title={title} highlight={highlight} description={description} />
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </section>
  );
}
