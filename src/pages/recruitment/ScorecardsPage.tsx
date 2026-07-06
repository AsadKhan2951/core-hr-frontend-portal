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
import { Star, Bot, Plus, ThumbsUp, ThumbsDown, Minus, AlertTriangle } from "lucide-react";

const RECOMMENDATION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  strong_hire: { label: "Strong Hire", color: "bg-emerald-100 text-emerald-800", icon: ThumbsUp },
  hire: { label: "Hire", color: "bg-green-100 text-green-800", icon: ThumbsUp },
  neutral: { label: "Neutral", color: "bg-gray-100 text-gray-800", icon: Minus },
  no_hire: { label: "No Hire", color: "bg-orange-100 text-orange-800", icon: ThumbsDown },
  strong_no_hire: { label: "Strong No Hire", color: "bg-red-100 text-red-800", icon: ThumbsDown },
};

export default function ScorecardsPage() {
  const [filterAppId, setFilterAppId] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [showSummary, setShowSummary] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [form, setForm] = useState({
    interviewScheduleId: "",
    applicationId: "",
    overallRating: "7",
    recommendation: "neutral" as const,
    strengths: "",
    weaknesses: "",
    notes: "",
  });

  const { data: scorecards = [], refetch } = trpc.recruitment.scorecards.list.useQuery({
    applicationId: filterAppId ? parseInt(filterAppId) : undefined,
  });

  const submitMutation = trpc.recruitment.scorecards.submit.useMutation({
    onSuccess: () => { toast.success("Scorecard submitted"); setShowSubmit(false); resetForm(); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const summarizeMutation = trpc.recruitment.ai.summarizeScorecard.useMutation({
    onSuccess: (data) => { setAiSummary(data); toast.success("AI summary ready"); },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => setForm({ interviewScheduleId: "", applicationId: "", overallRating: "7", recommendation: "neutral", strengths: "", weaknesses: "", notes: "" });

  const handleSubmit = () => {
    if (!form.interviewScheduleId || !form.applicationId) return toast.error("Interview schedule ID and application ID are required");
    submitMutation.mutate({
      interviewScheduleId: parseInt(form.interviewScheduleId),
      applicationId: parseInt(form.applicationId),
      overallRating: parseInt(form.overallRating),
      recommendation: form.recommendation,
      strengths: form.strengths || undefined,
      weaknesses: form.weaknesses || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Scorecards</h1>
          <p className="text-muted-foreground text-sm">Submit and review interview scorecards with AI summarization</p>
        </div>
        <Button onClick={() => setShowSubmit(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Submit Scorecard
        </Button>
      </div>

      {/* AI Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
        <Bot className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>AI Scorecard Summary is advisory only.</strong> AI synthesizes multiple interviewer scorecards into a narrative summary. The hiring decision is always made by a human.
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Filter by Application ID</Label>
          <Input type="number" value={filterAppId} onChange={e => setFilterAppId(e.target.value)} placeholder="App ID" className="w-40" />
        </div>
        {filterAppId && (
          <Button variant="outline" className="gap-2"
            onClick={() => { setShowSummary({ applicationId: parseInt(filterAppId) }); setAiSummary(null); }}>
            <Bot className="w-4 h-4" /> AI Summary for App #{filterAppId}
          </Button>
        )}
      </div>

      {/* Scorecards List */}
      <div className="space-y-3">
        {(scorecards as any[]).length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No scorecards yet. Submit a scorecard after each interview.</p>
            </CardContent>
          </Card>
        ) : (scorecards as any[]).map((sc: any) => {
          const rec = RECOMMENDATION_CONFIG[sc.recommendation] || RECOMMENDATION_CONFIG.neutral;
          const RecIcon = rec.icon;
          return (
            <Card key={sc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold">Application #{sc.applicationId}</p>
                      <Badge className={rec.color}>
                        <RecIcon className="w-3 h-3 mr-1" />{rec.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        {sc.overallRating}/10
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {sc.strengths && (
                        <div>
                          <p className="font-medium text-green-700 mb-1">Strengths</p>
                          <p className="text-muted-foreground">{sc.strengths}</p>
                        </div>
                      )}
                      {sc.weaknesses && (
                        <div>
                          <p className="font-medium text-orange-700 mb-1">Areas for Improvement</p>
                          <p className="text-muted-foreground">{sc.weaknesses}</p>
                        </div>
                      )}
                    </div>
                    {sc.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{sc.notes}"</p>}
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <p>Interviewer #{sc.interviewerId}</p>
                    <p>{new Date(sc.submittedAt || sc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Scorecard Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="w-5 h-5" />Submit Scorecard</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Interview Schedule ID *</Label><Input type="number" value={form.interviewScheduleId} onChange={e => setForm(f => ({ ...f, interviewScheduleId: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Application ID *</Label><Input type="number" value={form.applicationId} onChange={e => setForm(f => ({ ...f, applicationId: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Overall Rating (1–10)</Label>
                <Input type="number" min={1} max={10} value={form.overallRating} onChange={e => setForm(f => ({ ...f, overallRating: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Recommendation</Label>
                <Select value={form.recommendation} onValueChange={v => setForm(f => ({ ...f, recommendation: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RECOMMENDATION_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1"><Label>Strengths</Label><Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} placeholder="What stood out positively..." /></div>
              <div className="col-span-2 space-y-1"><Label>Areas for Improvement</Label><Textarea value={form.weaknesses} onChange={e => setForm(f => ({ ...f, weaknesses: e.target.value }))} rows={2} placeholder="Concerns or gaps..." /></div>
              <div className="col-span-2 space-y-1"><Label>Additional Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit Scorecard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Summary Dialog */}
      {showSummary && (
        <Dialog open={!!showSummary} onOpenChange={() => { setShowSummary(null); setAiSummary(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-500" /> AI Scorecard Summary — Application #{showSummary.applicationId}
              </DialogTitle>
            </DialogHeader>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <strong>Advisory only.</strong> This AI summary synthesizes interviewer scorecards. The hiring decision is yours — AI never decides.
              </div>
            </div>
            {aiSummary ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={aiSummary.overallSentiment === "positive" ? "bg-green-100 text-green-800" : aiSummary.overallSentiment === "negative" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>
                    {aiSummary.overallSentiment?.toUpperCase()}
                  </Badge>
                  <p className="text-sm font-medium">{aiSummary.consensusRecommendation}</p>
                </div>
                {aiSummary.narrativeSummary && (
                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
                    <p className="font-medium mb-2">Narrative Summary</p>
                    <p>{aiSummary.narrativeSummary}</p>
                  </div>
                )}
                {aiSummary.keyStrengths?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm text-green-700 mb-2">Key Strengths Across Interviewers</p>
                    <ul className="space-y-1">{aiSummary.keyStrengths.map((s: string, i: number) => <li key={i} className="text-sm flex items-start gap-2"><ThumbsUp className="w-3 h-3 mt-1 text-green-500 shrink-0" />{s}</li>)}</ul>
                  </div>
                )}
                {aiSummary.keyWeaknesses?.length > 0 && (
                  <div>
                    <p className="font-semibold text-sm text-orange-700 mb-2">Key Concerns Across Interviewers</p>
                    <ul className="space-y-1">{aiSummary.keyWeaknesses.map((w: string, i: number) => <li key={i} className="text-sm flex items-start gap-2"><ThumbsDown className="w-3 h-3 mt-1 text-orange-500 shrink-0" />{w}</li>)}</ul>
                  </div>
                )}
                {aiSummary.divergentOpinions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-yellow-800 mb-1">Divergent Opinions</p>
                    <p className="text-yellow-700">{aiSummary.divergentOpinions}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Bot className="w-3 h-3" /> {aiSummary.aiDisclaimer}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Bot className="w-12 h-12 mx-auto text-blue-400" />
                <p className="text-muted-foreground text-sm">AI will synthesize all interviewer scorecards for this application into a narrative summary.</p>
                <Button onClick={() => summarizeMutation.mutate({ applicationId: showSummary.applicationId })}
                  disabled={summarizeMutation.isPending} className="gap-2">
                  <Bot className="w-4 h-4" /> {summarizeMutation.isPending ? "Summarizing..." : "Generate AI Summary"}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowSummary(null); setAiSummary(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
