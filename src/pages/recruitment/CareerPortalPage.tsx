import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, MapPin, Clock, Search, Send, Building2, ChevronRight } from "lucide-react";

export default function CareerPortalPage() {
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    currentTitle: "", totalExperience: "", coverLetter: "", resumeUrl: "",
  });

  const { data: jobs = [] } = trpc.recruitment.careerPortal.listPublicJobs.useQuery({});

  const applyMutation = trpc.recruitment.careerPortal.applyPublic.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Application submitted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (jobs as any[]).filter((j: any) =>
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = () => {
    if (!form.firstName || !form.lastName || !form.email) {
      return toast.error("First name, last name, and email are required");
    }
    applyMutation.mutate({
      jobPostingId: selectedJob.id,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      currentTitle: form.currentTitle || undefined,
      totalExperience: form.totalExperience || undefined,
      coverLetter: form.coverLetter || undefined,
      resumeUrl: form.resumeUrl || undefined,
    });
  };

  const openJob = (job: any) => {
    setSelectedJob(job);
    setApplying(false);
    setSubmitted(false);
    setForm({ firstName: "", lastName: "", email: "", phone: "", currentTitle: "", totalExperience: "", coverLetter: "", resumeUrl: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">CORE HR</p>
              <p className="text-blue-300 text-xs">Careers</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            {filtered.length} Open Position{filtered.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Join Our Team</h1>
        <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
          We are building the future of work. Find your next opportunity and grow with us.
        </p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs by title or location..."
            className="pl-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12 rounded-xl"
          />
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No open positions match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((job: any) => (
              <Card key={job.id}
                className="bg-white/8 border-white/10 hover:bg-white/12 hover:border-blue-400/40 transition-all cursor-pointer group"
                onClick={() => openJob(job)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-base group-hover:text-blue-300 transition-colors">{job.title}</CardTitle>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors mt-0.5 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
                    {job.type && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.type.replace("_", " ")}</span>}
                  </div>
                  {job.salaryMin && (
                    <p className="text-sm text-blue-300 font-medium">
                      {job.currency} {job.salaryMin} - {job.salaryMax ?? "+"} / month
                    </p>
                  )}
                  {job.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{job.description}</p>
                  )}
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-2"
                    onClick={e => { e.stopPropagation(); openJob(job); setApplying(true); }}>
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Job Detail / Apply Dialog */}
      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-500" />
                {selectedJob.title}
              </DialogTitle>
            </DialogHeader>

            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Application Submitted!</h3>
                <p className="text-muted-foreground">Thank you for applying. We will review your application and be in touch shortly.</p>
                <Button onClick={() => setSelectedJob(null)}>Browse More Jobs</Button>
              </div>
            ) : applying ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Applying for: <strong>{selectedJob.title}</strong>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>First Name *</Label>
                    <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Last Name *</Label>
                    <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Current Title</Label>
                    <Input value={form.currentTitle} onChange={e => setForm(f => ({ ...f, currentTitle: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Total Experience</Label>
                    <Input value={form.totalExperience} onChange={e => setForm(f => ({ ...f, totalExperience: e.target.value }))} placeholder="e.g. 5 years" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Resume URL</Label>
                    <Input value={form.resumeUrl} onChange={e => setForm(f => ({ ...f, resumeUrl: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Cover Letter</Label>
                    <Textarea value={form.coverLetter} onChange={e => setForm(f => ({ ...f, coverLetter: e.target.value }))} rows={4} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setApplying(false)}>Back</Button>
                  <Button onClick={handleApply} disabled={applyMutation.isPending} className="gap-2">
                    <Send className="w-4 h-4" />
                    {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {selectedJob.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{selectedJob.location}</Badge>}
                  {selectedJob.type && <Badge variant="outline">{selectedJob.type.replace("_", " ")}</Badge>}
                  {selectedJob.salaryMin && <Badge variant="outline" className="text-green-700 border-green-300">{selectedJob.currency} {selectedJob.salaryMin}-{selectedJob.salaryMax ?? "+"}</Badge>}
                </div>
                {selectedJob.description && (
                  <div>
                    <h4 className="font-semibold mb-1">About the Role</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedJob.description}</p>
                  </div>
                )}
                {selectedJob.requirements && (
                  <div>
                    <h4 className="font-semibold mb-1">Requirements</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedJob.requirements}</p>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedJob(null)}>Close</Button>
                  <Button onClick={() => setApplying(true)} className="gap-2">
                    <Send className="w-4 h-4" /> Apply Now
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
