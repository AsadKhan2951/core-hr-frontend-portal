import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle, Gift, Loader2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  used: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export default function CompensatoryLeavePage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;
  const employeeId = (user as { employeeId?: number })?.employeeId ?? 1;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [earnedDate, setEarnedDate] = useState("");
  const [earnedDays, setEarnedDays] = useState("1");
  const [reason, setReason] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const { data: compLeaves = [], refetch } = trpc.leave.compensatory.list.useQuery({
    companyId,
    employeeId,
  });

  const earnMutation = trpc.leave.compensatory.earn.useMutation({
    onSuccess: () => {
      toast.success("Compensatory leave request submitted for approval");
      refetch();
      setDialogOpen(false);
      setEarnedDate("");
      setEarnedDays("1");
      setReason("");
      setExpiryDate("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!earnedDate || !reason.trim()) {
      toast.error("Work date and reason are required");
      return;
    }
    earnMutation.mutate({
      companyId,
      employeeId,
      earnedDate: new Date(earnedDate),
      reason,
      earnedDays,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });
  };

  type CompLeave = typeof compLeaves[0];

  const totalAvailableDays = useMemo(() =>
    compLeaves
      .filter((cl: CompLeave) => cl.status === "active")
      .reduce((sum: number, cl: CompLeave) => {
        const earned = parseFloat(cl.earnedDays ?? "0");
        const used = parseFloat(cl.usedDays ?? "0");
        return sum + Math.max(0, earned - used);
      }, 0),
  [compLeaves]);

  const pendingCount = compLeaves.filter((cl: CompLeave) => !cl.approvedBy && cl.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compensatory Leave</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Earn and track compensatory time-off for extra hours or weekend work
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Earn Comp Leave
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Records", value: compLeaves.length, icon: Gift },
          { label: "Pending Approval", value: pendingCount, icon: AlertCircle },
          { label: "Active", value: compLeaves.filter((cl: CompLeave) => cl.status === "active").length, icon: CheckCircle2 },
          { label: "Days Available", value: totalAvailableDays.toFixed(1), icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compensatory Leave Records</CardTitle>
        </CardHeader>
        <CardContent>
          {compLeaves.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No compensatory leave records yet.</p>
              <Button variant="outline" className="mt-3" onClick={() => setDialogOpen(true)}>
                Submit First Request
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {(compLeaves as CompLeave[]).map(cl => {
                const available = Math.max(0, parseFloat(cl.earnedDays ?? "0") - parseFloat(cl.usedDays ?? "0"));
                return (
                  <div key={cl.id} className="rounded-xl border border-border/50 p-4 hover:border-border transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                          <Gift className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              Worked on {new Date(cl.earnedDate).toLocaleDateString()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[cl.status]}`}>
                              {cl.status.charAt(0).toUpperCase() + cl.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {cl.earnedDays} days earned · {available.toFixed(1)} available
                            </span>
                            {cl.expiryDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expires {new Date(cl.expiryDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{cl.reason}</p>
                        </div>
                      </div>
                      {cl.status === "active" && available > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {available.toFixed(1)} days left
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Earn Compensatory Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Submit a record of extra work done. Your manager will review and approve the compensatory days.
            </p>
            <div className="space-y-1.5">
              <Label>Date Worked *</Label>
              <Input type="date" value={earnedDate} onChange={e => setEarnedDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-1.5">
              <Label>Days Earned *</Label>
              <Input type="number" min="0.5" max="5" step="0.5" value={earnedDays}
                onChange={e => setEarnedDays(e.target.value)} />
              <p className="text-xs text-muted-foreground">0.5 = half day, 1 = full day</p>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-1.5">
              <Label>Work Description *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Describe the extra work done (e.g., weekend deployment, client emergency)..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={earnMutation.isPending} className="gap-2">
              {earnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
