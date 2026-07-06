import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical,
  FileText, Settings, Target, ListChecks, Copy
} from "lucide-react";

const COMPANY_ID = 1;

type QuestionType = "rating" | "text" | "yes_no" | "multi_choice";
type RaterType = "self" | "manager" | "peer" | "all";
type SectionType = "kpi" | "competency" | "questionnaire" | "development";

interface Question {
  id?: number;
  questionText: string;
  questionType: QuestionType;
  raterType: RaterType;
  weight: number;
  isRequired: boolean;
  displayOrder: number;
  options?: { value: string; label: string }[];
}

interface Section {
  id?: number;
  title: string;
  description?: string;
  sectionType: SectionType;
  weight: number;
  displayOrder: number;
  isRequired: boolean;
  questions: Question[];
}

const SECTION_TYPE_ICONS: Record<SectionType, React.ReactNode> = {
  kpi: <Target className="w-4 h-4" />,
  competency: <ListChecks className="w-4 h-4" />,
  questionnaire: <FileText className="w-4 h-4" />,
  development: <Settings className="w-4 h-4" />,
};

const SECTION_TYPE_COLORS: Record<SectionType, string> = {
  kpi: "bg-blue-100 text-blue-700",
  competency: "bg-purple-100 text-purple-700",
  questionnaire: "bg-green-100 text-green-700",
  development: "bg-orange-100 text-orange-700",
};

const defaultQuestion = (): Question => ({
  questionText: "",
  questionType: "rating",
  raterType: "all",
  weight: 1,
  isRequired: true,
  displayOrder: 0,
});

const defaultSection = (): Section => ({
  title: "",
  sectionType: "questionnaire",
  weight: 0,
  displayOrder: 0,
  isRequired: true,
  questions: [defaultQuestion()],
});

