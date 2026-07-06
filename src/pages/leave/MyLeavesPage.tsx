import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw, Filter } from "lucide-react";

const STATUS_CSS: Record<string, string> = {
  pending: "status-pending",
  approved: "status-approved",
  rejected: "status-rejected",
  cancelled: "status-draft",
  withdrawn: "status-draft",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: AlertCircle,
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: RotateCcw,
  withdrawn: RotateCcw,
};

export default function MyLeavesPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;
  const employeeId = (user as { employeeId?: number })?.employeeId ?? 1;

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const year = useMemo(() => new Date().getFullYear(), []);

  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });
  const { data: requests = [], refetch } = trpc.leave.requests.list.useQuery({
    companyId,
    employeeId,
    limit: 200,
  });
  const { data: balances = [] } = trpc.leave.balances.list.useQuery({ companyId, year, employeeId });

  const cancelMutation = trpc.leave.requests.cancel.useMutation({
    onSuccess: () => { toast.success("Leave request cancelled"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (typeFilter !== "all" && r.leaveTypeId !== parseInt(typeFilter)) return false;
    return true;
  });

  const getTypeName = (id: number) => leaveTypes.find(lt => lt.id === id)?.name ?? "Unknown";
  const getTypeColor = (id: number) => leaveTypes.find(lt => lt.id === id)?.colorCode ?? "#6366f1";

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leaves</h1>
          <p className="page-subtitle">Track your leave requests and balances</p>
        </div>
      </div>

      {/* Balance Cards */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {balances.slice(0, 4).map(b => {
            const lt = leaveTypes.find(t => t.id === b.leaveTypeId);
            const available = parseFloat(b.balance ?? "0");
            const entitled = parseFloat(b.entitled ?? "0");
            const pct = entitled > 0 ? Math.round((available / entitled) * 100) : 0;
            return (
              <Card key={b.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: lt?.colorCode ?? "#6366f1" }} />
                    <span className="text-xs font-medium text-muted-foreground truncate">{lt?.name ?? "Leave"}</span>
                  </div>
                  <div className="text-2xl font-bold">{b.balance}</div>
                  <div className="text-xs text-muted-foreground">of {b.entitled} days available</div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: lt?.colorCode ?? "#6366f1" }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
          { label: "Rejected", value: stats.rejected, color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Leave History</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {leaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={String(lt.id)}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No leave requests found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => {
                const StatusIcon = STATUS_ICONS[req.status] ?? AlertCircle;
                const canCancel = req.status === "pending";
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-border/50 p-4 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${getTypeColor(req.leaveTypeId)}20` }}
                        >
                          <Calendar className="h-4 w-4" style={{ color: getTypeColor(req.leaveTypeId) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{getTypeName(req.leaveTypeId)}</span>
                            <span className={STATUS_CSS[req.status] ?? "status-draft"}>
                              <StatusIcon className="h-3 w-3" />
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                            {req.aiDraftUsed && (
                              <Badge variant="outline" className="text-xs">AI-assisted</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {req.days} day{parseFloat(req.days ?? "0") !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{req.reason}</p>
                          {req.status === "rejected" && req.rejectedReason && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded px-2 py-1">
                              Rejection reason: {req.rejectedReason}
                            </div>
                          )}
                        </div>
                      </div>
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 flex-shrink-0"
                          onClick={() => cancelMutation.mutate({ id: req.id, cancelReason: "Cancelled by employee" })}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
