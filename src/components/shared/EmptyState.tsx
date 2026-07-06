/**
 * components/shared/EmptyState.tsx
 *
 * CoreHR brand redesign — soft gradient blob behind icon, gradient icon tile, primary CTA.
 */

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  /** compact = smaller padding, used inside tables/cards */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center relative overflow-hidden",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
    >
      {/* Soft gradient blob — decorative, behind everything */}
      {!compact && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(15,180,168,.10) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 0,
          }}
        />
      )}

      {/* Content — above blob */}
      <div className="relative z-10 flex flex-col items-center">
        {Icon && (
          <div
            className={cn(
              "flex items-center justify-center mb-4 rounded-[14px]",
              compact ? "h-10 w-10" : "h-14 w-14"
            )}
            style={{
              background: "linear-gradient(135deg, rgba(79,154,179,.15), rgba(15,180,168,.15))",
            }}
          >
            <Icon
              className={compact ? "h-5 w-5" : "h-7 w-7"}
              style={{ color: "#0A8F86" }}
            />
          </div>
        )}

        <h3
          className={cn("font-semibold", compact ? "text-sm" : "text-base")}
          style={{ color: "#0E1726" }}
        >
          {title}
        </h3>

        {description && (
          <p
            className={cn("mt-1 max-w-xs", compact ? "text-xs" : "text-sm")}
            style={{ color: "#7A8896" }}
          >
            {description}
          </p>
        )}

        {(action || secondaryAction) && (
          <div className="flex items-center gap-2 mt-5">
            {action && (
              <Button
                size={compact ? "sm" : "default"}
                variant={action.variant ?? "default"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                size={compact ? "sm" : "default"}
                variant={secondaryAction.variant ?? "outline"}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
