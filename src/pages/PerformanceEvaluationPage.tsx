import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Sparkles, AlertTriangle, CheckCircle2, Loader2, Save,
  User, Users, Star, MessageSquare, Target, ChevronLeft
} from "lucide-react";
import { Link } from "wouter";

const COMPANY_ID = 1;
const RATER_ID = 1; // In production, this comes from the logged-in user's employeeId

type RaterType = "self" | "manager" | "peer";

interface RatingValue {
  questionId: number;
  ratingValue?: string;
  ratingText?: string;
}

function StarRating({ value, onChange, max = 5 }: { value: number; onChange: (v: number) => void; max?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform active:scale-90"
        >
          <Star
            className={`w-6 h-6 transition-colors ${n <= (hover || value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
      {value > 0 && <span className="text-sm text-muted-foreground ml-1 self-center">{value}/{max}</span>}
    </div>
  );
}

export default function PerformanceEvaluationPage() {
  const params = useParams<{ participantId: string }>();
  const participantId = Number(params.participantId);
  const [activeTab, setActiveTab] = useState<RaterType>("self");
  const [ratings, setRatings] = useState<Record<number, RatingValue>>({});
  const [kpiActuals, setKpiActuals] = useState<Record<number, { actual: string; notes: string }>>({});

  // AI state
  const [managerNotes, setManagerNotes] = useState("");
  const [aiReviewText, setAiReviewText] = useState("");
  const [finalReviewText, setFinalReviewText] = useState("");
  const [biasResult, setBiasResult] = useState<{
    hasBias: boolean; biasScore: number;
    flags: Array<{ type: string; severity: string; excerpt: string; suggestion: string }>;
    overallAssessment: string;
  } | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [incrementPct, setIncrementPct] = useState<number>(0);

  const utils = trpc.useUtils();
  const { data: evalData, isLoading } = trpc.performance.evaluations.getForm.useQuery(
    { participantId, raterId: RATER_ID },
    { enabled: !!participantId && !isNaN(participantId) }
  );

  const submitRatingsMutation = trpc.performance.evaluations.submitRatings.useMutation({
    onSuccess: () => { toast.success("Ratings submitted"); utils.performance.evaluations.getForm.invalidate(); },
    onError: e => toast.error(e.message),
  });

  const saveKpisMutation = trpc.performance.evaluations.saveKpis.useMutation({
    onSuccess: () => toast.success("KPIs saved"),
    onError: e => toast.error(e.message),
  });

  const saveFinalReviewMutation = trpc.performance.evaluations.saveFinalReview.useMutation({
    onSuccess: () => toast.success("Final review saved"),
    onError: e => toast.error(e.message),
  });

  const writeReviewMutation = trpc.performance.ai.writeReview.useMutation({
    onSuccess: data => {
      setAiReviewText(data.reviewText);
      setFinalReviewText(data.reviewText);
      toast.success("AI review generated — review and edit before saving");
    },
    onError: e => toast.error("AI failed: " + e.message),
  });

  const detectBiasMutation = trpc.performance.ai.detectBias.useMutation({
    onSuccess: data => {
      setBiasResult(data);
      if (data.hasBias) {
        toast.warning(`Bias detected (score: ${data.biasScore}/100) — review the flagged phrases`);
      } else {
        toast.success("No significant bias detected");
      }
    },
    onError: e => toast.error("Bias check failed: " + e.message),
  });

  function setRating(questionId: number, field: "ratingValue" | "ratingText", value: string) {
    setRatings(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, [field]: value },
    }));
  }

  function handleSubmitRatings() {
    const ratingsList = Object.values(ratings);
    if (!ratingsList.length) { toast.error("No ratings to submit"); return; }
    submitRatingsMutation.mutate({
      participantId,
      raterId: RATER_ID,
      raterType: activeTab,
      ratings: ratingsList,
    });
  }

  function handleSaveKpis() {
    const participant = evalData?.participant;
    if (!participant?.kpis?.length) { toast.error("No KPIs to save"); return; }
    saveKpisMutation.mutate({
      participantId,
      kpis: participant.kpis.map(kpi => ({
        id: kpi.id,
        kpiDefinitionId: kpi.kpiDefinitionId ?? undefined,
        customTitle: kpi.customTitle ?? undefined,
        target: kpi.target ?? undefined,
        actual: kpiActuals[kpi.id]?.actual ?? kpi.actual ?? undefined,
        notes: kpiActuals[kpi.id]?.notes ?? kpi.notes ?? undefined,
        weight: Number(kpi.weight) ?? 1,
      })),
    });
  }

  function handleSaveFinalReview() {
    saveFinalReviewMutation.mutate({
      participantId,
      companyId: COMPANY_ID,
      managerNotes: managerNotes || undefined,
      finalReview: finalReviewText || undefined,
      finalScore: finalScore || undefined,
      incrementPercent: incrementPct || undefined,
    });
  }

  const participant = evalData?.participant;
  const kpis = participant?.kpis ?? [];

  // Calculate completion %
  const totalQuestions = 10; // placeholder — would come from template
  const answeredQuestions = Object.keys(ratings).length;
  const completionPct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  if (isNaN(participantId)) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <User className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No participant selected</p>
            <p className="text-sm text-muted-foreground">Navigate to a cycle and select a participant to evaluate</p>
            <Link href="/performance/cycles">
              <Button variant="outline" className="gap-2 mt-2">
                <ChevronLeft className="w-4 h-4" /> Go to Cycles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!participant) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <AlertTriangle className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">Participant not found</p>
            <Link href="/performance/cycles">
              <Button variant="outline" className="gap-2 mt-2">
                <ChevronLeft className="w-4 h-4" /> Back to Cycles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/performance/cycles">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Cycles
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">360° Evaluation</h1>
          <p className="text-sm text-muted-foreground">Participant #{participantId} · Status: <span className="capitalize font-medium">{participant.status.replace("_", " ")}</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Completion</p>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={completionPct} className="w-24 h-2" />
            <span className="text-sm font-medium">{completionPct}%</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as RaterType)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="self" className="gap-2"><User className="w-3 h-3" /> Self Review</TabsTrigger>
          <TabsTrigger value="manager" className="gap-2"><Users className="w-3 h-3" /> Manager Review</TabsTrigger>
          <TabsTrigger value="peer" className="gap-2"><Users className="w-3 h-3" /> Peer Review</TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2" onClick={() => setActiveTab("self")}><Target className="w-3 h-3" /> KPIs</TabsTrigger>
        </TabsList>

        {/* Self & Manager & Peer Review Tabs */}
        {(["self", "manager", "peer"] as RaterType[]).map(raterType => (
          <TabsContent key={raterType} value={raterType} className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base capitalize">{raterType} Review Questions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {raterType === "self" && "Reflect on your own performance during this review period"}
                  {raterType === "manager" && "Evaluate your direct report's performance"}
                  {raterType === "peer" && "Provide honest, constructive feedback for your colleague"}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sample questions — in production these come from the template */}
                {[
                  { id: 1, text: "Quality of work delivered", type: "rating" },
                  { id: 2, text: "Communication and collaboration", type: "rating" },
                  { id: 3, text: "Initiative and problem solving", type: "rating" },
                  { id: 4, text: "Meeting deadlines and commitments", type: "rating" },
                  { id: 5, text: "Key achievements this period", type: "text" },
                  { id: 6, text: "Areas for development", type: "text" },
                ].map(q => (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-sm font-medium">{q.text}</Label>
                    {q.type === "rating" ? (
                      <StarRating
                        value={Number(ratings[q.id]?.ratingValue ?? 0)}
                        onChange={v => setRating(q.id, "ratingValue", String(v))}
                      />
                    ) : (
                      <Textarea
                        value={ratings[q.id]?.ratingText ?? ""}
                        onChange={e => setRating(q.id, "ratingText", e.target.value)}
                        placeholder="Share your thoughts..."
                        rows={3}
                      />
                    )}
                  </div>
                ))}

                <Button onClick={handleSubmitRatings} disabled={submitRatingsMutation.isPending} className="gap-2">
                  {submitRatingsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Submit {raterType.charAt(0).toUpperCase() + raterType.slice(1)} Review
                </Button>
              </CardContent>
            </Card>

            {/* Manager-only: AI Review Writer */}
            {raterType === "manager" && (
              <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    AI Review Writer
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Enter rough notes and let AI transform them into a balanced, professional review. You must review and edit before saving.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Your Rough Notes</Label>
                    <Textarea
                      value={managerNotes}
                      onChange={e => setManagerNotes(e.target.value)}
                      placeholder="e.g. 'Good year overall, hit most targets, sometimes misses deadlines, strong team player, needs to improve presentation skills...'"
                      rows={4}
                    />
                  </div>
                  <Button
                    onClick={() => writeReviewMutation.mutate({ managerNotes, employeeName: `Employee #${participant.employeeId}` })}
                    disabled={!managerNotes.trim() || writeReviewMutation.isPending}
                    variant="outline"
                    className="gap-2"
                  >
                    {writeReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-500" />}
                    {writeReviewMutation.isPending ? "Generating..." : "Generate Professional Review"}
                  </Button>

                  {aiReviewText && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label>AI-Generated Review (editable)</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => detectBiasMutation.mutate({ reviewText: finalReviewText, employeeName: `Employee #${participant.employeeId}` })}
                            disabled={detectBiasMutation.isPending}
                            className="gap-1 text-xs"
                          >
                            {detectBiasMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                            Check for Bias
                          </Button>
                        </div>
                        <Textarea
                          value={finalReviewText}
                          onChange={e => setFinalReviewText(e.target.value)}
                          rows={6}
                          className="font-medium"
                        />
                        <p className="text-xs text-muted-foreground">This text is fully editable. The AI suggestion is a starting point — your final version will be saved.</p>
                      </div>

                      {/* Bias Detection Results */}
                      {biasResult && (
                        <Card className={`border ${biasResult.hasBias ? "border-orange-300 bg-orange-50/50" : "border-green-300 bg-green-50/50"}`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              {biasResult.hasBias
                                ? <AlertTriangle className="w-4 h-4 text-orange-500" />
                                : <CheckCircle2 className="w-4 h-4 text-green-500" />
                              }
                              <span className="font-medium text-sm">
                                {biasResult.hasBias ? `Bias Detected (Score: ${biasResult.biasScore}/100)` : "No Significant Bias"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{biasResult.overallAssessment}</p>
                            {biasResult.flags.map((flag, i) => (
                              <div key={i} className="border rounded-md p-3 bg-background space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${flag.severity === "high" ? "text-red-600" : flag.severity === "medium" ? "text-orange-600" : "text-yellow-600"}`}>
                                    {flag.severity} · {flag.type.replace("_", " ")}
                                  </Badge>
                                </div>
                                <p className="text-xs"><span className="font-medium">Flagged:</span> "{flag.excerpt}"</p>
                                <p className="text-xs text-muted-foreground"><span className="font-medium">Suggestion:</span> {flag.suggestion}</p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Final Score (1–5)</Label>
                          <StarRating value={finalScore} onChange={setFinalScore} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Recommended Increment %</Label>
                          <Input type="number" min={0} max={100} step={0.5} value={incrementPct} onChange={e => setIncrementPct(Number(e.target.value))} />
                        </div>
                      </div>

                      <Button onClick={handleSaveFinalReview} disabled={saveFinalReviewMutation.isPending} className="gap-2">
                        {saveFinalReviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Final Review
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" /> KPI Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground">Update actual values against targets for this review period</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No KPIs assigned to this participant</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span className="col-span-2">KPI</span>
                    <span>Target</span>
                    <span>Actual</span>
                    <span>Notes</span>
                  </div>
                  {kpis.map(kpi => (
                    <div key={kpi.id} className="grid grid-cols-5 gap-2 items-start border rounded-md p-3">
                      <div className="col-span-2">
                        <p className="text-sm font-medium">{kpi.customTitle ?? `KPI #${kpi.kpiDefinitionId}`}</p>
                        <p className="text-xs text-muted-foreground">Weight: {kpi.weight}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">{kpi.target ?? "—"}</div>
                      <Input
                        className="h-8 text-sm"
                        value={kpiActuals[kpi.id]?.actual ?? kpi.actual ?? ""}
                        onChange={e => setKpiActuals(prev => ({ ...prev, [kpi.id]: { ...prev[kpi.id], actual: e.target.value } }))}
                        placeholder="Actual"
                      />
                      <Input
                        className="h-8 text-sm"
                        value={kpiActuals[kpi.id]?.notes ?? kpi.notes ?? ""}
                        onChange={e => setKpiActuals(prev => ({ ...prev, [kpi.id]: { ...prev[kpi.id], notes: e.target.value } }))}
                        placeholder="Notes"
                      />
                    </div>
                  ))}
                  <Button onClick={handleSaveKpis} disabled={saveKpisMutation.isPending} className="gap-2">
                    {saveKpisMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save KPI Progress
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
