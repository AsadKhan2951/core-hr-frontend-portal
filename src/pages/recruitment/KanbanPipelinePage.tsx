import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bot, AlertTriangle, User, Briefcase, ChevronRight, Star } from "lucide-react";

const STAGES = [
  { key: "applied", label: "Applied", color: "bg-slate-100 border-slate-300" },
  { key: "screening", label: "Screening", color: "bg-yellow-50 border-yellow-300" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-blue-50 border-blue-300" },
  { key: "test", label: "Test", color: "bg-purple-50 border-purple-300" },
  { key: "interview", label: "Interview", color: "bg-indigo-50 border-indigo-300" },
  { key: "evaluation", label: "Evaluation", color: "bg-orange-50 border-orange-300" },
  { key: "offer", label: "Offer", color: "bg-green-50 border-green-300" },
  { key: "hired", label: "Hired", color: "bg-emerald-50 border-emerald-300" },
  { key: "rejected", label: "Rejected", color: "bg-red-50 border-red-300" },
] as const;

type Stage = typeof STAGES[number]["key"];

export default function KanbanPipelinePage() {
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>(undefined);
  const [moveTarget, setMoveTarget] = useState<{ app: any; stage: Stage } | null>(null);
  const [moveNotes, setMoveNotes] = useState("");
  const [screeningApp, setScreeningApp] = useState<any>(null);
  const [screeningResult, setScreeningResult] = useState<any>(null);

  const { data: jobs = [] } = trpc.recruitment.jobs.list.useQuery({});
  const { data: kanban = {}, refetch } = trpc.recruitment.pipeline.getKanban.useQuery(
    { jobPostingId: selectedJobId },
    { enabled: true }
  );

  const moveMutation = trpc.recruitment.pipeline.moveStage.useMutation({
    onSuccess: () => { toast.success("Stage updated"); setMoveTarget(null); setMoveNotes(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const screenMutation = trpc.recruitment.ai.screenApplicant.useMutation({
    onSuccess: (data) => { setScreeningResult(data); toast.success("AI screening complete"); },
    onError: (e) => toast.error(e.message),
  });

  const handleMove = () => {
    if (!moveTarget) return;
    moveMutation.mutate({ applicationId: moveTarget.app.id, stage: moveTarget.stage, notes: moveNotes || undefined });
  };

  const stageMap = kanban as Record<string, any[]>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applicant Pipeline</h1>
          <p className="text-muted-foreground text-sm">Kanban view: Applied → Screening → Shortlisted → Test → Interview → Evaluation → Offer → Hired</p>
        </div>
        <Select value={selectedJobId?.toString() || "all"} onValueChange={v => setSelectedJobId(v === "all" ? undefined : parseInt(v))}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All Jobs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {(jobs as any[]).map((j: any) => (
              <SelectItem key={j.id} value={j.id.toString()}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* AI Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
        <Bot className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>AI Screening is advisory only.</strong> Scores and rankings are shown with full reasoning. A human reviews every score and can override. Age, gender, nationality, and similar attributes are never used as ranking factors.
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(stage => {
            const apps: any[] = stageMap[stage.key] || [];
            return (
              <div key={stage.key} className={`w-64 rounded-xl border-2 ${stage.color} flex flex-col`}>
                <div className="px-3 py-2 border-b border-current/10 flex items-center justify-between">
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">{apps.length}</Badge>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-32 max-h-[60vh] overflow-y-auto">
                  {apps.map((app: any) => (
                    <Card key={app.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{app.candidateName || `Candidate #${app.candidateId}`}</p>
                            <p className="text-xs text-muted-foreground">{app.jobTitle || `Job #${app.jobPostingId}`}</p>
                          </div>
                          {app.aiMatchScore != null && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <Bot className="w-3 h-3" />
                              <span className="font-medium">{app.aiMatchScore}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                            onClick={() => { setScreeningApp(app); setScreeningResult(null); }}>
                            <Bot className="w-3 h-3 mr-1" /> AI Screen
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                            onClick={() => setMoveTarget({ app, stage: stage.key })}>
                            <ChevronRight className="w-3 h-3 mr-1" /> Move
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {apps.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground opacity-60">
                      <User className="w-6 h-6 mx-auto mb-1 opacity-30" />
                      No candidates
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move Stage Dialog */}
      {moveTarget && (
        <Dialog open={!!moveTarget} onOpenChange={() => setMoveTarget(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Move to Stage</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Moving <strong>{moveTarget.app.candidateName || `Candidate #${moveTarget.app.candidateId}`}</strong> from <strong>{moveTarget.stage}</strong>
              </p>
              <div className="space-y-1">
                <Label>Move to Stage</Label>
                <Select value={moveTarget.stage} onValueChange={v => setMoveTarget(t => t ? { ...t, stage: v as Stage } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea value={moveNotes} onChange={e => setMoveNotes(e.target.value)} rows={3} placeholder="Add notes for this stage change..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMoveTarget(null)}>Cancel</Button>
              <Button onClick={handleMove} disabled={moveMutation.isPending}>
                {moveMutation.isPending ? "Moving..." : "Confirm Move"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Screening Dialog */}
      {screeningApp && (
        <Dialog open={!!screeningApp} onOpenChange={() => { setScreeningApp(null); setScreeningResult(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-500" /> AI Screening — {screeningApp.candidateName || `Candidate #${screeningApp.candidateId}`}
              </DialogTitle>
            </DialogHeader>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Advisory only.</strong> AI scores are shown with full reasoning. You review and decide — never automated. Protected characteristics (age, gender, nationality) are excluded from scoring.
              </div>
            </div>

            {screeningResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-blue-600">{screeningResult.overallScore}</p>
                    <p className="text-xs text-muted-foreground">Overall Score</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {screeningResult.dimensionScores && Object.entries(screeningResult.dimensionScores).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-sm">
                        <span className="w-32 text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${v}%` }} />
                        </div>
                        <span className="w-8 text-right font-medium">{v as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {screeningResult.strengths?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm text-green-700 mb-1">Strengths</p>
                    <ul className="text-sm space-y-1">{screeningResult.strengths.map((s: string, i: number) => <li key={i} className="flex items-start gap-2"><Star className="w-3 h-3 mt-1 text-green-500 shrink-0" />{s}</li>)}</ul>
                  </div>
                )}
                {screeningResult.gaps?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm text-orange-700 mb-1">Gaps</p>
                    <ul className="text-sm space-y-1">{screeningResult.gaps.map((g: string, i: number) => <li key={i} className="flex items-start gap-2"><AlertTriangle className="w-3 h-3 mt-1 text-orange-500 shrink-0" />{g}</li>)}</ul>
                  </div>
                )}
                {screeningResult.biasCheck && (
                  <div className={`border rounded-lg p-3 text-sm ${screeningResult.biasCheck.flagged ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
                    <p className="font-semibold flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" /> Bias Check
                    </p>
                    {screeningResult.biasCheck.flagged ? (
                      <>
                        <p className="font-medium">Potential bias detected — review carefully</p>
                        {screeningResult.biasCheck.concerns?.map((c: string, i: number) => <p key={i} className="text-xs mt-1">• {c}</p>)}
                      </>
                    ) : (
                      <p>No bias concerns detected in this screening.</p>
                    )}
                  </div>
                )}
                {screeningResult.recommendation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-blue-800 mb-1">AI Recommendation</p>
                    <p className="text-blue-700">{screeningResult.recommendation}</p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Bot className="w-3 h-3" /> This is a suggestion — you make the final decision.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Bot className="w-12 h-12 mx-auto text-blue-400" />
                <p className="text-muted-foreground">Run AI screening to get a detailed candidate analysis with scores, strengths, gaps, and bias check.</p>
                <Button onClick={() => screenMutation.mutate({ applicationId: screeningApp.id, jobPostingId: screeningApp.jobPostingId, candidateId: screeningApp.candidateId })}
                  disabled={screenMutation.isPending} className="gap-2">
                  <Bot className="w-4 h-4" /> {screenMutation.isPending ? "Screening..." : "Run AI Screening"}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setScreeningApp(null); setScreeningResult(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
