/**
 * components/shared/StatCard.tsx
 *
 * CoreHR brand redesign — gradient icon tile, tabular-nums value, trend pill.
 */

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StatCardColor = "blue" | "green" | "amber" | "red" | "purple" | "teal" | "indigo" | "slate";
export type StatCardTrend = "up" | "down" | "neutral";

export interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: StatCardTrend;
  delta?: number;
  deltaType?: "percent" | "absolute";
  deltaLabel?: string;
  color?: StatCardColor;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

// Gradient icon tile colors — all use --grad-soft base with brand tints
const colorMap: Record<StatCardColor, { tile: React.CSSProperties; icon: string }> = {
  blue:   { tile: { background: "linear-gradient(135deg, rgba(79,154,179,.15), rgba(15,180,168,.15))" }, icon: "text-[#0A8F86]" },
  green:  { tile: { background: "rgba(22,178,122,.12)" },  icon: "text-[#0F8A5A]" },
  amber:  { tile: { background: "rgba(244,169,31,.12)" },  icon: "text-[#A06B00]" },
  red:    { tile: { background: "rgba(239,74,90,.12)" },   icon: "text-[#C0293A]" },
  purple: { tile: { background: "rgba(123,92,255,.12)" },  icon: "text-[#5B3FCC]" },
  teal:   { tile: { background: "rgba(15,180,168,.12)" },  icon: "text-[#0A8F86]" },
  indigo: { tile: { background: "rgba(79,154,179,.12)" },  icon: "text-[#2E6E8A]" },
  slate:  { tile: { background: "rgba(122,136,150,.12)" }, icon: "text-[#4A5A68]" },
};

const trendConfig: Record<StatCardTrend, { icon: LucideIcon; chipStyle: React.CSSProperties; textColor: string }> = {
  up:      { icon: TrendingUp,   chipStyle: { background: "rgba(22,178,122,.12)" },  textColor: "#0F8A5A" },
  down:    { icon: TrendingDown, chipStyle: { background: "rgba(239,74,90,.12)" },   textColor: "#C0293A" },
  neutral: { icon: Minus,        chipStyle: { background: "rgba(122,136,150,.12)" }, textColor: "#4A5A68" },
};

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  delta,
  deltaType = "percent",
  deltaLabel,
  color = "blue",
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  const colors = colorMap[color];
  const trendCfg = trend ? trendConfig[trend] : null;
  const TrendIcon = trendCfg?.icon;

  if (loading) {
    return (
      <div className={cn("stat-card animate-pulse", className)}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 flex-1">
            <div className="h-2 w-20 rounded-full" style={{ background: "#EEF3F5" }} />
            <div className="h-6 w-16 rounded-[8px]" style={{ background: "#EEF3F5" }} />
            <div className="h-2 w-12 rounded-full" style={{ background: "#EEF3F5" }} />
          </div>
          <div className="h-8 w-8 rounded-[10px]" style={{ background: "#EEF3F5" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "stat-card",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Text block */}
        <div className="min-w-0 flex-1">
          <p className="stat-card-label truncate">{title}</p>
          <p className="stat-card-value mt-0.5">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subValue && (
            <p className="mt-0.5 text-[0.7rem]" style={{ color: "#7A8896" }}>{subValue}</p>
          )}
          {/* Trend pill */}
          {(trend || delta !== undefined) && trendCfg && (
            <div
              className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{ ...trendCfg.chipStyle }}
            >
              {TrendIcon && (
                <TrendIcon className="h-2.5 w-2.5" style={{ color: trendCfg.textColor }} />
              )}
              {delta !== undefined && (
                <span className="text-[0.68rem] font-semibold" style={{ color: trendCfg.textColor }}>
                  {delta > 0 ? "+" : ""}
                  {delta}
                  {deltaType === "percent" ? "%" : ""}
                </span>
              )}
              {deltaLabel && (
                <span className="text-[0.68rem]" style={{ color: "#7A8896" }}>{deltaLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* Gradient icon tile */}
        {Icon && (
          <div
            className={cn("shrink-0 rounded-[10px] p-2", colors.icon)}
            style={colors.tile}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}
