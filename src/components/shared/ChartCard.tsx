/**
 * components/shared/ChartCard.tsx
 *
 * CoreHR brand redesign — teal→blue SVG gradient, rounded bar tops, Inter labels, rounded tooltip.
 */

import { cn } from "@/lib/utils";
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Loader2 } from "lucide-react";

export type ChartType = "line" | "bar" | "area" | "pie" | "composed";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  type?: "line" | "bar" | "area";
}

export interface ChartCardProps {
  title: string;
  description?: string;
  type: ChartType;
  data: Record<string, unknown>[];
  xKey?: string;
  series: ChartSeries[];
  height?: number;
  loading?: boolean;
  className?: string;
  grid?: boolean;
  legend?: boolean;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  action?: React.ReactNode;
}

const RADIAN = Math.PI / 180;

// Brand gradient colors for charts when no explicit color is given
const BRAND_COLORS = ["#0FB4A8", "#4F9AB3", "#16B27A", "#F4A91F", "#7B5CFF", "#EF4A5A"];

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function ChartCard({
  title,
  description,
  type,
  data,
  xKey = "name",
  series,
  height = 260,
  loading = false,
  className,
  grid = true,
  legend = true,
  tooltipFormatter,
  action,
}: ChartCardProps) {
  const commonProps = {
    data,
    margin: { top: 4, right: 8, left: -16, bottom: 0 },
  };

  // Inter axis labels — use CSS variable for tick color
  const axisProps = {
    tick: { fontSize: 11, fill: "var(--text-muted)", fontFamily: "Inter, sans-serif", fontWeight: 500 },
    axisLine: false,
    tickLine: false,
  };

  // Rounded card tooltip — uses CSS token variables
  const tooltipStyle = {
    contentStyle: {
      background: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: "14px",
      fontSize: 12,
      fontFamily: "Inter, sans-serif",
      boxShadow: "var(--shadow-md)",
      padding: "8px 12px",
    },
    labelStyle: { fontWeight: 600, color: "var(--text-strong)", marginBottom: 4 },
    itemStyle: { color: "var(--text)" },
  };

  // Soft grid lines — token border color
  const gridProps = grid ? (
    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
  ) : null;

  // Legend formatter
  const legendFormatter = (value: string) => series.find(s => s.key === value)?.label ?? value;

  function renderChart() {
    if (type === "pie") {
      return (
        <PieChart>
          {/* Brand gradient definition for pie */}
          <defs>
            <linearGradient id="pie-grad-brand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4F9AB3" />
              <stop offset="55%" stopColor="#0FB4A8" />
              <stop offset="100%" stopColor="#08B8A8" />
            </linearGradient>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={height / 2 - 20}
            dataKey={series[0]?.key ?? "value"}
            labelLine={false}
            label={PieLabel as never}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={series[i % series.length]?.color ?? BRAND_COLORS[i % BRAND_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={tooltipFormatter as never} />
          {legend && (
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }}
              formatter={legendFormatter}
            />
          )}
        </PieChart>
      );
    }

    const sharedChildren = (
      <>
        {/* SVG gradient definitions — brand teal→blue for primary series */}
        <defs>
          <linearGradient id="chart-grad-brand" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4F9AB3" />
            <stop offset="55%" stopColor="#0FB4A8" />
            <stop offset="100%" stopColor="#08B8A8" />
          </linearGradient>
          {series.map(s => (
            <linearGradient key={`area-${s.key}`} id={`area-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.20} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {gridProps}
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip {...tooltipStyle} formatter={tooltipFormatter as never} />
        {legend && (
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }}
            formatter={legendFormatter}
          />
        )}
      </>
    );

    if (type === "line") {
      return (
        <LineChart {...commonProps}>
          {sharedChildren}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={i === 0 ? "url(#chart-grad-brand)" : s.color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              name={s.label}
            />
          ))}
        </LineChart>
      );
    }

    if (type === "bar") {
      return (
        <BarChart {...commonProps}>
          {sharedChildren}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={i === 0 ? "url(#chart-grad-brand)" : s.color}
              radius={[6, 6, 0, 0]}
              name={s.label}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      );
    }

    if (type === "area") {
      return (
        <AreaChart {...commonProps}>
          {sharedChildren}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={i === 0 ? "url(#chart-grad-brand)" : s.color}
              strokeWidth={2.5}
              fill={`url(#area-grad-${s.key})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              name={s.label}
            />
          ))}
        </AreaChart>
      );
    }

    if (type === "composed") {
      return (
        <ComposedChart {...commonProps}>
          {sharedChildren}
          {series.map((s, i) => {
            const t = s.type ?? "bar";
            if (t === "bar") return (
              <Bar
                key={s.key}
                dataKey={s.key}
                fill={i === 0 ? "url(#chart-grad-brand)" : s.color}
                radius={[6, 6, 0, 0]}
                name={s.label}
                maxBarSize={40}
              />
            );
            if (t === "line") return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                name={s.label}
              />
            );
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.10}
                name={s.label}
              />
            );
          })}
        </ComposedChart>
      );
    }

    return null;
  }

  return (
    <div
      className={cn("hcm-card p-5", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-strong)" }}>{title}</h3>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Chart */}
      {loading ? (
        <div
          className="flex items-center justify-center"
          style={{ height, color: "var(--text-muted)" }}
        >
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-1"
          style={{ height, color: "var(--text-muted)" }}
        >
          <p className="text-sm">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {renderChart() ?? <div />}
        </ResponsiveContainer>
      )}
    </div>
  );
}
