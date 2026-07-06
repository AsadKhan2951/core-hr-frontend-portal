import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Clock, Video, Phone, Users, MapPin, Bot, Plus, CheckCircle } from "lucide-react";

const INTERVIEW_TYPES = [
  { value: "phone", label: "Phone Screen", icon: Phone },
  { value: "video", label: "Video Call", icon: Video },
  { value: "in_person", label: "In Person", icon: MapPin },
  { value: "technical", label: "Technical", icon: Users },
  { value: "panel", label: "Panel", icon: Users },
] as const;

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  rescheduled: "bg-yellow-100 text-yellow-800",
  no_show: "bg-gray-100 text-gray-800",
};

export default function InterviewSchedulingPage() {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showQuestions, setShowQuestions] = useState<any>(null);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({
    applicationId: "",
    interviewerId: "",
    scheduledAt: "",
    duration: "60",
    type: "video" as const,
    location: "",
    meetingLink: "",
    notes: "",
  });

  const { data: interviews = [], refetch } = trpc.recruitment.interviews.list.useQuery({
    status: filterStatus || undefined,
  });

  const scheduleMutation = trpc.recruitment.interviews.schedule.useMutation({
    onSuccess: () => { toast.success("Interview scheduled"); setShowSchedule(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.recruitment.applications.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (err: any) => toast.error(err.message),
  });

  const questionsMutation = trpc.recruitment.ai.suggestInterviewQuestions.useMutation({
    onSuccess: (data) => {
      const all = [
        ...(data.technical || []).map((q: any) => q.question),
        ...(data.behavioral || []).map((q: any) => q.question),
        ...(data.situational || []).map((q: any) => q.question),
      ];
      setAiQuestions(all);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({ applicationId: "", interviewerId: "", scheduledAt: "", duration: "60", type: "video", location: "", meetingLink: "", notes: "" });

  const handleSchedule = () => {
    if (!form.applicationId || !form.interviewerId || !form.scheduledAt) {
      return toast.error("Application, interviewer, and scheduled time are required");
    }
    scheduleMutation.mutate({
      applicationId: parseInt(form.applicationId),
      interviewerId: parseInt(form.interviewerId),
      scheduledAt: new Date(form.scheduledAt),
      duration: parseInt(form.duration),
      type: form.type,
      location: form.location || undefined,
      meetingLink: form.meetingLink || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Scheduling</h1>
          <p className="text-muted-foreground text-sm">Schedule and manage candidate interviews with AI-suggested questions</p>
        </div>
        <Button onClick={() => setShowSchedule(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Schedule Interview
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterStatus || "all"} onValueChange={v => setFilterStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Interview List */}
      <div className="space-y-3">
        {(interviews as any[]).length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No interviews scheduled yet.</p>
            </CardContent>
          </Card>
        ) : (interviews as any[]).map((iv: any) => {
          const TypeIcon = INTERVIEW_TYPES.find(t => t.value === iv.type)?.icon || Video;
          return (
            <Card key={iv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <TypeIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Application #{iv.applicationId}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(iv.scheduledAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(iv.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{iv.duration} min</span>
                      </div>
                      {iv.meetingLink && (
                        <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                          Join Meeting
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[iv.status] || "bg-gray-100 text-gray-800"}>{iv.status}</Badge>
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setShowQuestions(iv); setAiQuestions([]); }}>
                      <Bot className="w-3 h-3" /> AI Questions
                    </Button>
                    {iv.status === "scheduled" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs"
                        onClick={() => updateStatusMutation.mutate({ id: iv.applicationId, status: "hired" })}>  {/* Mark as completed via application status */}
                        <CheckCircle className="w-3 h-3" /> Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Schedule Interview Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Application ID *</Label><Input type="number" value={form.applicationId} onChange={e => setForm(f => ({ ...f, applicationId: e.target.value }))} placeholder="App ID" /></div>
              <div className="space-y-1"><Label>Interviewer ID *</Label><Input type="number" value={form.interviewerId} onChange={e => setForm(f => ({ ...f, interviewerId: e.target.value }))} placeholder="User ID" /></div>
              <div className="col-span-2 space-y-1"><Label>Scheduled Date & Time *</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTERVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} /></div>
              <div className="col-span-2 space-y-1"><Label>Meeting Link</Label><Input value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/..." /></div>
              <div className="col-span-2 space-y-1"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Office / Room" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={scheduleMutation.isPending}>
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule Interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Interview Questions Dialog */}
      {showQuestions && (
        <Dialog open={!!showQuestions} onOpenChange={() => { setShowQuestions(null); setAiQuestions([]); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-500" /> AI Interview Question Suggestions
              </DialogTitle>
            </DialogHeader>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
              <Bot className="w-4 h-4 mt-0.5 shrink-0" />
              AI-suggested questions based on the role and candidate profile. Use as a starting point — adapt to your interview style.
            </div>
            {aiQuestions.length > 0 ? (
              <div className="space-y-2">
                {aiQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <p className="text-sm">{q}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Bot className="w-12 h-12 mx-auto text-blue-400" />
                <p className="text-muted-foreground text-sm">Generate AI-suggested interview questions tailored to this role and candidate.</p>
                <Button onClick={() => questionsMutation.mutate({ jobTitle: showQuestions.jobTitle || "the role", interviewType: showQuestions.type === "technical" ? "technical" : showQuestions.type === "behavioral" ? "behavioral" : "mixed" })}
                  disabled={questionsMutation.isPending} className="gap-2">
                  <Bot className="w-4 h-4" /> {questionsMutation.isPending ? "Generating..." : "Generate Questions"}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowQuestions(null); setAiQuestions([]); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
