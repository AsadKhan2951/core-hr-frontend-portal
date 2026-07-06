import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — Inter, --r-md, smooth transitions, press micro-interaction
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold",
    "transition-all duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — signature brand gradient with soft brand shadow
        default: [
          "text-white",
          "focus-visible:ring-[var(--brand-teal)]",
          "hover:-translate-y-px hover:brightness-105",
          "active:translate-y-0 active:brightness-95",
        ].join(" "),

        // Destructive
        destructive: [
          "bg-[var(--danger)] text-white",
          "hover:brightness-110 hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-[var(--danger)]",
        ].join(" "),

        // Outline / Secondary — token bg, token text, token border
        outline: [
          "bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border-color)]",
          "hover:bg-[var(--bg-subtle)] hover:border-[var(--border-color)] hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-[var(--brand-teal)]",
        ].join(" "),

        // Secondary — subtle tint
        secondary: [
          "bg-[var(--bg-subtle)] text-[var(--text)]",
          "hover:bg-[var(--border-color)] hover:-translate-y-px",
          "active:translate-y-0",
          "focus-visible:ring-[var(--brand-teal)]",
        ].join(" "),

        // Ghost — transparent, subtle hover
        ghost: [
          "bg-transparent text-[var(--text)]",
          "hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]",
          "focus-visible:ring-[var(--brand-teal)]",
        ].join(" "),

        // Link
        link: "text-[var(--brand-teal)] underline-offset-4 hover:underline focus-visible:ring-[var(--brand-teal)]",
      },
      size: {
        default:  "h-9 px-4 py-2 rounded-[14px] has-[>svg]:px-3",
        sm:       "h-8 px-3 rounded-[12px] gap-1.5 text-xs has-[>svg]:px-2.5",
        lg:       "h-11 px-6 rounded-[16px] text-base has-[>svg]:px-4",
        icon:     "size-9 rounded-[14px]",
        "icon-sm":"size-8 rounded-[12px]",
        "icon-lg":"size-10 rounded-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Inject gradient + brand shadow for default variant via inline style
// (Tailwind can't express arbitrary gradient + shadow combo in a single class)
function Button({
  className,
  variant,
  size,
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  const brandStyle =
    !variant || variant === "default"
      ? {
          background: "var(--grad-brand)",
          boxShadow: "var(--shadow-brand), inset 0 1px 0 rgba(255,255,255,.20)",
          ...style,
        }
      : style;

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      style={brandStyle}
      {...props}
    />
  );
}

export { Button, buttonVariants };
