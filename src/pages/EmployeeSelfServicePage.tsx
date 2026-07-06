/**
 * EmployeeSelfServicePage — Employee Self-Service Home
 *
 * Widgets:
 * 1. Attendance Summary — current month stats (present / absent / late / hours)
 * 2. Leave Balances — colour-coded balance cards per leave type
 * 3. Apply Leave — quick inline form
 * 4. My Payslips — list with AI explainer per payslip
 * 5. My Requests — recent workflow request status
 * 6. Company News Feed — pinned + recent news
 * 7. HR Policy Documents — searchable policy library
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CalendarDays, Clock, TrendingUp, AlertCircle, FileText, Newspaper,
  BookOpen, Send, Sparkles, CheckCircle2, XCircle, Timer, ChevronRight,
  Download, Eye, Pin, Megaphone, PartyPopper, Shield, DollarSign,
  HardHat, Info, RefreshCw, Plus, Search,
} from "lucide-react";

const COMPANY_ID = 1;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  withdrawn: "bg-gray-100 text-gray-600 border-gray-200",
  draft: "bg-blue-100 text-blue-800 border-blue-200",
  disbursed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const categoryIcon: Record<string, React.ReactNode> = {
  announcement: <Megaphone className="w-4 h-4" />,
  policy: <Shield className="w-4 h-4" />,
  event: <PartyPopper className="w-4 h-4" />,
  achievement: <TrendingUp className="w-4 h-4" />,
  general: <Info className="w-4 h-4" />,
};

const policyIcon: Record<string, React.ReactNode> = {
  leave: <CalendarDays className="w-5 h-5" />,
  attendance: <Clock className="w-5 h-5" />,
  code_of_conduct: <Shield className="w-5 h-5" />,
  benefits: <TrendingUp className="w-5 h-5" />,
  payroll: <DollarSign className="w-5 h-5" />,
  safety: <HardHat className="w-5 h-5" />,
  general: <BookOpen className="w-5 h-5" />,
};

function fmt(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Attendance Summary Widget ────────────────────────────────────────────────
function AttendanceSummaryWidget({ employeeId }: { employeeId: number }) {
  const now = new Date();
  const { data, isLoading } = trpc.selfService.ess.myAttendanceSummary.useQuery(
    { employeeId, year: now.getFullYear(), month: now.getMonth() + 1 },
    { enabled: employeeId > 0 }
  );

  if (isLoading) return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2"><Clock className="w-4 h-4" />Attendance This Month</CardTitle></CardHeader>
      <CardContent><div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  const stats = [
    { label: "Present", value: data?.present ?? 0, icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Absent", value: data?.absent ?? 0, icon: <XCircle className="w-5 h-5 text-red-400" />, bg: "bg-red-50 dark:bg-red-950/30" },
    { label: "Late", value: data?.late ?? 0, icon: <Timer className="w-5 h-5 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-950/30" },
    { label: "Avg Hours", value: `${data?.avgHours ?? 0}h`, icon: <Clock className="w-5 h-5 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-950/30" },
  ];

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Attendance — {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 flex items-center gap-3`}>
              {s.icon}
              <div>
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Total hours worked: <strong>{data?.totalHours ?? 0}h</strong>
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Leave Balances Widget ────────────────────────────────────────────────────
function LeaveBalancesWidget({ employeeId }: { employeeId: number }) {
  const { data, isLoading } = trpc.selfService.ess.myLeaveBalances.useQuery(
    { employeeId },
    { enabled: employeeId > 0 }
  );

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-teal-500" />Leave Balances</CardTitle></CardHeader>
      <CardContent><div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  if (!data?.length) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-teal-500" />Leave Balances</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground text-center py-4">No leave balances configured yet.</p></CardContent>
    </Card>
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-teal-500" />Leave Balances {new Date().getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map(b => {
            const used = Number(b.used ?? 0);
            const total = Number(b.entitled ?? 0);
            const remaining = Number(b.balance ?? 0);
            const pct = total > 0 ? Math.round((used / total) * 100) : 0;
            return (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.leaveTypeColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{b.leaveTypeName}</span>
                    <span className="text-sm font-bold ml-2 flex-shrink-0">{remaining} <span className="text-xs font-normal text-muted-foreground">/ {total} days</span></span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: b.leaveTypeColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Apply Leave Widget ───────────────────────────────────────────────────────
function ApplyLeaveWidget({ employeeId }: { employeeId: number }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });

  const { data: balances } = trpc.selfService.ess.myLeaveBalances.useQuery(
    { employeeId }, { enabled: employeeId > 0 }
  );
  const utils = trpc.useUtils();
  const apply = trpc.leave.requests.submit.useMutation({
    onSuccess: () => {
      toast.success("Leave request submitted successfully!");
      setOpen(false);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      utils.selfService.ess.myLeaveRequests.invalidate();
      utils.selfService.ess.myLeaveBalances.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    apply.mutate({
      employeeId,
      companyId: COMPANY_ID,
      leaveTypeId: Number(form.leaveTypeId),
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      reason: form.reason,
    } as Parameters<typeof apply.mutate>[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full h-14 text-base gap-2 rounded-2xl shadow-md active:scale-[0.97] transition-transform">
          <Plus className="w-5 h-5" /> Apply for Leave
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-teal-500" /> Apply for Leave
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Leave Type *</Label>
            <Select value={form.leaveTypeId} onValueChange={v => setForm(f => ({ ...f, leaveTypeId: v }))}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select leave type" /></SelectTrigger>
              <SelectContent>
                {balances?.map(b => (
                  <SelectItem key={b.leaveTypeId} value={String(b.leaveTypeId)}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.leaveTypeColor }} />
                      {b.leaveTypeName} ({Number(b.balance ?? 0)} days remaining)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" className="h-12" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input type="date" className="h-12" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea placeholder="Optional reason for leave..." className="resize-none" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full h-12" disabled={apply.isPending}>
            {apply.isPending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Send className="w-4 h-4 mr-2" />Submit Request</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── My Payslips Widget ───────────────────────────────────────────────────────
function PayslipsWidget({ employeeId }: { employeeId: number }) {
  const [explaining, setExplaining] = useState<number | null>(null);
  const [explanations, setExplanations] = useState<Record<number, string>>({});

  const { data, isLoading } = trpc.selfService.ess.myPayslips.useQuery(
    { employeeId }, { enabled: employeeId > 0 }
  );
  const explain = trpc.selfService.ess.explainPayslip.useMutation({
    onSuccess: (res, vars) => {
      setExplanations(prev => ({ ...prev, [vars.payslipId]: res.explanation }));
      setExplaining(null);
    },
    onError: () => setExplaining(null),
  });

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" />My Payslips</CardTitle></CardHeader>
      <CardContent><div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-500" />My Payslips
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No payslips available yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map(p => (
              <div key={p.id} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{months[(p.month ?? 1) - 1]} {p.year}</p>
                    <p className="text-xs text-muted-foreground">Net: {Number(p.netSalary ?? 0).toLocaleString()} {p.currency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${statusColor[p.status] ?? ""}`}>{p.status}</Badge>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => {
                        if (explanations[p.id]) {
                          setExplanations(prev => { const n = { ...prev }; delete n[p.id]; return n; });
                        } else {
                          setExplaining(p.id);
                          explain.mutate({ payslipId: p.id, employeeId });
                        }
                      }}
                      title="AI Explain"
                    >
                      {explaining === p.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-violet-500" />}
                    </Button>
                  </div>
                </div>
                {explanations[p.id] && (
                  <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-2.5 text-xs text-violet-900 dark:text-violet-200 border border-violet-100 dark:border-violet-800">
                    <p className="font-semibold text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Explanation</p>
                    {explanations[p.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── My Requests Widget ───────────────────────────────────────────────────────
function MyRequestsWidget({ employeeId }: { employeeId: number }) {
  const { data: leaveReqs, isLoading } = trpc.selfService.ess.myLeaveRequests.useQuery(
    { employeeId, limit: 8 }, { enabled: employeeId > 0 }
  );

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />My Requests</CardTitle></CardHeader>
      <CardContent><div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />My Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!leaveReqs?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {leaveReqs.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.leaveTypeColor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.leaveTypeName}</p>
                  <p className="text-xs text-muted-foreground">{fmt(r.startDate)} – {fmt(r.endDate)}</p>
                </div>
                <Badge variant="outline" className={`text-xs flex-shrink-0 ${statusColor[r.status] ?? ""}`}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── News Feed Widget ─────────────────────────────────────────────────────────
function NewsFeedWidget() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data, isLoading } = trpc.selfService.ess.newsFeed.useQuery({ companyId: COMPANY_ID, limit: 8 });

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Newspaper className="w-4 h-4 text-orange-500" />Company News</CardTitle></CardHeader>
      <CardContent><div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  const catColors: Record<string, string> = {
    announcement: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    policy: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    event: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    achievement: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-orange-500" />Company News
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No news yet. Check back soon!</p>
        ) : (
          <div className="space-y-2">
            {data.map(n => (
              <div key={n.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className="w-full text-left p-3 hover:bg-muted/40 transition-colors"
                  onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                >
                  <div className="flex items-start gap-2">
                    {n.isPinned && <Pin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 ${catColors[n.category] ?? catColors.general}`}>
                          {categoryIcon[n.category]}{n.category}
                        </span>
                        <span className="text-xs text-muted-foreground">{fmt(n.publishedAt)}</span>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      {n.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.summary}</p>}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${expanded === n.id ? "rotate-90" : ""}`} />
                  </div>
                </button>
                {expanded === n.id && n.body && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground border-t bg-muted/20 pt-2">
                    {n.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Policy Docs Widget ───────────────────────────────────────────────────────
function PolicyDocsWidget() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const { data, isLoading } = trpc.selfService.ess.policyDocs.useQuery({ companyId: COMPANY_ID });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(d => {
      const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
      const matchCat = cat === "all" || d.category === cat;
      return matchSearch && matchCat;
    });
  }, [data, search, cat]);

  const categories = ["all", "leave", "attendance", "code_of_conduct", "benefits", "payroll", "safety", "general"];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-500" />HR Policy Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search policies..." className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c} value={c} className="text-xs capitalize">{c.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No policy documents found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                  {policyIcon[doc.category] ?? <BookOpen className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground capitalize">{doc.category.replace("_", " ")}</span>
                    {doc.version && <span className="text-xs text-muted-foreground">v{doc.version}</span>}
                    {doc.isMandatory && <Badge variant="outline" className="text-xs h-4 px-1 border-red-200 text-red-600">Required</Badge>}
                  </div>
                </div>
                {doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg flex-shrink-0">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeSelfServicePage() {
  const { user } = useAuth();
  // In production, resolve employeeId from user profile; use 1 as fallback for dev
  const employeeId = (user as { employeeId?: number })?.employeeId ?? 1;
  const firstName = (user as { firstName?: string })?.firstName ?? user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 pt-6 pb-16 text-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-indigo-200 text-sm">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},</p>
          <h1 className="text-2xl font-bold mt-0.5">{firstName} 👋</h1>
          <p className="text-indigo-200 text-sm mt-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Content — overlaps header */}
      <div className="max-w-2xl mx-auto px-4 -mt-10 pb-8 space-y-4">
        {/* Quick actions row */}
        <div className="grid grid-cols-1 gap-3">
          <ApplyLeaveWidget employeeId={employeeId} />
        </div>

        {/* Tabs for main content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full h-11 grid grid-cols-3 rounded-2xl bg-muted/80">
            <TabsTrigger value="overview" className="rounded-xl text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="payslips" className="rounded-xl text-xs sm:text-sm">Payslips</TabsTrigger>
            <TabsTrigger value="docs" className="rounded-xl text-xs sm:text-sm">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <AttendanceSummaryWidget employeeId={employeeId} />
            <LeaveBalancesWidget employeeId={employeeId} />
            <MyRequestsWidget employeeId={employeeId} />
            <NewsFeedWidget />
          </TabsContent>

          <TabsContent value="payslips" className="mt-4">
            <PayslipsWidget employeeId={employeeId} />
          </TabsContent>

          <TabsContent value="docs" className="mt-4">
            <PolicyDocsWidget />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
