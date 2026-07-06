import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Calendar, Users, ChevronRight, Play, CheckCircle2,
  Clock, Archive, AlertCircle, BarChart3
} from "lucide-react";
import { Link } from "wouter";

const COMPANY_ID = 1;

type CycleStatus = "draft" | "active" | "self_review" | "manager_review" | "calibration" | "completed" | "archived";

const STATUS_CONFIG: Record<CycleStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: <Clock className="w-3 h-3" /> },
  active: { label: "Active", color: "bg-blue-100 text-blue-700", icon: <Play className="w-3 h-3" /> },
  self_review: { label: "Self Review", color: "bg-yellow-100 text-yellow-700", icon: <Users className="w-3 h-3" /> },
  manager_review: { label: "Manager Review", color: "bg-orange-100 text-orange-700", icon: <Users className="w-3 h-3" /> },
  calibration: { label: "Calibration", color: "bg-purple-100 text-purple-700", icon: <AlertCircle className="w-3 h-3" /> },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-500", icon: <Archive className="w-3 h-3" /> },
};

const STATUS_FLOW: CycleStatus[] = ["draft", "active", "self_review", "manager_review", "calibration", "completed"];

export default function PerformanceCyclesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Create form
  const [formName, setFormName] = useState("");
  const [formPeriod, setFormPeriod] = useState("");
  const [formType, setFormType] = useState<"annual" | "mid_year" | "quarterly" | "probation" | "custom">("annual");
  const [formTemplateId, setFormTemplateId] = useState<number | null>(null);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formSelfDeadline, setFormSelfDeadline] = useState("");
  const [formManagerDeadline, setFormManagerDeadline] = useState("");
  const [formCalibrationDeadline, setFormCalibrationDeadline] = useState("");

  // Participants
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  const utils = trpc.useUtils();
  const { data: cycles = [], isLoading } = trpc.performance.cycles.list.useQuery({ companyId: COMPANY_ID });
  const { data: templates = [] } = trpc.performance.templates.list.useQuery({ companyId: COMPANY_ID });
  const { data: employees = [] } = trpc.employees.list.useQuery({ companyId: COMPANY_ID });

  const createMutation = trpc.performance.cycles.create.useMutation({
    onSuccess: () => { toast.success("Cycle created"); utils.performance.cycles.list.invalidate(); resetForm(); setShowCreateDialog(false); },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.performance.cycles.update.useMutation({
    onSuccess: () => { toast.success("Cycle updated"); utils.performance.cycles.list.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const addParticipantsMutation = trpc.performance.cycles.addParticipants.useMutation({
    onSuccess: () => { toast.success("Participants added"); setShowParticipantsDialog(false); setSelectedEmployeeIds([]); },
    onError: e => toast.error(e.message),
  });

  function resetForm() {
    setFormName(""); setFormPeriod(""); setFormType("annual"); setFormTemplateId(null);
    setFormStartDate(""); setFormEndDate(""); setFormSelfDeadline("");
    setFormManagerDeadline(""); setFormCalibrationDeadline("");
  }

  function handleCreate() {
    if (!formName.trim()) { toast.error("Cycle name required"); return; }
    if (!formTemplateId) { toast.error("Select an appraisal template"); return; }
    if (!formStartDate || !formEndDate) { toast.error("Start and end dates required"); return; }
    createMutation.mutate({
      companyId: COMPANY_ID,
      name: formName,
      periodLabel: formPeriod || undefined,
      cycleType: formType,
      templateId: formTemplateId,
      startDate: new Date(formStartDate),
      endDate: new Date(formEndDate),
      selfReviewDeadline: formSelfDeadline ? new Date(formSelfDeadline) : undefined,
      managerReviewDeadline: formManagerDeadline ? new Date(formManagerDeadline) : undefined,
      calibrationDeadline: formCalibrationDeadline ? new Date(formCalibrationDeadline) : undefined,
    });
  }

  function advanceStatus(cycle: { id: number; status: string }) {
    const currentIdx = STATUS_FLOW.indexOf(cycle.status as CycleStatus);
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    updateMutation.mutate({ id: cycle.id, companyId: COMPANY_ID, status: nextStatus });
  }

  function handleAddParticipants() {
    if (!selectedCycleId || !selectedEmployeeIds.length) { toast.error("Select employees to add"); return; }
    addParticipantsMutation.mutate({
      cycleId: selectedCycleId,
      companyId: COMPANY_ID,
      participants: selectedEmployeeIds.map(id => ({ employeeId: id })),
    });
  }

  const filteredCycles = useMemo(() =>
    filterStatus === "all" ? cycles : cycles.filter(c => c.status === filterStatus),
    [cycles, filterStatus]
  );

  const activeCount = cycles.filter(c => c.status === "active" || c.status === "self_review" || c.status === "manager_review").length;
  const completedCount = cycles.filter(c => c.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appraisal Cycles</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage performance review cycles</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Cycle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Cycles", value: cycles.length, icon: <Calendar className="w-5 h-5 text-blue-500" /> },
          { label: "Active", value: activeCount, icon: <Play className="w-5 h-5 text-green-500" /> },
          { label: "Completed", value: completedCount, icon: <CheckCircle2 className="w-5 h-5 text-purple-500" /> },
          { label: "Templates", value: templates.length, icon: <BarChart3 className="w-5 h-5 text-orange-500" /> },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              {stat.icon}
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUS_FLOW].map(s => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? "default" : "outline"}
            onClick={() => setFilterStatus(s)}
            className="capitalize text-xs"
          >
            {s === "all" ? "All" : STATUS_CONFIG[s as CycleStatus]?.label ?? s}
          </Button>
        ))}
      </div>

      {/* Cycles list */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : filteredCycles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <Calendar className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No cycles found</p>
            <Button onClick={() => setShowCreateDialog(true)} variant="outline" className="gap-1">
              <Plus className="w-4 h-4" /> Create First Cycle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCycles.map(cycle => {
            const cfg = STATUS_CONFIG[cycle.status as CycleStatus];
            const currentIdx = STATUS_FLOW.indexOf(cycle.status as CycleStatus);
            const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1;
            const nextStatus = canAdvance ? STATUS_FLOW[currentIdx + 1] : null;
            return (
              <Card key={cycle.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{cycle.name}</h3>
                        {cycle.periodLabel && <span className="text-xs text-muted-foreground">({cycle.periodLabel})</span>}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">{cycle.cycleType.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(cycle.startDate).toLocaleDateString()} – {new Date(cycle.endDate).toLocaleDateString()}</span>
                        {cycle.selfReviewDeadline && <span>Self review by {new Date(cycle.selfReviewDeadline).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSelectedCycleId(cycle.id); setShowParticipantsDialog(true); }}>
                        <Users className="w-3 h-3" /> Participants
                      </Button>
                      {canAdvance && nextStatus && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => advanceStatus(cycle)}>
                          <ChevronRight className="w-3 h-3" /> Move to {STATUS_CONFIG[nextStatus].label}
                        </Button>
                      )}
                      <Link href={`/performance/reports/${cycle.id}`}>
                        <Button size="sm" variant="outline" className="gap-1">
                          <BarChart3 className="w-3 h-3" /> Reports
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex gap-1">
                      {STATUS_FLOW.map((s, i) => (
                        <div
                          key={s}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIdx ? "bg-primary" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Draft</span>
                      <span>Completed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Cycle Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={v => { if (!v) resetForm(); setShowCreateDialog(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Appraisal Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cycle Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Annual Review 2025" />
              </div>
              <div className="space-y-1.5">
                <Label>Period Label</Label>
                <Input value={formPeriod} onChange={e => setFormPeriod(e.target.value)} placeholder="e.g. H1 2025" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cycle Type</Label>
                <Select value={formType} onValueChange={v => setFormType(v as typeof formType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="mid_year">Mid-Year</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Appraisal Template *</Label>
                <Select value={formTemplateId ? String(formTemplateId) : ""} onValueChange={v => setFormTemplateId(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.isActive).map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium">Dates & Deadlines</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input type="date" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Self Review Deadline</Label>
                <Input type="date" value={formSelfDeadline} onChange={e => setFormSelfDeadline(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager Review Deadline</Label>
                <Input type="date" value={formManagerDeadline} onChange={e => setFormManagerDeadline(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Calibration Deadline</Label>
                <Input type="date" value={formCalibrationDeadline} onChange={e => setFormCalibrationDeadline(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={showParticipantsDialog} onOpenChange={v => { if (!v) { setSelectedEmployeeIds([]); } setShowParticipantsDialog(v); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Select employees to add to this cycle</p>
            <Input placeholder="Search employees..." className="mb-2" onChange={() => {}} />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployeeIds(prev =>
                    prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                  )}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedEmployeeIds.includes(emp.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"}`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {emp.firstName[0]}{emp.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                    {emp.designationName && <p className="text-xs text-muted-foreground">{emp.designationName}</p>}
                  </div>
                  {selectedEmployeeIds.includes(emp.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{selectedEmployeeIds.length} selected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedEmployeeIds([]); setShowParticipantsDialog(false); }}>Cancel</Button>
            <Button onClick={handleAddParticipants} disabled={!selectedEmployeeIds.length || addParticipantsMutation.isPending}>
              Add {selectedEmployeeIds.length} Participant{selectedEmployeeIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
