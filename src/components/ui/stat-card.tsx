import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // positive = up, negative = down, 0 = flat
  trendLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  className,
  loading,
  onClick,
}: StatCardProps) {
  const hasTrend = trend !== undefined;
  const isUp = (trend ?? 0) > 0;
  const isDown = (trend ?? 0) < 0;
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const trendColor = isUp
    ? "text-status-present"
    : isDown
    ? "text-status-absent"
    : "text-muted-foreground";

  return (
    <div
      className={cn(
        "stat-card",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        )}
      </div>
      {hasTrend && (
        <div className={cn("flex items-center gap-1 mt-3 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{Math.abs(trend!)}%</span>
          {trendLabel && <span className="text-muted-foreground font-normal">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
