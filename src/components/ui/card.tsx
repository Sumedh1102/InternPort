import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const cardVariants = cva("relative rounded-card border-2 border-ink", {
  variants: {
    tone: {
      paper: "bg-paper",
      cream: "bg-cream",
      lime: "bg-lime",
      pink: "bg-pink",
      cyan: "bg-cyan",
      blue: "bg-blue text-paper",
      ink: "bg-ink text-paper",
    },
    shadow: {
      none: "",
      sm: "shadow-brutal-sm",
      md: "shadow-brutal",
      lg: "shadow-brutal-lg",
      lime: "shadow-brutal-lime",
      pink: "shadow-brutal-pink",
    },
    interactive: {
      true: "transition-[transform,box-shadow] duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg focus-within:-translate-x-1 focus-within:-translate-y-1",
      false: "",
    },
  },
  defaultVariants: { tone: "paper", shadow: "md", interactive: false },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, tone, shadow, interactive, ...props }: CardProps) {
  return <div className={cn(cardVariants({ tone, shadow, interactive }), className)} {...props} />;
}

/** Alias matching the component-system naming in the product brief. */
export const BrutalistCard = Card;

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-3 sm:p-6 sm:pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-xl font-extrabold leading-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3 border-t-2 border-dashed border-ink/25 p-5 sm:p-6", className)}
      {...props}
    />
  );
}
