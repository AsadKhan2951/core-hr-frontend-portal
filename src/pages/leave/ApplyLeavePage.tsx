import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Send, Calendar, Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ApplyLeavePage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;
  const employeeId = (user as { employeeId?: number })?.employeeId ?? 1;

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<"morning" | "afternoon">("morning");
  const [reason, setReason] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiDraftUsed, setAiDraftUsed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });
  const year = useMemo(() => new Date().getFullYear(), []);
  const { data: balances = [] } = trpc.leave.balances.list.useQuery({ companyId, year, employeeId });

  const selectedType = leaveTypes.find(lt => lt.id === parseInt(leaveTypeId));
  const selectedBalance = balances.find(b => b.leaveTypeId === parseInt(leaveTypeId));

  // Calculate business days
  const businessDays = useMemo(() => {
    if (!startDate || !endDate || isHalfDay) return isHalfDay ? 0.5 : 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [startDate, endDate, isHalfDay]);

  const aiDraftMutation = trpc.leave.ai.draftRequest.useMutation({
    onSuccess: (data) => {
      setReason(data.draft);
      setAiDraftUsed(true);
      toast.success("AI draft generated — review and edit before submitting");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.leave.requests.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Leave request submitted successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAiDraft = () => {
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error("Select leave type and dates first");
      return;
    }
    aiDraftMutation.mutate({
      leaveTypeName: selectedType?.name ?? "Leave",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days: businessDays,
      context: aiContext,
    });
  };

  const handleSubmit = () => {
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (businessDays <= 0) {
      toast.error("Invalid date range");
      return;
    }
    submitMutation.mutate({
      companyId,
      employeeId,
      leaveTypeId: parseInt(leaveTypeId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isHalfDay,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      reason,
      aiDraftUsed,
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Leave Request Submitted</h2>
        <p className="text-muted-foreground max-w-sm">
          Your request has been submitted and is pending manager approval. You'll receive a notification once reviewed.
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>Apply for Another Leave</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Apply for Leave</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a leave request. Use the AI assistant to help phrase your reason.
        </p>
      </div>

      {/* Balance Overview */}
      {leaveTypeId && selectedBalance && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{selectedType?.name} Balance</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{selectedBalance.balance}</div>
                  <div className="text-xs text-muted-foreground">Available</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-amber-600">{selectedBalance.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-muted-foreground">{selectedBalance.used}</div>
                  <div className="text-xs text-muted-foreground">Used</div>
                </div>
              </div>
            </div>
            {businessDays > 0 && parseFloat(selectedBalance.balance ?? "0") < businessDays && (
              <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                Requested days ({businessDays}) exceed available balance ({selectedBalance.balance})
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Leave Type */}
          <div className="space-y-1.5">
            <Label>Leave Type *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.filter(lt => lt.isActive).map(lt => (
                  <SelectItem key={lt.id} value={String(lt.id)}>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: lt.colorCode ?? "#6366f1" }} />
                      {lt.name}
                      {!lt.isPaid && <Badge variant="secondary" className="text-xs ml-1">Unpaid</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Half Day Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div>
              <Label>Half Day</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Request only half a working day</p>
            </div>
            <Switch checked={isHalfDay} onCheckedChange={setIsHalfDay} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{isHalfDay ? "Date *" : "Start Date *"}</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]} />
            </div>
            {!isHalfDay ? (
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Period</Label>
                <Select value={halfDayPeriod} onValueChange={v => setHalfDayPeriod(v as "morning" | "afternoon")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Days Preview */}
          {businessDays > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4" />
              <span>
                <strong className="text-foreground">{businessDays}</strong> working day{businessDays !== 1 ? "s" : ""} requested
              </span>
            </div>
          )}

          {/* AI Draft Assistant */}
          <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Drafting Assistant</span>
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter rough notes and the AI will draft a professional reason for you to review and edit.
            </p>
            <Textarea
              value={aiContext}
              onChange={e => setAiContext(e.target.value)}
              placeholder="e.g. family event, medical check-up, personal matters..."
              rows={2}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAiDraft}
              disabled={aiDraftMutation.isPending}
            >
              {aiDraftMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Draft
            </Button>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Reason *</Label>
              {aiDraftUsed && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-assisted (reviewed by you)
                </Badge>
              )}
            </div>
            <Textarea
              value={reason}
              onChange={e => { setReason(e.target.value); if (aiDraftUsed) setAiDraftUsed(false); }}
              placeholder="Describe the reason for your leave request..."
              rows={4}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full gap-2"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Leave Request
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
