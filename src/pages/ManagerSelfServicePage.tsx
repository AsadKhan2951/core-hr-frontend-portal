/**
 * ManagerSelfServicePage — Manager Self-Service Home
 *
 * Widgets:
 * 1. Team Attendance — today's team attendance grid with status indicators
 * 2. Pending Approvals — one-touch approve/reject with AI coverage summary
 * 3. Team Leave Calendar — month view of team leaves
 * 4. Team Reports — attendance/leave stats for the current month
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users, CheckCircle2, XCircle, Clock, CalendarDays, TrendingUp,
  AlertTriangle, Sparkles, RefreshCw, ChevronLeft, ChevronRight,
  UserCheck, UserX, Timer, BarChart3, ThumbsUp, ThumbsDown,
} from "lucide-react";

const COMPANY_ID = 1;

function fmt(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(start: Date | string, end: Date | string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// ─── Team Attendance Widget ───────────────────────────────────────────────────
function TeamAttendanceWidget({ managerId }: { managerId: number }) {
  const { data, isLoading } = trpc.selfService.mss.teamAttendance.useQuery(
    { companyId: COMPANY_ID, managerId },
    { enabled: managerId > 0 }
  );

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    present: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <UserCheck className="w-3.5 h-3.5" />, label: "Present" },
    absent: { color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: <UserX className="w-3.5 h-3.5" />, label: "Absent" },
    on_leave: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: <CalendarDays className="w-3.5 h-3.5" />, label: "On Leave" },
    late: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: <Timer className="w-3.5 h-3.5" />, label: "Late" },
    half_day: { color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: <Clock className="w-3.5 h-3.5" />, label: "Half Day" },
  };

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" />Team Attendance Today</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 mb-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      </CardContent>
    </Card>
  );

  const stats = [
    { label: "Present", value: data?.present ?? 0, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Absent", value: data?.absent ?? 0, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
    { label: "On Leave", value: data?.onLeave ?? 0, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Late", value: data?.late ?? 0, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />Team Attendance Today
          </CardTitle>
          <span className="text-xs text-muted-foreground">{data?.total ?? 0} members</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {stats.map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-2 text-center`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
        {!data?.records?.length ? (
          <p className="text-sm text-muted-foreground text-center py-2">No direct reports found.</p>
        ) : (
          <div className="space-y-1.5">
            {data.records.map((r, i) => {
              const cfg = statusConfig[r.status] ?? statusConfig.absent;
              const name = `${r.employee.firstName} ${r.employee.lastName}`;
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    {r.clockIn && <p className="text-xs text-muted-foreground">In: {new Date(r.clockIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>}
                  </div>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 flex items-center gap-1 ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                    {r.isLate && r.status === "present" && <span className="ml-1 text-amber-600">(Late)</span>}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pending Approvals Widget ─────────────────────────────────────────────────
function PendingApprovalsWidget({ managerId }: { managerId: number }) {
  const [coverageFor, setCoverageFor] = useState<number | null>(null);
  const [coverageText, setCoverageText] = useState<Record<number, string>>({});
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, refetch } = trpc.selfService.mss.pendingApprovals.useQuery(
    { companyId: COMPANY_ID, managerId },
    { enabled: managerId > 0 }
  );
  const utils = trpc.useUtils();

  const approve = trpc.selfService.mss.approveLeave.useMutation({
    onSuccess: () => { toast.success("Leave approved!"); utils.selfService.mss.pendingApprovals.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const reject = trpc.selfService.mss.rejectLeave.useMutation({
    onSuccess: () => { toast.success("Leave rejected."); setRejectId(null); setComment(""); utils.selfService.mss.pendingApprovals.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const coverage = trpc.selfService.mss.coverageSummary.useMutation({
    onSuccess: (res, vars) => {
      const narrative = typeof res.summary === 'string' ? res.summary : (res.summary as { aiNarrative?: string })?.aiNarrative ?? JSON.stringify(res.summary);
      setCoverageText(prev => ({ ...prev, [vars.leaveRequestId]: narrative }));
      setCoverageFor(null);
    },
    onError: () => setCoverageFor(null),
  });

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Pending Approvals</CardTitle></CardHeader>
      <CardContent><div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />Pending Approvals
            </CardTitle>
            {(data?.length ?? 0) > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{data!.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!data?.length ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map(r => (
                <div key={r.id} className="rounded-xl border bg-card p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {r.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.leaveTypeColor }} />
                          {r.leaveTypeName}
                        </span>
                        {" · "}{fmt(r.startDate)} – {fmt(r.endDate)}
                        {" · "}<strong>{daysBetween(r.startDate, r.endDate)} day{daysBetween(r.startDate, r.endDate) !== 1 ? "s" : ""}</strong>
                      </p>
                      {r.reason && <p className="text-xs text-muted-foreground mt-0.5 italic">"{r.reason}"</p>}
                    </div>
                  </div>

                  {/* AI Coverage Summary */}
                  {coverageText[r.id] && (
                    <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-2.5 text-xs text-violet-900 dark:text-violet-200 border border-violet-100 dark:border-violet-800">
                      <p className="font-semibold text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Coverage Analysis</p>
                      {coverageText[r.id]}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 text-xs gap-1 border-violet-200 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                      onClick={() => {
                        setCoverageFor(r.id);
                        coverage.mutate({
                          companyId: COMPANY_ID,
                          leaveRequestId: r.id,
                          employeeId: r.employeeId,
                          startDate: new Date(r.startDate),
                          endDate: new Date(r.endDate),
                        });
                      }}
                      disabled={coverage.isPending && coverageFor === r.id}
                    >
                      {coverage.isPending && coverageFor === r.id
                        ? <><RefreshCw className="w-3 h-3 animate-spin" />Analyzing...</>
                        : <><Sparkles className="w-3 h-3" />AI Coverage</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-10 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setRejectId(r.id)}
                    >
                      <ThumbsDown className="w-3 h-3" />Reject
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-10 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approve.mutate({ leaveRequestId: r.id, approverId: managerId })}
                      disabled={approve.isPending}
                    >
                      {approve.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectId !== null} onOpenChange={open => { if (!open) { setRejectId(null); setComment(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />Reject Leave Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              rows={3}
              className="resize-none"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setRejectId(null); setComment(""); }}>Cancel</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={reject.isPending}
                onClick={() => rejectId && reject.mutate({ leaveRequestId: rejectId, approverId: managerId, comment })}
              >
                {reject.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Team Leave Calendar Widget ───────────────────────────────────────────────
function TeamLeaveCalendarWidget({ managerId }: { managerId: number }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = trpc.selfService.mss.teamLeaveCalendar.useQuery(
    { companyId: COMPANY_ID, managerId, year, month },
    { enabled: managerId > 0 }
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Build a map: day → list of employees on leave
  const dayLeaves = useMemo(() => {
    const map: Record<number, Array<{ name: string; color: string; status: string }>> = {};
    if (!data) return map;
    data.forEach(r => {
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() + 1 === month) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ name: r.employeeName, color: r.leaveTypeColor, status: r.status });
        }
      }
    });
    return map;
  }, [data, year, month]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-500" />Team Leave Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-xs font-medium w-24 text-center">{monthName} {year}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {dayNames.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells for first week */}
              {[...Array(firstDayOfWeek)].map((_, i) => <div key={`empty-${i}`} />)}
              {/* Day cells */}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const leaves = dayLeaves[day] ?? [];
                const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                return (
                  <div
                    key={day}
                    className={`relative min-h-[2.5rem] rounded-lg p-1 text-center transition-colors ${isToday ? "bg-indigo-100 dark:bg-indigo-900/40 ring-1 ring-indigo-400" : leaves.length > 0 ? "bg-muted/60" : "hover:bg-muted/30"}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"}`}>{day}</span>
                    {leaves.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                        {leaves.slice(0, 3).map((l, li) => (
                          <div key={li} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} title={l.name} />
                        ))}
                        {leaves.length > 3 && <span className="text-[9px] text-muted-foreground">+{leaves.length - 3}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            {data && data.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">On leave this month:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Map(data.map(r => [r.employeeId, r])).values()).map(r => (
                    <div key={r.employeeId} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.leaveTypeColor }} />
                      <span className="text-muted-foreground">{r.employeeName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Team Reports Widget ──────────────────────────────────────────────────────
function TeamReportsWidget({ managerId }: { managerId: number }) {
  const now = new Date();
  const { data, isLoading } = trpc.selfService.mss.teamReports.useQuery(
    { companyId: COMPANY_ID, managerId, year: now.getFullYear(), month: now.getMonth() + 1 },
    { enabled: managerId > 0 }
  );

  if (isLoading) return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-violet-500" />Team Reports</CardTitle></CardHeader>
      <CardContent><div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div></CardContent>
    </Card>
  );

  const stats = [
    { label: "Team Size", value: data?.headcount ?? 0, icon: <Users className="w-4 h-4 text-indigo-500" />, bg: "bg-indigo-50 dark:bg-indigo-950/30" },
    { label: "Avg Attendance", value: `${data?.avgAttendance ?? 0}%`, icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Approved Leaves", value: data?.totalLeaves ?? 0, icon: <CalendarDays className="w-4 h-4 text-blue-500" />, bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Pending Approvals", value: data?.pendingApprovals ?? 0, icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-500" />
          Team Reports — {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 flex items-center gap-2`}>
              {s.icon}
              <div>
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top Absentees */}
        {(data?.topAbsentees?.length ?? 0) > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />Top Absentees This Month
            </p>
            <div className="space-y-1.5">
              {data!.topAbsentees.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                  <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                  <span className="text-sm flex-1">{a.employeeName}</span>
                  <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
                    {a.absentDays} day{a.absentDays !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManagerSelfServicePage() {
  const { user } = useAuth();
  const managerId = (user as { employeeId?: number })?.employeeId ?? 1;
  const firstName = (user as { firstName?: string })?.firstName ?? user?.name?.split(" ")[0] ?? "Manager";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 pt-6 pb-16 text-white">
        <div className="max-w-2xl mx-auto">
          <p className="text-emerald-200 text-sm">Manager Dashboard</p>
          <h1 className="text-2xl font-bold mt-0.5">{firstName}'s Team 👥</h1>
          <p className="text-emerald-200 text-sm mt-1">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-10 pb-8 space-y-4">
        <Tabs defaultValue="approvals" className="w-full">
          <TabsList className="w-full h-11 grid grid-cols-4 rounded-2xl bg-muted/80">
            <TabsTrigger value="approvals" className="rounded-xl text-xs">Approvals</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-xl text-xs">Attendance</TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-xl text-xs">Calendar</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl text-xs">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals" className="mt-4">
            <PendingApprovalsWidget managerId={managerId} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <TeamAttendanceWidget managerId={managerId} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <TeamLeaveCalendarWidget managerId={managerId} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <TeamReportsWidget managerId={managerId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
