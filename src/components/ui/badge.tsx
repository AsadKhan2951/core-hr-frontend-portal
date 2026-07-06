import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base — pill shape, small, Inter 600
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors duration-150 overflow-hidden leading-none",
  {
    variants: {
      variant: {
        // Brand teal gradient — primary badge
        default:
          "text-white border-transparent",

        // Subtle teal tint — secondary
        secondary:
          "bg-[rgba(15,180,168,.12)] text-[#0A8F86] border-transparent",

        // Danger
        destructive:
          "bg-[rgba(239,74,90,.12)] text-[#C0293A] border-transparent",

        // Neutral outline
        outline:
          "bg-transparent text-[#33414F] border border-[#E3EAEE]",

        // Muted gray
        muted:
          "bg-[#EEF3F5] text-[#7A8896] border-transparent",

        // Success green
        success:
          "bg-[rgba(22,178,122,.12)] text-[#0F8A5A] border-transparent",

        // Warning amber
        warning:
          "bg-[rgba(244,169,31,.12)] text-[#A06B00] border-transparent",

        // Info blue
        info:
          "bg-[rgba(60,143,208,.12)] text-[#1A5F9A] border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  const brandStyle =
    !variant || variant === "default"
      ? {
          background: "linear-gradient(135deg, #4F9AB3 0%, #0FB4A8 55%, #08B8A8 100%)",
          ...style,
        }
      : style;

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      style={brandStyle}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
