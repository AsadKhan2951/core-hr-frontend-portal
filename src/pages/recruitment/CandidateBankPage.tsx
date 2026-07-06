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
import { Search, UserPlus, Bot, FileText, Briefcase, Mail, Phone, Star, AlertTriangle } from "lucide-react";

export default function CandidateBankPage() {
  const [filters, setFilters] = useState({ search: "", source: "", status: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [showAiParse, setShowAiParse] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [parsedData, setParsedData] = useState<any>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    currentTitle: "", currentCompany: "", totalExperience: "",
    skills: "", linkedinUrl: "", source: "manual",
  });

  const { data: candidates = [], refetch } = trpc.recruitment.candidates.list.useQuery(filters);

  const createMutation = trpc.recruitment.candidates.create.useMutation({
    onSuccess: () => { toast.success("Candidate added"); setShowAdd(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const parseResumeMutation = trpc.recruitment.ai.parseResume.useMutation({
    onSuccess: (data) => { setParsedData(data); toast.success("Resume parsed by AI"); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({ firstName: "", lastName: "", email: "", phone: "", currentTitle: "", currentCompany: "", totalExperience: "", skills: "", linkedinUrl: "", source: "manual" });

  const handleCreate = () => {
    if (!form.firstName || !form.lastName || !form.email) return toast.error("First name, last name, and email are required");
    createMutation.mutate({
      firstName: form.firstName, lastName: form.lastName, email: form.email,
      phone: form.phone || undefined, currentTitle: form.currentTitle || undefined,
      currentCompany: form.currentCompany || undefined, totalExperience: form.totalExperience || undefined,
      skills: form.skills ? form.skills.split(",").map(s => s.trim()) : undefined,
      linkedinUrl: form.linkedinUrl || undefined, source: form.source as any,
    });
  };

  const handleApplyParsed = () => {
    if (!parsedData) return;
    setForm(f => ({
      ...f,
      firstName: parsedData.firstName || f.firstName,
      lastName: parsedData.lastName || f.lastName,
      email: parsedData.email || f.email,
      phone: parsedData.phone || f.phone,
      currentTitle: parsedData.currentTitle || f.currentTitle,
      currentCompany: parsedData.currentCompany || f.currentCompany,
      totalExperience: parsedData.totalExperience || f.totalExperience,
      skills: parsedData.skills?.join(", ") || f.skills,
    }));
    setShowAiParse(false);
    setParsedData(null);
    setResumeText("");
    toast.success("Parsed data applied to form");
  };

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    hired: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    blacklisted: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Candidate Bank</h1>
          <p className="text-muted-foreground text-sm">Resume bank with strong filters and AI-assisted parsing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAiParse(true)} className="gap-2">
            <Bot className="w-4 h-4" /> AI Resume Parse
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <UserPlus className="w-4 h-4" /> Add Candidate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, email, skills..." value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <Select value={filters.source || "all"} onValueChange={v => setFilters(f => ({ ...f, source: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="career_portal">Career Portal</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(candidates as any[]).length === 0 ? (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No candidates found. Add candidates or post jobs to start building your talent pool.</p>
          </div>
        ) : (candidates as any[]).map((c: any) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCandidate(c)}>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{c.firstName} {c.lastName}</p>
                  <p className="text-sm text-muted-foreground">{c.currentTitle || "—"}</p>
                </div>
                <Badge className={statusColor[c.status] || "bg-gray-100 text-gray-800"}>{c.status}</Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {c.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{c.phone}</div>}
                {c.currentCompany && <div className="flex items-center gap-2"><Briefcase className="w-3 h-3" />{c.currentCompany}</div>}
              </div>
              {c.skills && c.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.skills.slice(0, 4).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                  {c.skills.length > 4 && <Badge variant="outline" className="text-xs">+{c.skills.length - 4}</Badge>}
                </div>
              )}
              {c.totalExperience && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3" /> {c.totalExperience} experience
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Candidate Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Last Name *</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Current Title</Label><Input value={form.currentTitle} onChange={e => setForm(f => ({ ...f, currentTitle: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Current Company</Label><Input value={form.currentCompany} onChange={e => setForm(f => ({ ...f, currentCompany: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Total Experience</Label><Input value={form.totalExperience} onChange={e => setForm(f => ({ ...f, totalExperience: e.target.value }))} placeholder="e.g. 5 years" /></div>
              <div className="col-span-2 space-y-1"><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="React, Node.js, SQL" /></div>
              <div className="col-span-2 space-y-1"><Label>LinkedIn URL</Label><Input value={form.linkedinUrl} onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="career_portal">Career Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Candidate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Resume Parse Dialog */}
      <Dialog open={showAiParse} onOpenChange={setShowAiParse}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" /> AI Resume Parser
            </DialogTitle>
          </DialogHeader>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
            <Bot className="w-4 h-4 mt-0.5 shrink-0" />
            AI will extract candidate data from the resume text. Review and edit before saving — AI suggestions only.
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Paste Resume Text</Label>
              <Textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={8} placeholder="Paste the full resume text here..." />
            </div>
            {parsedData && (
              <div className="border rounded-lg p-4 space-y-2 bg-green-50">
                <p className="font-medium text-sm text-green-800 flex items-center gap-2"><Bot className="w-4 h-4" />Parsed Data (review before applying)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(parsedData).map(([k, v]) => v ? (
                    <div key={k}><span className="font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span> {Array.isArray(v) ? (v as string[]).join(", ") : String(v)}</div>
                  ) : null)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiParse(false)}>Cancel</Button>
            {parsedData ? (
              <Button onClick={handleApplyParsed} className="gap-2">Apply to Form</Button>
            ) : (
              <Button onClick={() => parseResumeMutation.mutate({ resumeText })} disabled={!resumeText || parseResumeMutation.isPending} className="gap-2">
                <Bot className="w-4 h-4" /> {parseResumeMutation.isPending ? "Parsing..." : "Parse Resume"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate Detail Dialog */}
      {selectedCandidate && (
        <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedCandidate.firstName} {selectedCandidate.lastName}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Email:</span> {selectedCandidate.email}</div>
                <div><span className="font-medium">Phone:</span> {selectedCandidate.phone || "—"}</div>
                <div><span className="font-medium">Title:</span> {selectedCandidate.currentTitle || "—"}</div>
                <div><span className="font-medium">Company:</span> {selectedCandidate.currentCompany || "—"}</div>
                <div><span className="font-medium">Experience:</span> {selectedCandidate.totalExperience || "—"}</div>
                <div><span className="font-medium">Source:</span> {selectedCandidate.source || "—"}</div>
              </div>
              {selectedCandidate.skills?.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-1">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                </div>
              )}
              {selectedCandidate.aiScreeningScore != null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-sm text-blue-800 flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4" /> AI Screening Score (Advisory)
                  </p>
                  <p className="text-2xl font-bold text-blue-700">{selectedCandidate.aiScreeningScore}/100</p>
                  {selectedCandidate.aiScreeningNotes && <p className="text-xs text-blue-700 mt-1">{selectedCandidate.aiScreeningNotes}</p>}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Human review required before any decision
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCandidate(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
