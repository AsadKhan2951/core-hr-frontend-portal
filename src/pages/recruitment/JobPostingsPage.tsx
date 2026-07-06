import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Briefcase, Bot, Sparkles, Globe, Eye, Pencil, Trash2 } from "lucide-react";

const STATUS_CSS: Record<string, string> = {
  draft: "status-draft",
  open: "status-open",
  paused: "status-pending",
  closed: "status-closed",
  filled: "status-approved",
};

const defaultForm = {
  title: "", department: "", location: "", employmentType: "full_time",
  experienceMin: "", experienceMax: "", salaryMin: "", salaryMax: "",
  description: "", requirements: "", benefits: "", currency: "AED",
  applicationDeadline: "", isPublic: true,
};

export default function JobPostingsPage() {
  const [companyId] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editJob, setEditJob] = useState<any>(null);
  const [viewJob, setViewJob] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [aiInputs, setAiInputs] = useState({ title: "", department: "", keySkills: "", experienceLevel: "Mid-level" });
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: jobs = [], refetch } = trpc.recruitment.jobs.list.useQuery({});

  const createMutation = trpc.recruitment.jobs.create.useMutation({
    onSuccess: () => { toast.success("Job posting created"); setShowCreate(false); setForm(defaultForm); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.recruitment.jobs.update.useMutation({
    onSuccess: () => { toast.success("Job posting updated"); setEditJob(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.recruitment.jobs.delete.useMutation({
    onSuccess: () => { toast.success("Job posting deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const generateJDMutation = trpc.recruitment.ai.generateJD.useMutation({
    onSuccess: (data: any) => {
      setForm(f => ({
        ...f,
        description: data.description ?? f.description,
        requirements: data.requirements ?? f.requirements,
        benefits: data.benefits ?? f.benefits,
      }));
      setShowAiPanel(false);
      toast.success("AI job description generated — review before saving");
      setAiLoading(false);
    },
    onError: (e) => { toast.error(e.message); setAiLoading(false); },
  });

  const handleCreate = () => {
    if (!form.title) return toast.error("Title is required");
    createMutation.mutate({
      title: form.title,
      location: form.location || undefined,
      type: form.employmentType as any,
      experienceMin: form.experienceMin ? parseInt(form.experienceMin) : 0,
      experienceMax: form.experienceMax ? parseInt(form.experienceMax) : undefined,
      salaryMin: form.salaryMin || undefined,
      salaryMax: form.salaryMax || undefined,
      description: form.description || undefined,
      requirements: form.requirements || undefined,
      currency: form.currency,
      closingDate: form.applicationDeadline ? new Date(form.applicationDeadline) : undefined,
      isPublic: form.isPublic,
    });
  };

  const handleGenerateJD = () => {
    if (!aiInputs.title) return toast.error("Job title is required for AI generation");
    setAiLoading(true);
    generateJDMutation.mutate({
      title: aiInputs.title,
      department: aiInputs.department || undefined,
      keySkills: aiInputs.keySkills ? aiInputs.keySkills.split(",").map(s => s.trim()) : [],
      experienceLevel: aiInputs.experienceLevel,
    });
  };

  const openCreate = () => { setForm(defaultForm); setShowCreate(true); };
  const openEdit = (job: any) => {
    setForm({
      title: job.title ?? "", department: job.department ?? "", location: job.location ?? "",
      employmentType: job.employmentType ?? "full_time", experienceMin: job.experienceMin?.toString() ?? "",
      experienceMax: job.experienceMax?.toString() ?? "", salaryMin: job.salaryMin?.toString() ?? "",
      salaryMax: job.salaryMax?.toString() ?? "", description: job.description ?? "",
      requirements: job.requirements ?? "", benefits: job.benefits ?? "", currency: job.currency ?? "AED",
      applicationDeadline: "", isPublic: job.isPublic ?? true,
    });
    setEditJob(job);
  };

  const stats = {
    total: jobs.length,
    open: jobs.filter((j: any) => j.status === "open").length,
    draft: jobs.filter((j: any) => j.status === "draft").length,
    filled: jobs.filter((j: any) => j.status === "filled").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Postings</h1>
          <p className="page-subtitle">Manage open positions and publish to the career portal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiPanel(true)} className="gap-2">
            <Bot className="w-4 h-4" /> AI Generate JD
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> New Job
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-blue-600" },
          { label: "Open", value: stats.open, color: "text-green-600" },
          { label: "Draft", value: stats.draft, color: "text-gray-600" },
          { label: "Filled", value: stats.filled, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No job postings yet. Create the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{job.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{job.department} · {job.location}</p>
                  </div>
                  <span className={STATUS_CSS[job.status] ?? "status-draft"}>{job.status}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="bg-muted px-2 py-0.5 rounded">{job.employmentType?.replace("_", " ")}</span>
                  {job.experienceMin != null && <span className="bg-muted px-2 py-0.5 rounded">{job.experienceMin}–{job.experienceMax ?? "+"} yrs</span>}
                  {job.salaryMin && <span className="bg-muted px-2 py-0.5 rounded">{job.currency} {job.salaryMin?.toLocaleString()}–{job.salaryMax?.toLocaleString()}</span>}
                  {job.isPublic && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><Globe className="w-3 h-3" /> Public</span>}
                </div>
                <div className="flex gap-1 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setViewJob(job)}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(job)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                    onClick={() => deleteMutation.mutate({ id: job.id })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI JD Generator Panel */}
      <Dialog open={showAiPanel} onOpenChange={setShowAiPanel}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> AI Job Description Generator
            </DialogTitle>
          </DialogHeader>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800 mb-2">
            <strong>AI Suggestion Only</strong> — The generated JD is a starting point. Always review and edit before publishing.
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Job Title *</Label>
              <Input value={aiInputs.title} onChange={e => setAiInputs(a => ({ ...a, title: e.target.value }))} placeholder="e.g. Senior Product Manager" />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input value={aiInputs.department} onChange={e => setAiInputs(a => ({ ...a, department: e.target.value }))} placeholder="e.g. Product" />
            </div>
            <div className="space-y-1">
              <Label>Key Skills (comma-separated)</Label>
              <Input value={aiInputs.keySkills} onChange={e => setAiInputs(a => ({ ...a, keySkills: e.target.value }))} placeholder="e.g. React, Node.js, SQL" />
            </div>
            <div className="space-y-1">
              <Label>Experience Level</Label>
              <Select value={aiInputs.experienceLevel} onValueChange={v => setAiInputs(a => ({ ...a, experienceLevel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Entry-level">Entry-level</SelectItem>
                  <SelectItem value="Mid-level">Mid-level</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Lead">Lead / Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiPanel(false)}>Cancel</Button>
            <Button onClick={handleGenerateJD} disabled={aiLoading} className="gap-2">
              <Bot className="w-4 h-4" /> {aiLoading ? "Generating..." : "Generate JD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      {(showCreate || editJob) && (
        <Dialog open={showCreate || !!editJob} onOpenChange={() => { setShowCreate(false); setEditJob(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editJob ? "Edit Job Posting" : "New Job Posting"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2 space-y-1">
                <Label>Job Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={v => setForm(f => ({ ...f, employmentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Experience Min (years)</Label>
                <Input type="number" value={form.experienceMin} onChange={e => setForm(f => ({ ...f, experienceMin: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Experience Max (years)</Label>
                <Input type="number" value={form.experienceMax} onChange={e => setForm(f => ({ ...f, experienceMax: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Salary Min</Label>
                <Input type="number" value={form.salaryMin} onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Salary Max</Label>
                <Input type="number" value={form.salaryMax} onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Application Deadline</Label>
                <Input type="date" value={form.applicationDeadline} onChange={e => setForm(f => ({ ...f, applicationDeadline: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Job Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Describe the role..." />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Requirements</Label>
                <Textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} rows={3} placeholder="List requirements..." />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Benefits</Label>
                <Textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} rows={2} placeholder="List benefits..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditJob(null); }}>Cancel</Button>
              <Button
                onClick={() => {
                  if (editJob) {
                    updateMutation.mutate({ id: editJob.id, data: { title: form.title, description: form.description, requirements: form.requirements, benefits: form.benefits } });
                  } else {
                    handleCreate();
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editJob ? "Save Changes" : "Create Posting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      {viewJob && (
        <Dialog open={!!viewJob} onOpenChange={() => setViewJob(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" /> {viewJob.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex gap-2 flex-wrap">
                <span className={STATUS_CSS[viewJob.status] ?? "status-draft"}>{viewJob.status}</span>
                <Badge variant="outline">{viewJob.department}</Badge>
                <Badge variant="outline">{viewJob.location}</Badge>
                {viewJob.isPublic && <Badge className="bg-green-100 text-green-700">Public</Badge>}
              </div>
              {viewJob.description && <div><p className="font-medium mb-1">Description</p><p className="text-muted-foreground whitespace-pre-wrap">{viewJob.description}</p></div>}
              {viewJob.requirements && <div><p className="font-medium mb-1">Requirements</p><p className="text-muted-foreground whitespace-pre-wrap">{viewJob.requirements}</p></div>}
              {viewJob.benefits && <div><p className="font-medium mb-1">Benefits</p><p className="text-muted-foreground whitespace-pre-wrap">{viewJob.benefits}</p></div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewJob(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
