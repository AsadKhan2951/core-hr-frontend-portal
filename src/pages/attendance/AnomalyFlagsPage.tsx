import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Bot, CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const COMPANY_ID = 1;

type AnomalyFlag = {
  id: number;
  employeeId: number;
  employeeName?: string;
  anomalyType: string;
  severity: string;
  description: string;
  detectedAt: string | Date;
  status: string;
  reviewNotes?: string;
  reviewedBy?: number;
  reviewedAt?: string | Date;
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800 font-semibold",
};

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700",
  reviewed_ok: "bg-emerald-100 text-emerald-700",
  reviewed_action: "bg-blue-100 text-blue-700",
  dismissed: "bg-slate-100 text-slate-500",
};

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  creeping_lateness: "Creeping Lateness",
  buddy_punching: "Possible Buddy Punching",
  geo_fence_violation: "Geo-Fence Violation",
  unusual_hours: "Unusual Working Hours",
  frequent_absence: "Frequent Absence",
  irregular_pattern: "Irregular Pattern",
};

export default function AnomalyFlagsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending_review");
  const [selected, setSelected] = useState<AnomalyFlag | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const { data: flags, refetch, isLoading } = trpc.attendance.ai.anomalyFlags.useQuery({
    companyId: COMPANY_ID,
    status: statusFilter as "pending_review" | "reviewed_ok" | "reviewed_action" | "dismissed" | undefined,
  });

  const reviewFlag = trpc.attendance.anomaly.review.useMutation({
    onSuccess: () => {
      toast.success("Flag reviewed successfully");
      setSelected(null);
      setReviewNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const detectAnomalies = trpc.attendance.ai.detectAnomalies.useMutation({
    onSuccess: (result: { flagsCreated: number }) => {
      toast.success(`AI scan complete — ${result.flagsCreated} new flags created`);
      refetch();
      setIsRunning(false);
    },
    onError: (e) => { toast.error(e.message); setIsRunning(false); },
  });

  const handleRunScan = () => {
    setIsRunning(true);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    detectAnomalies.mutate({ companyId: COMPANY_ID, startDate: start, endDate: end });
  };

  const handleReview = (status: "reviewed_ok" | "reviewed_action" | "dismissed") => {
    if (!selected) return;
    reviewFlag.mutate({ id: selected.id, status, reviewNotes: reviewNotes || undefined });
  };

  const columns = [
    { key: "employeeName", header: "Employee", sortable: true },
    {
      key: "anomalyType",
      header: "Anomaly Type",
      render: (row: Record<string, unknown>) => (
        <span className="text-sm">{ANOMALY_TYPE_LABELS[String(row.anomalyType)] ?? String(row.anomalyType)}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (row: Record<string, unknown>) => {
        const cls = SEVERITY_STYLES[String(row.severity)] ?? "bg-slate-100 text-slate-600";
        return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{String(row.severity)}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: Record<string, unknown>) => {
        const cls = STATUS_STYLES[String(row.status)] ?? "bg-slate-100 text-slate-600";
        return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{String(row.status).replace(/_/g, " ")}</span>;
      },
    },
    {
      key: "detectedAt",
      header: "Detected",
      sortable: true,
      render: (row: Record<string, unknown>) => format(new Date(String(row.detectedAt)), "dd MMM yyyy"),
    },
    {
      key: "description",
      header: "Description",
      render: (row: Record<string, unknown>) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{String(row.description)}</span>
      ),
    },
    {
      key: "actions",
      header: "Review",
      render: (row: Record<string, unknown>) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => { setSelected(row as unknown as AnomalyFlag); setReviewNotes(""); }}
          disabled={row.status !== "pending_review"}
        >
          <Eye className="h-3 w-3 mr-1" />
          Review
        </Button>
      ),
    },
  ];

  const pendingCount = (flags as AnomalyFlag[] | undefined)?.filter(f => f.status === "pending_review").length ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">AI Anomaly Flags</h1>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Bot className="h-3 w-3" />
              AI Generated — Review before acting
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            AI-detected attendance patterns that may require human review. No automatic penalties are applied.
          </p>
        </div>
        <Button size="sm" onClick={handleRunScan} disabled={isRunning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Scanning…" : "Run AI Scan (Last 30 Days)"}
        </Button>
      </div>

      {/* AI Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">AI-Generated Suggestions Only.</span> These flags are generated by machine learning models and may contain false positives.
          All flags must be reviewed by an authorized HR manager before any action is taken. No penalties are applied automatically.
        </div>
      </div>

      {/* Stats */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">{pendingCount} flag{pendingCount !== 1 ? "s" : ""} pending review</span>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Anomaly Flags
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Filter by status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="reviewed_ok">Reviewed — OK</SelectItem>
                  <SelectItem value="reviewed_action">Reviewed — Action Taken</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!flags || (flags as unknown[]).length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No flags in this category"
              description={statusFilter === "pending_review"
                ? "No pending anomaly flags. Run an AI scan to detect new patterns."
                : "No flags match the selected status filter."}
              compact
            />
          ) : (
            <DataTable
              columns={columns}
              data={flags as unknown as Record<string, unknown>[]}
              exportFilename={`anomaly-flags-${statusFilter}`}
              loading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-amber-500" />
              Review Anomaly Flag
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-medium">{selected.employeeName ?? `#${selected.employeeId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anomaly Type</span>
                  <span className="font-medium">{ANOMALY_TYPE_LABELS[selected.anomalyType] ?? selected.anomalyType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_STYLES[selected.severity] ?? ""}`}>{selected.severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detected</span>
                  <span>{format(new Date(selected.detectedAt), "dd MMM yyyy HH:mm")}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <span className="font-semibold">AI Reasoning: </span>{selected.description}
              </div>
              <div>
                <Label className="text-sm">Review Notes (optional)</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision…"
                  className="mt-1.5 text-sm"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant="outline" size="sm" onClick={() => handleReview("dismissed")} disabled={reviewFlag.isPending}>
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Dismiss
            </Button>
            <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => handleReview("reviewed_action")} disabled={reviewFlag.isPending}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Action Required
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleReview("reviewed_ok")} disabled={reviewFlag.isPending}>
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Mark OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
