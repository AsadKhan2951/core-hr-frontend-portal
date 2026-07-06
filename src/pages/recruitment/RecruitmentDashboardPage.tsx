import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Clock, TrendingUp, CheckCircle, XCircle, Send, BarChart3 } from "lucide-react";

export default function RecruitmentDashboardPage() {
  const { data: pipelineReport = [] } = trpc.recruitment.reports.pipeline.useQuery({});
  const { data: timeToHire = [] } = trpc.recruitment.reports.timeToHire.useQuery();
  const { data: sourceAnalysis = [] } = trpc.recruitment.reports.sourceAnalysis.useQuery();
  const { data: offerAcceptance } = trpc.recruitment.reports.offerAcceptance.useQuery();
  const { data: jobs = [] } = trpc.recruitment.jobs.list.useQuery({ status: "published" });
  const { data: allJobs = [] } = trpc.recruitment.jobs.list.useQuery({});

  const totalApplicants = (pipelineReport as any[]).reduce((sum, p) => sum + (p.count || 0), 0);
  const hiredCount = (pipelineReport as any[]).find((p: any) => p.stage === "hired")?.count || 0;
  const avgTimeToHire = (timeToHire as any[]).length > 0
    ? Math.round((timeToHire as any[]).reduce((sum, t) => sum + (t.avgDays || 0), 0) / (timeToHire as any[]).length)
    : 0;

  const statCards = [
    { label: "Open Positions",   value: (jobs as any[]).length, icon: Briefcase,    iconColor: "#0A8F86",  tileBg: "rgba(15,180,168,.12)" },
    { label: "Total Applicants", value: totalApplicants,        icon: Users,         iconColor: "#5B3FCC",  tileBg: "rgba(123,92,255,.12)" },
    { label: "Hired This Period",value: hiredCount,             icon: CheckCircle,   iconColor: "#0F8A5A",  tileBg: "rgba(22,178,122,.12)" },
    { label: "Avg Days to Hire", value: avgTimeToHire || "—",  icon: Clock,         iconColor: "#A06B00",  tileBg: "rgba(244,169,31,.12)" },
  ];

  // Brand gradient funnel bars
  const STAGE_FILL: Record<string, string> = {
    applied:    "rgba(122,136,150,.25)",
    screening:  "rgba(244,169,31,.35)",
    shortlisted:"rgba(79,154,179,.50)",
    test:       "rgba(123,92,255,.40)",
    interview:  "rgba(60,143,208,.50)",
    evaluation: "rgba(244,169,31,.50)",
    offer:      "rgba(15,180,168,.60)",
    hired:      "#0FB4A8",
    rejected:   "rgba(239,74,90,.35)",
  };

  const maxCount = Math.max(...(pipelineReport as any[]).map((p: any) => p.count || 0), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recruitment Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your hiring pipeline and key metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: s.tileBg }}>
                  <s.icon className="w-5 h-5" style={{ color: s.iconColor }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Pipeline Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(pipelineReport as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pipeline data yet</p>
            ) : (pipelineReport as any[]).map((stage: any) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="w-24 text-xs text-muted-foreground capitalize shrink-0">{stage.stage}</span>
                <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{ width: `${Math.max(4, (stage.count / maxCount) * 100)}%`, background: STAGE_FILL[stage.stage] || "rgba(122,136,150,.25)" }}
                  />
                </div>
                <span className="w-8 text-xs font-medium text-right">{stage.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Source Analysis */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Application Sources</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(sourceAnalysis as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No source data yet</p>
            ) : (sourceAnalysis as any[]).map((s: any) => (
              <div key={s.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#0FB4A8" }} />
                  <span className="text-sm capitalize">{s.source || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.count}</span>
                  <Badge variant="secondary" className="text-xs">{s.hireRate || 0}% hire rate</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Offer Acceptance */}
        {offerAcceptance && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4" />Offer Acceptance</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{(offerAcceptance as any).acceptanceRate}%</p>
                  <p className="text-xs text-muted-foreground">Acceptance Rate</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><span>Accepted: {(offerAcceptance as any).accepted}</span></div>
                  <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /><span>Rejected: {(offerAcceptance as any).rejected}</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /><span>Pending: {(offerAcceptance as any).pending}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time to Hire by Job */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Time to Hire by Job</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(timeToHire as any[]).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hire data yet</p>
            ) : (timeToHire as any[]).slice(0, 6).map((t: any) => (
              <div key={t.jobPostingId} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-48">{t.jobTitle || `Job #${t.jobPostingId}`}</span>
                <span className="font-medium shrink-0">{t.avgDays} days avg</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4" />Active Job Postings</CardTitle></CardHeader>
        <CardContent>
          {(jobs as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active job postings</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(jobs as any[]).slice(0, 6).map((j: any) => (
                <div key={j.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{j.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{j.type || "Full-time"}</Badge>
                    {j.location && <span className="text-xs text-muted-foreground">{j.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