export default function PerformanceTemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"managerial" | "non_managerial" | "universal">("universal");
  const [formSections, setFormSections] = useState<Section[]>([defaultSection()]);
  const [scoringScale, setScoringScale] = useState(5);
  const [passingScore, setPassingScore] = useState(3);
  const [incrementBands, setIncrementBands] = useState([
    { minScore: 4.5, maxScore: 5, incrementPct: 15, label: "Outstanding" },
    { minScore: 3.5, maxScore: 4.49, incrementPct: 10, label: "Exceeds Expectations" },
    { minScore: 2.5, maxScore: 3.49, incrementPct: 5, label: "Meets Expectations" },
    { minScore: 1.5, maxScore: 2.49, incrementPct: 2, label: "Needs Improvement" },
    { minScore: 0, maxScore: 1.49, incrementPct: 0, label: "Unsatisfactory" },
  ]);

  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.performance.templates.list.useQuery({ companyId: COMPANY_ID });

  const createMutation = trpc.performance.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      utils.performance.templates.list.invalidate();
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.performance.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      utils.performance.templates.list.invalidate();
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.performance.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deactivated");
      utils.performance.templates.list.invalidate();
    },
  });

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormType("universal");
    setFormSections([defaultSection()]);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowCreateDialog(true);
  }

  function handleSubmit() {
    if (!formName.trim()) { toast.error("Template name is required"); return; }
    const payload = {
      companyId: COMPANY_ID,
      name: formName,
      description: formDescription || undefined,
      templateType: formType,
      scoringPolicy: { scale: scoringScale, passingScore },
      incrementPolicy: { bands: incrementBands },
      sections: formSections.map((s, si) => ({
        ...s,
        displayOrder: si,
        questions: s.questions.map((q, qi) => ({ ...q, displayOrder: qi })),
      })),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  // Section helpers
  function addSection() {
    const s = defaultSection();
    setFormSections(prev => [...prev, { ...s, displayOrder: prev.length }]);
    setExpandedSections(prev => { const next = new Set(prev); next.add(formSections.length); return next; });
  }

  function removeSection(idx: number) {
    setFormSections(prev => prev.filter((_, i) => i !== idx));
  }

  function updateSection(idx: number, patch: Partial<Section>) {
    setFormSections(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function addQuestion(sIdx: number) {
    setFormSections(prev => prev.map((s, i) => i === sIdx
      ? { ...s, questions: [...s.questions, { ...defaultQuestion(), displayOrder: s.questions.length }] }
      : s));
  }

  function removeQuestion(sIdx: number, qIdx: number) {
    setFormSections(prev => prev.map((s, i) => i === sIdx
      ? { ...s, questions: s.questions.filter((_, qi) => qi !== qIdx) }
      : s));
  }

  function updateQuestion(sIdx: number, qIdx: number, patch: Partial<Question>) {
    setFormSections(prev => prev.map((s, i) => i === sIdx
      ? { ...s, questions: s.questions.map((q, qi) => qi === qIdx ? { ...q, ...patch } : q) }
      : s));
  }

  function toggleSection(idx: number) {
    setExpandedSections(prev => {
const next = new Set(Array.from(prev));
          if (next.has(idx)) next.delete(idx); else next.add(idx);
          return next;
    });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appraisal Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Design questionnaires, scoring policies, and increment bands for performance reviews</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">Create your first appraisal template to get started</p>
            <Button onClick={openCreate} variant="outline" className="mt-2 gap-2">
              <Plus className="w-4 h-4" /> Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <Card key={tpl.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{tpl.name}</CardTitle>
                  <Badge variant={tpl.isActive ? "default" : "secondary"} className="shrink-0 text-xs">
                    {tpl.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">{tpl.templateType.replace("_", " ")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {tpl.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tpl.description}</p>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={() => {
                    toast.info("Load template editor — coming in next step");
                  }}>
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                    toast.info("Clone template — coming soon");
                  }}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => {
                    if (confirm("Deactivate this template?")) deleteMutation.mutate({ id: tpl.id, companyId: COMPANY_ID });
                  }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={v => { if (!v) resetForm(); setShowCreateDialog(v); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "Create Appraisal Template"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="structure" className="mt-2">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="structure">Structure</TabsTrigger>
              <TabsTrigger value="scoring">Scoring Policy</TabsTrigger>
              <TabsTrigger value="increment">Increment Policy</TabsTrigger>
            </TabsList>

            {/* ── Structure Tab ── */}
            <TabsContent value="structure" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Template Name *</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Annual Review 2025" />
                </div>
                <div className="space-y-1.5">
                  <Label>Template Type</Label>
                  <Select value={formType} onValueChange={v => setFormType(v as typeof formType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="universal">Universal (all employees)</SelectItem>
                      <SelectItem value="managerial">Managerial</SelectItem>
                      <SelectItem value="non_managerial">Non-Managerial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description of this template..." rows={2} />
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Sections</h3>
                <Button size="sm" variant="outline" onClick={addSection} className="gap-1">
                  <Plus className="w-3 h-3" /> Add Section
                </Button>
              </div>

              <div className="space-y-3">
                {formSections.map((section, sIdx) => (
                  <Card key={sIdx} className="border border-border">
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer select-none"
                      onClick={() => toggleSection(sIdx)}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className={`p-1 rounded ${SECTION_TYPE_COLORS[section.sectionType]}`}>
                        {SECTION_TYPE_ICONS[section.sectionType]}
                      </span>
                      <span className="font-medium text-sm flex-1 truncate">{section.title || `Section ${sIdx + 1}`}</span>
                      <Badge variant="outline" className="text-xs">{section.questions.length} questions</Badge>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={e => { e.stopPropagation(); removeSection(sIdx); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      {expandedSections.has(sIdx) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    {expandedSections.has(sIdx) && (
                      <CardContent className="pt-0 pb-4 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">Section Title</Label>
                            <Input value={section.title} onChange={e => updateSection(sIdx, { title: e.target.value })} placeholder="e.g. Core Competencies" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Type</Label>
                            <Select value={section.sectionType} onValueChange={v => updateSection(sIdx, { sectionType: v as SectionType })}>
                              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kpi">KPI</SelectItem>
                                <SelectItem value="competency">Competency</SelectItem>
                                <SelectItem value="questionnaire">Questionnaire</SelectItem>
                                <SelectItem value="development">Development</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Weight (%)</Label>
                            <Input type="number" min={0} max={100} value={section.weight} onChange={e => updateSection(sIdx, { weight: Number(e.target.value) })} />
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <Switch checked={section.isRequired} onCheckedChange={v => updateSection(sIdx, { isRequired: v })} />
                            <Label className="text-xs">Required</Label>
                          </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Questions</Label>
                            <Button size="sm" variant="ghost" onClick={() => addQuestion(sIdx)} className="h-6 gap-1 text-xs">
                              <Plus className="w-3 h-3" /> Add Question
                            </Button>
                          </div>
                          {section.questions.map((q, qIdx) => (
                            <div key={qIdx} className="border rounded-md p-3 space-y-2 bg-muted/30">
                              <div className="flex gap-2">
                                <Input
                                  className="flex-1 text-sm"
                                  value={q.questionText}
                                  onChange={e => updateQuestion(sIdx, qIdx, { questionText: e.target.value })}
                                  placeholder={`Question ${qIdx + 1}`}
                                />
                                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive shrink-0" onClick={() => removeQuestion(sIdx, qIdx)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <Select value={q.questionType} onValueChange={v => updateQuestion(sIdx, qIdx, { questionType: v as QuestionType })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="rating">Rating Scale</SelectItem>
                                    <SelectItem value="text">Open Text</SelectItem>
                                    <SelectItem value="yes_no">Yes / No</SelectItem>
                                    <SelectItem value="multi_choice">Multiple Choice</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={q.raterType} onValueChange={v => updateQuestion(sIdx, qIdx, { raterType: v as RaterType })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Raters</SelectItem>
                                    <SelectItem value="self">Self Only</SelectItem>
                                    <SelectItem value="manager">Manager Only</SelectItem>
                                    <SelectItem value="peer">Peer Only</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-1.5">
                                  <Input type="number" min={0} max={10} className="h-8 text-xs w-16" value={q.weight} onChange={e => updateQuestion(sIdx, qIdx, { weight: Number(e.target.value) })} />
                                  <span className="text-xs text-muted-foreground">wt</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── Scoring Policy Tab ── */}
            <TabsContent value="scoring" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Rating Scale Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Scale (max rating)</Label>
                      <Select value={String(scoringScale)} onValueChange={v => setScoringScale(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[3,4,5,7,10].map(n => <SelectItem key={n} value={String(n)}>{n}-point scale</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Passing Score</Label>
                      <Input type="number" min={1} max={scoringScale} step={0.5} value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="rounded-md border p-4 bg-muted/30">
                    <p className="text-sm font-medium mb-2">Scale Preview</p>
                    <div className="flex gap-2">
                      {Array.from({ length: scoringScale }, (_, i) => i + 1).map(n => (
                        <div key={n} className={`flex-1 rounded p-2 text-center text-xs font-medium ${n >= passingScore ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {n}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Green = passing ({passingScore}+), Red = below passing</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Increment Policy Tab ── */}
            <TabsContent value="increment" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Increment Bands</CardTitle>
                  <p className="text-sm text-muted-foreground">Define salary increment percentages based on final score ranges</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span>Label</span>
                    <span>Min Score</span>
                    <span>Max Score</span>
                    <span>Increment %</span>
                    <span></span>
                  </div>
                  {incrementBands.map((band, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <Input className="h-8 text-sm" value={band.label ?? ""} onChange={e => setIncrementBands(prev => prev.map((b, i) => i === idx ? { ...b, label: e.target.value } : b))} placeholder="Label" />
                      <Input type="number" className="h-8 text-sm" step={0.1} value={band.minScore} onChange={e => setIncrementBands(prev => prev.map((b, i) => i === idx ? { ...b, minScore: Number(e.target.value) } : b))} />
                      <Input type="number" className="h-8 text-sm" step={0.1} value={band.maxScore} onChange={e => setIncrementBands(prev => prev.map((b, i) => i === idx ? { ...b, maxScore: Number(e.target.value) } : b))} />
                      <Input type="number" className="h-8 text-sm" min={0} max={100} value={band.incrementPct} onChange={e => setIncrementBands(prev => prev.map((b, i) => i === idx ? { ...b, incrementPct: Number(e.target.value) } : b))} />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setIncrementBands(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setIncrementBands(prev => [...prev, { minScore: 0, maxScore: 1, incrementPct: 0, label: "" }])} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Band
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
