/**
 * components/shared/StatusPill.tsx
 *
 * Color-coded status pill for use across all CORE HR modules.
 * Variants map to the global status color system:
 *   success  → green  (present, approved, active)
 *   danger   → red    (absent, rejected, terminated)
 *   warning  → amber  (late, pending, on-probation)
 *   info     → blue   (on-leave, in-progress, paid)
 *   neutral  → gray   (weekend, holiday, draft)
 */
import { cn } from "@/lib/utils";

export type StatusVariant = "success" | "danger" | "warning" | "info" | "neutral";

export interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  /** Optional dot indicator before the label */
  dot?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  danger:  "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  info:    "bg-blue-100 text-blue-800 border-blue-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
};

const DOT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-500",
  danger:  "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
  neutral: "bg-gray-400",
};

export function StatusPill({ label, variant = "neutral", dot = false, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[variant])} />
      )}
      {label}
    </span>
  );
}
