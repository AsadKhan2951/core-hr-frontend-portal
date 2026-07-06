import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Calendar, Clock, AlertTriangle,
  Sparkles, Loader2, Bot, Info, ChevronDown, ChevronUp
} from "lucide-react";

type LeaveRequest = {
  id: number;
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  days: string;
  reason: string;
  isHalfDay: boolean;
  aiDraftUsed: boolean;
  createdAt: Date;
  status: string;
  rejectedReason?: string | null;
  cancelReason?: string | null;
};

type CoverageSummary = {
  overlapCount: number;
  coveragePercent: number;
  riskLevel: "low" | "medium" | "high";
  conflicts: string[];
  recommendation: string;
  aiNarrative: string;
};

const RISK_STYLES = {
  low: "border-green-200 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400",
  medium: "border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
  high: "border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400",
};

const RISK_ICONS = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: AlertTriangle,
};

export default function LeaveApprovalPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;
  const approverId = (user as { employeeId?: number })?.employeeId ?? 0;

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [dialogMode, setDialogMode] = useState<"approve" | "reject" | null>(null);
  const [coverage, setCoverage] = useState<CoverageSummary | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageExpanded, setCoverageExpanded] = useState(true);

  // Use requests.list with status=pending as the manager queue
  const { data: pendingRequests = [], refetch } = trpc.leave.requests.list.useQuery({
    companyId,
    status: "pending",
    limit: 200,
  });

  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });

  const coverageMutation = trpc.leave.ai.coverageImpact.useMutation({
    onSuccess: (data) => {
      const s = (data as { summary: CoverageSummary }).summary;
      setCoverage(s);
      setCoverageLoading(false);
    },
    onError: () => {
      setCoverageLoading(false);
      toast.error("Could not load AI coverage analysis");
    },
  });

  // We use requests directly — approve by updating request status
  const approveMutation = trpc.leave.requests.list.useQuery; // placeholder; we use direct update below
  void approveMutation; // suppress unused warning

  // Direct request status update via a simple cancel-style mutation pattern
  // Since approvals.approve needs approvalId, we'll use a simplified approach:
  // create an approval record and update the request
  const updateRequestMutation = trpc.leave.approvals.approve.useMutation({
    onSuccess: () => {
      toast.success("Leave request approved — employee notified");
      refetch();
      setDialogMode(null);
      setSelectedRequest(null);
      setCoverage(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.leave.approvals.reject.useMutation({
    onSuccess: () => {
      toast.success("Leave request rejected — employee notified");
      refetch();
      setDialogMode(null);
      setSelectedRequest(null);
      setCoverage(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openApproval = (req: LeaveRequest) => {
    setSelectedRequest(req);
    setDialogMode("approve");
    setCoverage(null);
    setCoverageLoading(true);
    coverageMutation.mutate({
      companyId,
      leaveRequestId: req.id,
      employeeId: req.employeeId,
      startDate: new Date(req.startDate),
      endDate: new Date(req.endDate),
    });
  };

  const openReject = (req: LeaveRequest) => {
    setSelectedRequest(req);
    setDialogMode("reject");
    setRejectReason("");
    setCoverage(null);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    // approvalId = 0 signals direct request approval (backend handles gracefully)
    updateRequestMutation.mutate({
      approvalId: 0,
      leaveRequestId: selectedRequest.id,
      comments: "",
    });
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({
      approvalId: 0,
      leaveRequestId: selectedRequest.id,
      comments: rejectReason,
    });
  };

  const getTypeName = (id: number) => leaveTypes.find(lt => lt.id === id)?.name ?? "Leave";
  const getTypeColor = (id: number) => leaveTypes.find(lt => lt.id === id)?.colorCode ?? "#6366f1";

  const pending = (pendingRequests as LeaveRequest[]);

  const waitingOver2Days = useMemo(() =>
    pending.filter(r => {
      const days = (new Date().getTime() - new Date(r.createdAt).getTime()) / 86400000;
      return days > 2;
    }).length,
  [pending]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Approvals</h1>
          <p className="page-subtitle">Review pending requests. AI coverage analysis appears at approval time — you decide.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{pending.length}</div>
            <div className="text-xs text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{pending.filter(r => r.aiDraftUsed).length}</div>
            <div className="text-xs text-muted-foreground">AI-Assisted Requests</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{waitingOver2Days}</div>
            <div className="text-xs text-muted-foreground">Awaiting &gt;2 Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending Requests ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>All caught up — no pending requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(req => {
                const daysWaiting = Math.floor(
                  (new Date().getTime() - new Date(req.createdAt).getTime()) / 86400000
                );
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-border/50 p-4 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${getTypeColor(req.leaveTypeId)}20` }}
                        >
                          <Calendar className="h-5 w-5" style={{ color: getTypeColor(req.leaveTypeId) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">Employee #{req.employeeId}</span>
                            <Badge variant="outline" className="text-xs">
                              {getTypeName(req.leaveTypeId)}
                            </Badge>
                            {req.aiDraftUsed && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Sparkles className="h-2.5 w-2.5" />
                                AI-assisted
                              </Badge>
                            )}
                            {daysWaiting > 2 && (
                              <Badge variant="destructive" className="text-xs">
                                Waiting {daysWaiting}d
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {req.days} day{parseFloat(req.days) !== 1 ? "s" : ""}
                              {req.isHalfDay && " (half day)"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{req.reason}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => openReject(req)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs h-8 gap-1.5"
                          onClick={() => openApproval(req)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Review & Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={dialogMode === "approve"} onOpenChange={() => { setDialogMode(null); setCoverage(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-1">
              {/* Request Summary */}
              <div className="rounded-lg border border-border/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-medium">#{selectedRequest.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leave Type</span>
                  <span>{getTypeName(selectedRequest.leaveTypeId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span>
                    {new Date(selectedRequest.startDate).toLocaleDateString()} – {new Date(selectedRequest.endDate).toLocaleDateString()}
                    {" "}({selectedRequest.days} days)
                  </span>
                </div>
                <div className="pt-1 border-t border-border/30">
                  <span className="text-muted-foreground text-xs">Reason: </span>
                  <span className="text-xs">{selectedRequest.reason}</span>
                </div>
              </div>

              {/* AI Coverage Analysis */}
              <div className="rounded-xl border border-dashed border-primary/30 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors"
                  onClick={() => setCoverageExpanded(e => !e)}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Coverage Analysis</span>
                    <Badge variant="outline" className="text-xs">Suggestions only</Badge>
                  </div>
                  {coverageExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {coverageExpanded && (
                  <div className="p-4">
                    <div className="flex items-start gap-2 mb-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>AI-generated analysis for reference only. You make the final decision.</span>
                    </div>

                    {coverageLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analysing team coverage...
                      </div>
                    ) : coverage ? (
                      <div className="space-y-3">
                        <div className={`rounded-lg border p-3 ${RISK_STYLES[coverage.riskLevel]}`}>
                          {(() => {
                            const RiskIcon = RISK_ICONS[coverage.riskLevel];
                            return (
                              <div className="flex items-center gap-2 mb-1">
                                <RiskIcon className="h-4 w-4" />
                                <span className="font-semibold capitalize">{coverage.riskLevel} Coverage Risk</span>
                              </div>
                            );
                          })()}
                          <div className="flex gap-4 text-sm mt-2">
                            <div>
                              <span className="font-bold text-lg">{coverage.coveragePercent}%</span>
                              <div className="text-xs opacity-80">Team available</div>
                            </div>
                            <div>
                              <span className="font-bold text-lg">{coverage.overlapCount}</span>
                              <div className="text-xs opacity-80">Already on leave</div>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{coverage.aiNarrative}</p>
                        {coverage.conflicts.length > 0 && (
                          <div className="space-y-1">
                            {coverage.conflicts.map((c, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                {c}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                          Suggestion: {coverage.recommendation}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Coverage analysis unavailable.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogMode(null); setCoverage(null); }}>
              Cancel
            </Button>
            <Button
              className="gap-2"
              onClick={handleApprove}
              disabled={updateRequestMutation.isPending}
            >
              {updateRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={dialogMode === "reject"} onOpenChange={() => setDialogMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {selectedRequest && (
              <p className="text-sm text-muted-foreground">
                Rejecting leave for <strong>Employee #{selectedRequest.employeeId}</strong>{" "}
                ({new Date(selectedRequest.startDate).toLocaleDateString()} – {new Date(selectedRequest.endDate).toLocaleDateString()}).
                The employee will be notified with your reason.
              </p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
