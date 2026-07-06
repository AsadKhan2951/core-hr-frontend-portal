import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  minHeight?: number;
}

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
  loading,
  minHeight = 220,
}: ChartCardProps) {
  return (
    <div className={cn("hcm-card p-5", className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {loading ? (
        <div
          className="w-full bg-muted animate-pulse rounded-lg"
          style={{ minHeight }}
        />
      ) : (
        <div style={{ minHeight }}>{children}</div>
      )}
    </div>
  );
}
