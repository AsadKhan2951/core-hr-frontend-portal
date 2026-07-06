import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bot, AlertTriangle, TrendingUp, Users, RefreshCw, Info,
} from "lucide-react";
import { format } from "date-fns";

const COMPANY_ID = 1;

type AbsenteeismPrediction = {
  id: number;
  employeeId: number;
  employeeName?: string;
  department?: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  predictedAbsenceDays: number;
  reasons: string[];
  predictionDate: string | Date;
  lookbackDays: number;
};

const RISK_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
  low: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  medium: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  high: { bg: "bg-red-50 border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
};

function RiskBadge({ level }: { level: string }) {
  const s = RISK_STYLES[level] ?? RISK_STYLES.low;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.badge}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  );
}

export default function AbsenteeismPredictionPage() {
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [isRunning, setIsRunning] = useState(false);

  const { data: predictions, refetch, isLoading } = trpc.attendance.ai.absenteeismPredictions.useQuery({
    companyId: COMPANY_ID,
    riskLevel: riskFilter === "all" ? undefined : (riskFilter as "low" | "medium" | "high"),
  });

  const runPrediction = trpc.attendance.ai.predictAbsenteeism.useMutation({
    onSuccess: (result: { predictionsCreated: number }) => {
      toast.success(`AI prediction complete — ${result.predictionsCreated} employee predictions updated`);
      refetch();
      setIsRunning(false);
    },
    onError: (e) => { toast.error(e.message); setIsRunning(false); },
  });

  const handleRunPrediction = () => {
    setIsRunning(true);
    runPrediction.mutate({ companyId: COMPANY_ID, lookbackDays: 90 });
  };

  const preds = (predictions as AbsenteeismPrediction[] | undefined) ?? [];
  const highRisk = preds.filter(p => p.riskLevel === "high").length;
  const mediumRisk = preds.filter(p => p.riskLevel === "medium").length;
  const lowRisk = preds.filter(p => p.riskLevel === "low").length;
  const avgRisk = preds.length > 0 ? (preds.reduce((s, p) => s + p.riskScore, 0) / preds.length).toFixed(1) : "—";

  const columns = [
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "department", header: "Department", sortable: true },
    {
      key: "riskLevel",
      header: "Risk Level",
      sortable: true,
      render: (row: Record<string, unknown>) => <RiskBadge level={String(row.riskLevel)} />,
    },
    {
      key: "riskScore",
      header: "Risk Score",
      sortable: true,
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${Number(row.riskScore) >= 70 ? "bg-red-500" : Number(row.riskScore) >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, Number(row.riskScore))}%` }}
            />
          </div>
          <span className="text-sm font-medium">{Number(row.riskScore).toFixed(0)}%</span>
        </div>
      ),
    },
    {
      key: "predictedAbsenceDays",
      header: "Predicted Absent Days",
      sortable: true,
      render: (row: Record<string, unknown>) => (
        <span className="font-medium">{Number(row.predictedAbsenceDays).toFixed(0)} days</span>
      ),
    },
    {
      key: "reasons",
      header: "AI Reasoning",
      render: (row: Record<string, unknown>) => {
        const reasons = Array.isArray(row.reasons) ? row.reasons as string[] : [];
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {reasons.slice(0, 3).map((r, i) => (
              <span key={i} className="inline-flex px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">{r}</span>
            ))}
            {reasons.length > 3 && (
              <span className="text-xs text-muted-foreground">+{reasons.length - 3} more</span>
            )}
          </div>
        );
      },
    },
    {
      key: "predictionDate",
      header: "Predicted On",
      sortable: true,
      render: (row: Record<string, unknown>) => format(new Date(String(row.predictionDate)), "dd MMM yyyy"),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Predicted Absenteeism</h1>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Bot className="h-3 w-3" />
              AI Generated — Planning Use Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered absenteeism risk predictions to help HR plan ahead. No automatic actions are taken.
          </p>
        </div>
        <Button size="sm" onClick={handleRunPrediction} disabled={isRunning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Running AI…" : "Run Prediction (90-day lookback)"}
        </Button>
      </div>

      {/* AI Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">For Planning Purposes Only.</span> These predictions are generated by an AI model based on historical attendance patterns.
          They are probabilistic estimates, not certainties. Use this data to proactively support employees — never as grounds for disciplinary action.
        </div>
      </div>

      {/* Stats */}
      {preds.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="High Risk" value={highRisk} icon={AlertTriangle} color="red" />
          <StatCard title="Medium Risk" value={mediumRisk} icon={TrendingUp} color="amber" />
          <StatCard title="Low Risk" value={lowRisk} icon={Users} color="green" />
          <StatCard title="Avg Risk Score" value={`${avgRisk}%`} icon={Bot} color="indigo" />
        </div>
      )}

      {/* Filter + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Risk Predictions
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Filter by risk</Label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {preds.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No predictions yet"
              description="Run the AI prediction engine to generate absenteeism risk scores for your workforce."
              compact
            />
          ) : (
            <DataTable
              columns={columns}
              data={preds as unknown as Record<string, unknown>[]}
              exportFilename="absenteeism-predictions"
              loading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* High Risk Detail Cards */}
      {preds.filter(p => p.riskLevel === "high").length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            High Risk Employees — Immediate Attention Recommended
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {preds.filter(p => p.riskLevel === "high").map(p => (
              <div key={p.id} className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{p.employeeName ?? `Employee #${p.employeeId}`}</p>
                    <p className="text-xs text-muted-foreground">{p.department ?? "—"}</p>
                  </div>
                  <RiskBadge level={p.riskLevel} />
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Risk Score</span>
                      <span className="font-medium text-red-700">{p.riskScore.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-red-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, p.riskScore)}%` }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-700">{p.predictedAbsenceDays.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">predicted days</p>
                  </div>
                </div>
                {p.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.reasons.map((r, i) => (
                      <span key={i} className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">{r}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic">
                  AI suggestion — review with the employee before taking any action
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
