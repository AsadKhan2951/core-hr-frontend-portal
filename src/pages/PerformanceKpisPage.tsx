import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles, Target, Loader2, ChevronRight, Layers } from "lucide-react";

const COMPANY_ID = 1;

type TargetType = "numeric" | "percentage" | "boolean" | "text";

const TARGET_TYPE_COLORS: Record<TargetType, string> = {
  numeric: "bg-blue-100 text-blue-700",
  percentage: "bg-purple-100 text-purple-700",
  boolean: "bg-green-100 text-green-700",
  text: "bg-orange-100 text-orange-700",
};

export default function PerformanceKpisPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showKpiDialog, setShowKpiDialog] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingKpiId, setEditingKpiId] = useState<number | null>(null);

  // Group form
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  // KPI form
  const [kpiTitle, setKpiTitle] = useState("");
  const [kpiDesc, setKpiDesc] = useState("");
  const [kpiUnit, setKpiUnit] = useState("");
  const [kpiTargetType, setKpiTargetType] = useState<TargetType>("numeric");
  const [kpiDefaultTarget, setKpiDefaultTarget] = useState("");
  const [kpiWeight, setKpiWeight] = useState(1);

  // AI suggestions
  const [aiDesignation, setAiDesignation] = useState("");
  const [aiDepartment, setAiDepartment] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    title: string; description: string; measurementUnit: string;
    targetType: string; suggestedTarget: string; rationale: string;
  }>>([]);

  const utils = trpc.useUtils();
  const { data: groups = [], isLoading: groupsLoading } = trpc.performance.kpis.listGroups.useQuery({ companyId: COMPANY_ID });
  const { data: allDefs = [] } = trpc.performance.kpis.listDefinitions.useQuery({ companyId: COMPANY_ID });
  const { data: selectedGroup } = trpc.performance.kpis.getGroup.useQuery(
    { id: selectedGroupId!, companyId: COMPANY_ID },
    { enabled: !!selectedGroupId }
  );

  const createGroupMutation = trpc.performance.kpis.createGroup.useMutation({
    onSuccess: () => { toast.success("Group created"); utils.performance.kpis.listGroups.invalidate(); resetGroupForm(); setShowGroupDialog(false); },
    onError: e => toast.error(e.message),
  });

  const updateGroupMutation = trpc.performance.kpis.updateGroup.useMutation({
    onSuccess: () => { toast.success("Group updated"); utils.performance.kpis.listGroups.invalidate(); resetGroupForm(); setShowGroupDialog(false); },
    onError: e => toast.error(e.message),
  });

  const createKpiMutation = trpc.performance.kpis.createDefinition.useMutation({
    onSuccess: () => {
      toast.success("KPI created");
      utils.performance.kpis.listDefinitions.invalidate();
      utils.performance.kpis.getGroup.invalidate({ id: selectedGroupId!, companyId: COMPANY_ID });
      resetKpiForm();
      setShowKpiDialog(false);
    },
    onError: e => toast.error(e.message),
  });

  const updateKpiMutation = trpc.performance.kpis.updateDefinition.useMutation({
    onSuccess: () => {
      toast.success("KPI updated");
      utils.performance.kpis.listDefinitions.invalidate();
      utils.performance.kpis.getGroup.invalidate({ id: selectedGroupId!, companyId: COMPANY_ID });
      resetKpiForm();
      setShowKpiDialog(false);
    },
    onError: e => toast.error(e.message),
  });

  const aiSuggestMutation = trpc.performance.ai.suggestKpis.useMutation({
    onSuccess: data => setAiSuggestions(data.suggestions),
    onError: e => toast.error("AI suggestion failed: " + e.message),
  });

  function resetGroupForm() { setGroupName(""); setGroupDesc(""); setEditingGroupId(null); }
  function resetKpiForm() { setKpiTitle(""); setKpiDesc(""); setKpiUnit(""); setKpiTargetType("numeric"); setKpiDefaultTarget(""); setKpiWeight(1); setEditingKpiId(null); }

  function openCreateGroup() { resetGroupForm(); setShowGroupDialog(true); }
  function openCreateKpi() {
    if (!selectedGroupId) { toast.error("Select a KPI group first"); return; }
    resetKpiForm();
    setShowKpiDialog(true);
  }

  function handleGroupSubmit() {
    if (!groupName.trim()) { toast.error("Group name required"); return; }
    if (editingGroupId) {
      updateGroupMutation.mutate({ id: editingGroupId, companyId: COMPANY_ID, name: groupName, description: groupDesc });
    } else {
      createGroupMutation.mutate({ companyId: COMPANY_ID, name: groupName, description: groupDesc });
    }
  }

  function handleKpiSubmit() {
    if (!kpiTitle.trim()) { toast.error("KPI title required"); return; }
    if (!selectedGroupId) { toast.error("Select a group first"); return; }
    const payload = {
      groupId: selectedGroupId,
      companyId: COMPANY_ID,
      title: kpiTitle,
      description: kpiDesc || undefined,
      measurementUnit: kpiUnit || undefined,
      targetType: kpiTargetType,
      defaultTarget: kpiDefaultTarget || undefined,
      weight: kpiWeight,
    };
    if (editingKpiId) {
      updateKpiMutation.mutate({ id: editingKpiId, title: kpiTitle, description: kpiDesc, measurementUnit: kpiUnit, defaultTarget: kpiDefaultTarget, weight: kpiWeight });
    } else {
      createKpiMutation.mutate(payload);
    }
  }

  function importAiSuggestion(s: typeof aiSuggestions[0]) {
    if (!selectedGroupId) { toast.error("Select a group first to import"); return; }
    createKpiMutation.mutate({
      groupId: selectedGroupId,
      companyId: COMPANY_ID,
      title: s.title,
      description: s.description,
      measurementUnit: s.measurementUnit,
      targetType: (s.targetType as TargetType) ?? "numeric",
      defaultTarget: s.suggestedTarget,
      weight: 1,
    });
  }

  const groupKpis = selectedGroup?.definitions ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs & Objectives</h1>
          <p className="text-sm text-muted-foreground mt-1">Define and organise key performance indicators by group and role</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiPanel(v => !v)} className="gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            AI Suggestions
          </Button>
          <Button onClick={openCreateGroup} className="gap-2">
            <Plus className="w-4 h-4" /> New Group
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Groups sidebar */}
        <div className="col-span-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">KPI Groups</span>
            <Badge variant="secondary">{groups.length}</Badge>
          </div>
          {groupsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : groups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-8 gap-2">
                <Layers className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No groups yet</p>
                <Button size="sm" variant="outline" onClick={openCreateGroup} className="gap-1">
                  <Plus className="w-3 h-3" /> Create Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            groups.map(g => {
              const count = allDefs.filter(d => d.groupId === g.id).length;
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedGroupId === g.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{count} KPI{count !== 1 ? "s" : ""}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${selectedGroupId === g.id ? "text-primary" : "text-muted-foreground"}`} />
                </div>
              );
            })
          )}
        </div>

        {/* KPI definitions */}
        <div className="col-span-8 space-y-4">
          {!selectedGroupId ? (
            <Card className="border-dashed h-64 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Target className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Select a KPI group to view its definitions</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedGroup?.name}</h2>
                  {selectedGroup?.description && <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>}
                </div>
                <Button onClick={openCreateKpi} size="sm" className="gap-1">
                  <Plus className="w-3 h-3" /> Add KPI
                </Button>
              </div>

              {groupKpis.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center py-10 gap-2">
                    <Target className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No KPIs in this group yet</p>
                    <Button size="sm" variant="outline" onClick={openCreateKpi} className="gap-1">
                      <Plus className="w-3 h-3" /> Add KPI
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {groupKpis.map(kpi => (
                    <Card key={kpi.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">{kpi.title}</p>
                              <Badge className={`text-xs ${TARGET_TYPE_COLORS[kpi.targetType as TargetType]}`} variant="outline">
                                {kpi.targetType}
                              </Badge>
                            </div>
                            {kpi.description && <p className="text-xs text-muted-foreground mb-1">{kpi.description}</p>}
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              {kpi.measurementUnit && <span>Unit: {kpi.measurementUnit}</span>}
                              {kpi.defaultTarget && <span>Default Target: {kpi.defaultTarget}</span>}
                              <span>Weight: {kpi.weight}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                              setEditingKpiId(kpi.id);
                              setKpiTitle(kpi.title);
                              setKpiDesc(kpi.description ?? "");
                              setKpiUnit(kpi.measurementUnit ?? "");
                              setKpiTargetType((kpi.targetType as TargetType) ?? "numeric");
                              setKpiDefaultTarget(kpi.defaultTarget ?? "");
                              setKpiWeight(Number(kpi.weight) ?? 1);
                              setShowKpiDialog(true);
                            }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => {
                              updateKpiMutation.mutate({ id: kpi.id, isActive: false });
                            }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {showAiPanel && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              AI KPI Suggestions
            </CardTitle>
            <p className="text-sm text-muted-foreground">Enter a role and department to get AI-generated KPI suggestions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Role / Designation</Label>
                <Input value={aiDesignation} onChange={e => setAiDesignation(e.target.value)} placeholder="e.g. Sales Manager" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department (optional)</Label>
                <Input value={aiDepartment} onChange={e => setAiDepartment(e.target.value)} placeholder="e.g. Sales" />
              </div>
            </div>
            <Button
              onClick={() => aiSuggestMutation.mutate({
                designation: aiDesignation,
                department: aiDepartment || undefined,
                existingKpis: groupKpis.map(k => k.title),
              })}
              disabled={!aiDesignation || aiSuggestMutation.isPending}
              className="gap-2"
              size="sm"
            >
              {aiSuggestMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {aiSuggestMutation.isPending ? "Generating..." : "Get Suggestions"}
            </Button>

            {aiSuggestions.length > 0 && (
              <div className="space-y-2 mt-2">
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggestions — review and import</p>
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="border rounded-md p-3 bg-background space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>Unit: {s.measurementUnit}</span>
                          <span>Target: {s.suggestedTarget}</span>
                          <span>Type: {s.targetType}</span>
                        </div>
                        <p className="text-xs text-blue-600 mt-1 italic">{s.rationale}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => importAiSuggestion(s)} disabled={!selectedGroupId || createKpiMutation.isPending} className="shrink-0 gap-1 text-xs">
                        <Plus className="w-3 h-3" /> Import
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={v => { if (!v) resetGroupForm(); setShowGroupDialog(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroupId ? "Edit KPI Group" : "Create KPI Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Group Name *</Label>
              <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Sales KPIs" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Optional description..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetGroupForm(); setShowGroupDialog(false); }}>Cancel</Button>
            <Button onClick={handleGroupSubmit} disabled={createGroupMutation.isPending || updateGroupMutation.isPending}>
              {editingGroupId ? "Update" : "Create"} Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Dialog */}
      <Dialog open={showKpiDialog} onOpenChange={v => { if (!v) resetKpiForm(); setShowKpiDialog(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKpiId ? "Edit KPI" : "Add KPI Definition"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>KPI Title *</Label>
              <Input value={kpiTitle} onChange={e => setKpiTitle(e.target.value)} placeholder="e.g. Monthly Revenue Target" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={kpiDesc} onChange={e => setKpiDesc(e.target.value)} placeholder="What does this KPI measure?" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Type</Label>
                <Select value={kpiTargetType} onValueChange={v => setKpiTargetType(v as TargetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numeric">Numeric</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="boolean">Yes / No</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Measurement Unit</Label>
                <Input value={kpiUnit} onChange={e => setKpiUnit(e.target.value)} placeholder="e.g. AED, %, count" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Default Target</Label>
                <Input value={kpiDefaultTarget} onChange={e => setKpiDefaultTarget(e.target.value)} placeholder="e.g. 95 or 100000" />
              </div>
              <div className="space-y-1.5">
                <Label>Weight</Label>
                <Input type="number" min={0} max={10} step={0.5} value={kpiWeight} onChange={e => setKpiWeight(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetKpiForm(); setShowKpiDialog(false); }}>Cancel</Button>
            <Button onClick={handleKpiSubmit} disabled={createKpiMutation.isPending || updateKpiMutation.isPending}>
              {editingKpiId ? "Update" : "Add"} KPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
