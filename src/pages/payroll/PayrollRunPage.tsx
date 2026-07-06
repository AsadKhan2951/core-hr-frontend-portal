/**
 * PayrollRunPage — Payroll Module 4
 * Initiate and manage payroll runs (group/department/individual/all).
 * Shows AI anomaly flags before approval.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Play, Lock, CheckCircle, AlertTriangle, Bot, ChevronRight, RefreshCw } from "lucide-react";

const COMPANY_ID = 1;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const runStatusColor: Record<string, string> = {
  processing: "bg-blue-100 text-blue-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  locked: "bg-purple-100 text-purple-800",
  disbursed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function PayrollRunPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const now = new Date();

  const { data: runs = [], isLoading } = trpc.payroll.runs.list.useQuery({ companyId: COMPANY_ID });
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const { data: anomalies = [] } = trpc.payroll.anomalies.list.useQuery(
    { payrollRunId: activeRunId! },
    { enabled: !!activeRunId }
  );

  const [initiateDialog, setInitiateDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<(typeof runs)[0] | null>(null);
  const [anomalyDialog, setAnomalyDialog] = useState(false);

  const [runForm, setRunForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    currency: "AED",
    scope: "all" as "all" | "department" | "location" | "individual",
    employeeIds: "",
    notes: "",
  });

  const initiateRun = trpc.payroll.runs.initiate.useMutation({
    onSuccess: () => {
      utils.payroll.runs.list.invalidate();
      utils.payroll.anomalies.list.invalidate();
      toast.success("Payroll run initiated successfully");
      setInitiateDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const approveRun = trpc.payroll.runs.approve.useMutation({
    onSuccess: () => { utils.payroll.runs.list.invalidate(); toast.success("Payroll run approved"); },
    onError: (e) => toast.error(e.message),
  });

  const lockRun = trpc.payroll.runs.lock.useMutation({
    onSuccess: () => { utils.payroll.runs.list.invalidate(); toast.success("Payroll run locked"); },
    onError: (e) => toast.error(e.message),
  });

  const disburseRun = trpc.payroll.runs.disburse.useMutation({
    onSuccess: () => { utils.payroll.runs.list.invalidate(); toast.success("Payroll disbursed"); },
    onError: (e) => toast.error(e.message),
  });

  const reviewAnomaly = trpc.payroll.anomalies.review.useMutation({
    onSuccess: () => { utils.payroll.anomalies.list.invalidate(); toast.success("Anomaly reviewed"); },
    onError: (e) => toast.error(e.message),
  });

  const handleInitiate = () => {
    const empIds = runForm.employeeIds.trim()
      ? runForm.employeeIds.split(",").map((s) => parseInt(s.trim())).filter(Boolean)
      : [];
    if (runForm.scope !== "all" && empIds.length === 0) {
      return toast.error("Please specify employee IDs for the selected scope");
    }
    initiateRun.mutate({
      companyId: COMPANY_ID,
      month: runForm.month,
      year: runForm.year,
      currency: runForm.currency,
      scope: runForm.scope,
      employeeIds: empIds,
      notes: runForm.notes || undefined,
      runBy: user?.id ?? 0,
    });
  };

  const pendingAnomalies = anomalies.filter((a) => a.status === "pending");
  const runAnomalies = selectedRun ? anomalies.filter((a) => a.payrollRunId === selectedRun.id) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Initiate, approve, lock, and disburse payroll runs</p>
        </div>
        <div className="flex gap-2">
          {pendingAnomalies.length > 0 && (
            <Button variant="outline" className="text-amber-600 border-amber-300" onClick={() => setAnomalyDialog(true)}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              {pendingAnomalies.length} Anomaly Flags
            </Button>
          )}
          <Button onClick={() => setInitiateDialog(true)}>
            <Play className="w-4 h-4 mr-2" />Run Payroll
          </Button>
        </div>
      </div>

      {/* ── AI ANOMALY BANNER ─────────────────────────────────────────────────── */}
      {pendingAnomalies.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Bot className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">AI Anomaly Detection — {pendingAnomalies.length} flag(s) require review</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              These are advisory suggestions only. Review each flag and decide whether to proceed. No payroll is blocked automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── RUNS TABLE ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Run History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No payroll runs yet. Click "Run Payroll" to start.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Total Gross</TableHead>
                  <TableHead>Total Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Anomalies</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const runAnoms = anomalies.filter((a) => a.payrollRunId === r.id && a.status === "pending");
                  return (
                    <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRun(r)}>
                      <TableCell className="font-medium">{MONTHS[r.month - 1]} {r.year}</TableCell>
                      <TableCell className="capitalize">{r.scope}</TableCell>
                      <TableCell>{r.employeeCount}</TableCell>
                      <TableCell>{r.currency} {parseFloat(r.totalGross).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">{r.currency} {parseFloat(r.totalNet).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${runStatusColor[r.status] ?? ""}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {runAnoms.length > 0 ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <AlertTriangle className="w-3 h-3 mr-1" />{runAnoms.length}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          {r.status === "pending_approval" && (
                            <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => approveRun.mutate({ id: r.id, approvedBy: user?.id ?? 0 })}>
                              <CheckCircle className="w-3 h-3 mr-1" />Approve
                            </Button>
                          )}
                          {r.status === "approved" && (
                            <Button size="sm" variant="outline" onClick={() => lockRun.mutate({ id: r.id })}>
                              <Lock className="w-3 h-3 mr-1" />Lock
                            </Button>
                          )}
                          {r.status === "locked" && (
                            <Button size="sm" onClick={() => disburseRun.mutate({ id: r.id })}>
                              <ChevronRight className="w-3 h-3 mr-1" />Disburse
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── INITIATE DIALOG ──────────────────────────────────────────────────── */}
      <Dialog open={initiateDialog} onOpenChange={setInitiateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Initiate Payroll Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month</Label>
                <Select value={String(runForm.month)} onValueChange={(v) => setRunForm((f) => ({ ...f, month: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={runForm.year} onChange={(e) => setRunForm((f) => ({ ...f, year: parseInt(e.target.value) || now.getFullYear() }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency</Label>
                <Select value={runForm.currency} onValueChange={(v) => setRunForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["AED", "USD", "EUR", "GBP", "SAR", "INR"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope</Label>
                <Select value={runForm.scope} onValueChange={(v) => setRunForm((f) => ({ ...f, scope: v as typeof runForm.scope }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">By Department</SelectItem>
                    <SelectItem value="location">By Location</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {runForm.scope !== "all" && (
              <div>
                <Label>Employee IDs (comma-separated)</Label>
                <Input value={runForm.employeeIds} onChange={(e) => setRunForm((f) => ({ ...f, employeeIds: e.target.value }))} placeholder="e.g. 1, 2, 5, 12" />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={runForm.notes} onChange={(e) => setRunForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes for this run" />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>AI anomaly detection runs automatically after payroll calculation. Any flags will appear for your review before you approve the run.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiateDialog(false)}>Cancel</Button>
            <Button onClick={handleInitiate} disabled={initiateRun.isPending}>
              {initiateRun.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />Run Payroll</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ANOMALY REVIEW DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={anomalyDialog} onOpenChange={setAnomalyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-500" />
              AI Anomaly Flags — Advisory Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>These flags are AI-generated suggestions for human review. No payroll is blocked or penalized automatically. Review each flag and decide whether to proceed.</span>
            </div>
            {pendingAnomalies.map((a) => (
              <div key={a.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.severity === "high" ? "bg-red-100 text-red-800" : a.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                        {a.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{a.type.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">Employee #{a.employeeId}</span>
                    </div>
                    <p className="text-sm mt-1">{a.description}</p>
                    {a.previousValue && a.currentValue && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Previous: {a.previousValue} → Current: {a.currentValue}
                        {a.percentChange && ` (${a.percentChange}% change)`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => reviewAnomaly.mutate({ id: a.id, status: "acknowledged", reviewedBy: user?.id ?? 0 })}>
                      Acknowledge
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => reviewAnomaly.mutate({ id: a.id, status: "dismissed", reviewedBy: user?.id ?? 0 })}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setAnomalyDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
