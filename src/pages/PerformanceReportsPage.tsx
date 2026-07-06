import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle,
  Trophy, Users, BarChart3, Star, ChevronLeft, RefreshCw
} from "lucide-react";
import { Link } from "wouter";

const COMPANY_ID = 1;

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 4.5 ? "bg-green-100 text-green-700"
    : score >= 3.5 ? "bg-blue-100 text-blue-700"
    : score >= 2.5 ? "bg-yellow-100 text-yellow-700"
    : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Star className="w-3 h-3" /> {score.toFixed(2)}
    </span>
  );
}

export default function PerformanceReportsPage() {
  const params = useParams<{ cycleId: string }>();
  const urlCycleId = params.cycleId ? Number(params.cycleId) : undefined;
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(urlCycleId);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);

  const { data: cycles = [] } = trpc.performance.cycles.list.useQuery({ companyId: COMPANY_ID });

  // Use the first cycle if none selected yet
  const effectiveCycleId = selectedCycleId ?? cycles[0]?.id;

  const { data: leaderboard = [], isLoading: lbLoading } = trpc.performance.reports.leaderboard.useQuery(
    { cycleId: effectiveCycleId!, companyId: COMPANY_ID },
    { enabled: !!effectiveCycleId }
  );

  const { data: stats, isLoading: statsLoading } = trpc.performance.reports.summaryStats.useQuery(
    { cycleId: effectiveCycleId! },
    { enabled: !!effectiveCycleId }
  );

  const aiSummaryMutation = trpc.performance.ai.cycleSummary.useMutation({
    onSuccess: data => {
      setAiSummaryText(data.summaryText);
      toast.success("AI cycle summary generated");
    },
    onError: e => toast.error("AI summary failed: " + e.message),
  });

  const selectedCycle = cycles.find(c => c.id === effectiveCycleId);
  const isLoading = lbLoading || statsLoading;

  const topPerformers = leaderboard.filter(p => (p.finalScore ?? 0) >= 4.5);
  const flightRisks = leaderboard.filter(p => p.finalScore !== null && (p.finalScore ?? 5) < 2.5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/performance/cycles">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Cycles
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Performance Reports</h1>
          <p className="text-sm text-muted-foreground">Cycle analytics, top performers, and flight risk signals</p>
        </div>
        <div className="flex gap-2 items-center">
          {cycles.length > 0 && (
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={effectiveCycleId ?? ""}
              onChange={e => setSelectedCycleId(Number(e.target.value))}
            >
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <Button
            variant="outline"
            onClick={() => {
              if (!effectiveCycleId || !selectedCycle) { toast.error("Select a cycle first"); return; }
              aiSummaryMutation.mutate({
                cycleId: effectiveCycleId,
                companyId: COMPANY_ID,
                cycleName: selectedCycle.name,
              });
            }}
            disabled={aiSummaryMutation.isPending}
            className="gap-2"
          >
            {aiSummaryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-500" />}
            AI Summary
          </Button>
        </div>
      </div>

      {!effectiveCycleId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 gap-3">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No cycles available</p>
            <Link href="/performance/cycles">
              <Button variant="outline" className="gap-1 mt-2">
                <ChevronLeft className="w-4 h-4" /> Create a Cycle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Participants", value: stats?.total ?? 0, icon: <Users className="w-5 h-5 text-blue-500" />, sub: "enrolled" },
              { label: "Completed", value: stats?.completed ?? 0, icon: <BarChart3 className="w-5 h-5 text-green-500" />, sub: `${stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0}% rate` },
              { label: "Avg Score", value: stats?.avgScore ? stats.avgScore.toFixed(2) : "—", icon: <Star className="w-5 h-5 text-yellow-500" />, sub: "out of 5" },
              { label: "Flight Risks", value: stats?.flightRisks ?? 0, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, sub: "flagged" },
            ].map(stat => (
              <Card key={stat.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  {stat.icon}
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Summary */}
          {aiSummaryText && (
            <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  AI Cycle Summary — {selectedCycle?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiSummaryText}</p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="top">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="top" className="gap-2"><Trophy className="w-3 h-3" /> Top Performers ({topPerformers.length})</TabsTrigger>
              <TabsTrigger value="risks" className="gap-2"><AlertTriangle className="w-3 h-3" /> Flight Risks ({flightRisks.length})</TabsTrigger>
              <TabsTrigger value="all" className="gap-2"><Users className="w-3 h-3" /> All ({leaderboard.length})</TabsTrigger>
            </TabsList>

            {/* Top Performers */}
            <TabsContent value="top" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topPerformers.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">No completed evaluations with score ≥ 4.5 yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topPerformers.map((p, i) => (
                        <div key={p.participantId} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.employeeName}</p>
                            <p className="text-xs text-muted-foreground">Participant #{p.participantId}</p>
                          </div>
                          <ScoreBadge score={p.finalScore ?? 0} />
                          {p.incrementPercent !== null && p.incrementPercent !== undefined && (
                            <Badge variant="outline" className="text-xs text-green-600">+{p.incrementPercent}% increment</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flight Risks */}
            <TabsContent value="risks" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Flight Risk Signals
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Employees with final score below 2.5 — may indicate engagement or attrition risk</p>
                </CardHeader>
                <CardContent>
                  {flightRisks.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <TrendingUp className="w-8 h-8 text-green-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">No flight risks detected in this cycle</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flightRisks.map(p => (
                        <div key={p.participantId} className="flex items-center gap-4 p-3 rounded-lg border border-red-100 hover:bg-red-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.employeeName}</p>
                            <p className="text-xs text-muted-foreground">Participant #{p.participantId}</p>
                          </div>
                          {p.finalScore !== null && p.finalScore !== undefined && (
                            <ScoreBadge score={p.finalScore} />
                          )}
                          <Badge variant="outline" className="text-xs text-red-600">Needs Attention</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Participants */}
            <TabsContent value="all" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">All Participants — Ranked</CardTitle>
                </CardHeader>
                <CardContent>
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No completed evaluations yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboard.map((p, i) => (
                        <div key={p.participantId} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{p.employeeName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{p.status.replace("_", " ")}</p>
                          </div>
                          {p.selfScore !== null && p.selfScore !== undefined && (
                            <span className="text-xs text-muted-foreground">Self: {p.selfScore.toFixed(1)}</span>
                          )}
                          {p.managerScore !== null && p.managerScore !== undefined && (
                            <span className="text-xs text-muted-foreground">Mgr: {p.managerScore.toFixed(1)}</span>
                          )}
                          {p.finalScore !== null && p.finalScore !== undefined ? (
                            <ScoreBadge score={p.finalScore} />
                          ) : (
                            <Badge variant="secondary" className="text-xs">Pending</Badge>
                          )}
                          {p.incrementPercent !== null && p.incrementPercent !== undefined && (
                            <Badge variant="outline" className="text-xs text-green-600">+{p.incrementPercent}%</Badge>
                          )}
                          <Link href={`/performance/evaluate/${p.participantId}`}>
                            <Button size="sm" variant="outline" className="text-xs">View</Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
