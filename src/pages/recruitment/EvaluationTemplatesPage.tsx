import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2, GripVertical } from "lucide-react";

const TEMPLATE_TYPES = [
  { value: "test", label: "Written Test" },
  { value: "interview", label: "Interview" },
  { value: "evaluation", label: "Evaluation" },
  { value: "technical", label: "Technical Assessment" },
  { value: "behavioral", label: "Behavioral Assessment" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  test: "bg-purple-100 text-purple-800",
  interview: "bg-blue-100 text-blue-800",
  evaluation: "bg-orange-100 text-orange-800",
  technical: "bg-indigo-100 text-indigo-800",
  behavioral: "bg-teal-100 text-teal-800",
};

interface Criterion {
  name: string;
  weight: number;
  maxScore: number;
}

export default function EvaluationTemplatesPage() {
  const [filterType, setFilterType] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    type: "interview" as const,
    description: "",
  });
  const [criteria, setCriteria] = useState<Criterion[]>([
    { name: "Technical Knowledge", weight: 30, maxScore: 10 },
    { name: "Communication", weight: 20, maxScore: 10 },
    { name: "Problem Solving", weight: 25, maxScore: 10 },
    { name: "Cultural Fit", weight: 25, maxScore: 10 },
  ]);

  const { data: templates = [], refetch } = trpc.recruitment.templates.list.useQuery({
    type: filterType || undefined,
  });

  const createMutation = trpc.recruitment.templates.create.useMutation({
    onSuccess: () => { toast.success("Template created"); setShowCreate(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.recruitment.templates.delete.useMutation({
    onSuccess: () => { toast.success("Template deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ name: "", type: "interview", description: "" });
    setCriteria([{ name: "Technical Knowledge", weight: 30, maxScore: 10 }, { name: "Communication", weight: 20, maxScore: 10 }]);
  };

  const handleCreate = () => {
    if (!form.name) return toast.error("Template name is required");
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight !== 100) return toast.error(`Criteria weights must sum to 100 (currently ${totalWeight})`);
    createMutation.mutate({ name: form.name, type: form.type, description: form.description || undefined, criteria });
  };

  const addCriterion = () => setCriteria(c => [...c, { name: "", weight: 0, maxScore: 10 }]);
  const removeCriterion = (i: number) => setCriteria(c => c.filter((_, idx) => idx !== i));
  const updateCriterion = (i: number, field: keyof Criterion, value: string | number) =>
    setCriteria(c => c.map((cr, idx) => idx === i ? { ...cr, [field]: typeof value === "string" ? value : Number(value) } : cr));

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evaluation Templates</h1>
          <p className="text-muted-foreground text-sm">Configurable test, interview, and evaluation scoring templates</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Create Template
        </Button>
      </div>

      {/* Filter */}
      <Select value={filterType || "all"} onValueChange={v => setFilterType(v === "all" ? "" : v)}>
        <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(templates as any[]).length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No templates yet. Create evaluation templates to standardize your hiring process.</p>
          </div>
        ) : (templates as any[]).map((t: any) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTemplate(t)}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge className={TYPE_COLORS[t.type] || "bg-gray-100 text-gray-800"}>{t.type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              {t.criteria && t.criteria.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Criteria ({t.criteria.length})</p>
                  {t.criteria.slice(0, 3).map((c: Criterion, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{c.weight}% · max {c.maxScore}</span>
                    </div>
                  ))}
                  {t.criteria.length > 3 && <p className="text-xs text-muted-foreground">+{t.criteria.length - 3} more</p>}
                </div>
              )}
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                  onClick={e => { e.stopPropagation(); deleteMutation.mutate({ id: t.id }); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Create Evaluation Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Template Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Senior Engineer Interview" /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPLATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            </div>

            {/* Criteria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scoring Criteria</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${totalWeight === 100 ? "text-green-600" : "text-red-500"}`}>
                    Total weight: {totalWeight}% {totalWeight !== 100 && "(must be 100%)"}
                  </span>
                  <Button size="sm" variant="outline" onClick={addCriterion} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {criteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input className="flex-1 h-8 text-sm" value={c.name} onChange={e => updateCriterion(i, "name", e.target.value)} placeholder="Criterion name" />
                    <div className="flex items-center gap-1 shrink-0">
                      <Input type="number" className="w-16 h-8 text-sm" value={c.weight} onChange={e => updateCriterion(i, "weight", e.target.value)} />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">max</span>
                      <Input type="number" className="w-14 h-8 text-sm" value={c.maxScore} onChange={e => updateCriterion(i, "maxScore", e.target.value)} />
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeCriterion(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Detail Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                {selectedTemplate.name}
                <Badge className={TYPE_COLORS[selectedTemplate.type] || "bg-gray-100 text-gray-800"}>{selectedTemplate.type}</Badge>
              </DialogTitle>
            </DialogHeader>
            {selectedTemplate.description && <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>}
            {selectedTemplate.criteria && selectedTemplate.criteria.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Scoring Criteria</p>
                {selectedTemplate.criteria.map((c: Criterion, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <span className="font-medium">{c.name}</span>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>Weight: {c.weight}%</span>
                      <span>Max: {c.maxScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
