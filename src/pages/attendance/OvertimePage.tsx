import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";

const COMPANY_ID = 1;
const DEMO_EMPLOYEE_ID = 1;

type OvertimeRecord = {
  id: number;
  employeeId: number;
  date: string | Date;
  requestedMinutes: number;
  approvedMinutes: number | null;
  reason: string | null;
  status: string;
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  auto_approved: { label: "Auto-Approved", variant: "outline" },
};

export default function OvertimePage() {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [approveMinutes, setApproveMinutes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [requestForm, setRequestForm] = useState({ date: "", minutes: "", reason: "" });

  const { data: overtimeList, refetch } = trpc.attendance.overtime.list.useQuery({
    companyId: COMPANY_ID,
    status: undefined,
  });

  const requestOT = trpc.attendance.overtime.request.useMutation({
    onSuccess: () => { toast.success("Overtime request submitted"); setShowRequestDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const approveOT = trpc.attendance.overtime.approve.useMutation({
    onSuccess: () => { toast.success("Overtime approved"); setShowApproveDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const rejectOT = trpc.attendance.overtime.reject.useMutation({
    onSuccess: () => { toast.success("Overtime rejected"); setShowApproveDialog(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const records = (overtimeList ?? []) as OvertimeRecord[];
  const pending = records.filter(r => r.status === "pending").length;
  const approved = records.filter(r => r.status === "approved" || r.status === "auto_approved").length;
  const totalApprovedHours = records
    .filter(r => r.status === "approved" || r.status === "auto_approved")
    .reduce((sum, r) => sum + (r.approvedMinutes ?? r.requestedMinutes) / 60, 0);

  const columns = [
    { key: "employeeId", header: "Employee ID", sortable: true },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row: Record<string, unknown>) => format(new Date(String(row.date)), "dd MMM yyyy"),
    },
    {
      key: "requestedMinutes",
      header: "Requested",
      render: (row: Record<string, unknown>) => `${Math.floor(Number(row.requestedMinutes) / 60)}h ${Number(row.requestedMinutes) % 60}m`,
    },
    {
      key: "approvedMinutes",
      header: "Approved",
      render: (row: Record<string, unknown>) => row.approvedMinutes
        ? `${Math.floor(Number(row.approvedMinutes) / 60)}h ${Number(row.approvedMinutes) % 60}m`
        : "—",
    },
    { key: "reason", header: "Reason" },
    {
      key: "status",
      header: "Status",
      render: (row: Record<string, unknown>) => {
        const s = STATUS_BADGE[String(row.status)] ?? { label: String(row.status), variant: "outline" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Record<string, unknown>) => row.status === "pending" ? (
        <Button
          variant="outline" size="sm"
          onClick={() => { setSelectedRecord(row as unknown as OvertimeRecord); setApproveMinutes(String(row.requestedMinutes)); setShowApproveDialog(true); }}
        >
          Review
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overtime Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve overtime requests</p>
        </div>
        <Button size="sm" onClick={() => setShowRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Overtime
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pending Approval" value={pending} icon={AlertCircle} color="amber" />
        <StatCard title="Approved This Month" value={approved} icon={CheckCircle} color="green" />
        <StatCard title="Total Approved Hours" value={`${totalApprovedHours.toFixed(1)}h`} icon={Clock} color="blue" />
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No overtime records"
          description="Overtime requests will appear here once employees submit them or clock out late."
          action={{ label: "Request Overtime", onClick: () => setShowRequestDialog(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={records as unknown as Record<string, unknown>[]}
          exportFilename="overtime-records"
          title="Overtime Requests"
        />
      )}

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={requestForm.date} onChange={e => setRequestForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Overtime Minutes</Label>
              <Input type="number" min={30} step={30} value={requestForm.minutes} onChange={e => setRequestForm(f => ({ ...f, minutes: e.target.value }))} placeholder="e.g. 120 (= 2 hours)" className="mt-1" />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={requestForm.reason} onChange={e => setRequestForm(f => ({ ...f, reason: e.target.value }))} placeholder="Describe the reason for overtime..." className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button
              onClick={() => requestOT.mutate({
                companyId: COMPANY_ID,
                employeeId: DEMO_EMPLOYEE_ID,
                date: new Date(requestForm.date),
                requestedMinutes: Number(requestForm.minutes),
                reason: requestForm.reason,
              })}
              disabled={requestOT.isPending || !requestForm.date || !requestForm.minutes}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Overtime Request</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Employee:</span> #{selectedRecord.employeeId}</div>
                <div><span className="text-muted-foreground">Date:</span> {format(new Date(String(selectedRecord.date)), "dd MMM yyyy")}</div>
                <div><span className="text-muted-foreground">Requested:</span> {Math.floor(selectedRecord.requestedMinutes / 60)}h {selectedRecord.requestedMinutes % 60}m</div>
                {selectedRecord.reason && <div><span className="text-muted-foreground">Reason:</span> {selectedRecord.reason}</div>}
              </div>
              <div>
                <Label>Approved Minutes</Label>
                <Input type="number" value={approveMinutes} onChange={e => setApproveMinutes(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="mt-1" rows={2} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedRecord && rejectOT.mutate({ id: selectedRecord.id, rejectedBy: 1 })}
              disabled={rejectOT.isPending}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Reject
            </Button>
            <Button
              onClick={() => selectedRecord && approveOT.mutate({ id: selectedRecord.id, approvedMinutes: Number(approveMinutes), approvedBy: 1 })}
              disabled={approveOT.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
