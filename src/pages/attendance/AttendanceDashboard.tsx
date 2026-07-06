import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, UserCheck, UserX, AlertTriangle, TrendingUp, RefreshCw, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

const COMPANY_ID = 1;

const STATUS_CSS: Record<string, string> = {
  present:    "status-present",
  absent:     "status-absent",
  late:       "status-late",
  on_leave:   "status-leave",
  early_leave:"status-late",
  half_day:   "status-wfh",
  holiday:    "status-holiday",
  weekend:    "status-holiday",
};

export default function AttendanceDashboard() {
  const [, navigate] = useLocation();
  const [selectedDate] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const today = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedDate]);

  const { data: dailyData, isLoading: dailyLoading, refetch } = trpc.attendance.reports.daily.useQuery({
    companyId: COMPANY_ID,
    date: today,
  });

  const { data: statusSummary } = trpc.attendance.reports.statusSummary.useQuery({
    companyId: COMPANY_ID,
    startDate: today,
    endDate: today,
  });

  const { data: anomalyFlags } = trpc.attendance.reports.anomalyFlags.useQuery({
    companyId: COMPANY_ID,
    status: "pending_review",
  });

  // Compute stats from daily data
  const stats = useMemo(() => {
    if (!dailyData) return { present: 0, absent: 0, late: 0, onLeave: 0, total: 0 };
    const records = dailyData as Array<{ status: string }>;
    return {
      present: records.filter(r => r.status === "present").length,
      absent: records.filter(r => r.status === "absent").length,
      late: records.filter(r => r.status === "late").length,
      onLeave: records.filter(r => r.status === "on_leave").length,
      total: records.length,
    };
  }, [dailyData]);

  // Filter records for the table
  const filteredRecords = useMemo(() => {
    if (!dailyData) return [];
    return (dailyData as Array<Record<string, unknown>>).filter(r => {
      const matchesSearch = !search || String(r.employeeId ?? "").includes(search);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dailyData, search, statusFilter]);

  // Chart data: status distribution
  const statusChartData = useMemo(() => {
    if (!statusSummary) return [];
    const summary = statusSummary as unknown as Record<string, number>;
    return Object.entries(summary).map(([status, count]) => ({
      name: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: count,
    }));
  }, [statusSummary]);

  const attendanceRate = stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Dashboard</h1>
          <p className="page-subtitle">Real-time overview for {format(today, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/attendance/clock")}>
            <Clock className="h-4 w-4 mr-2" />
            Clock In/Out
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Present Today"
          value={stats.present}
          icon={UserCheck}
          color="green"
          delta={stats.total > 0 ? attendanceRate : undefined}
          deltaLabel="% attendance rate"
        />
        <StatCard
          title="Absent Today"
          value={stats.absent}
          icon={UserX}
          color="red"
          delta={stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : undefined}
          deltaLabel="% of workforce"
        />
        <StatCard
          title="Late Arrivals"
          value={stats.late}
          icon={Clock}
          color="amber"
          delta={stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : undefined}
          deltaLabel="% of workforce"
        />
        <StatCard
          title="On Leave"
          value={stats.onLeave}
          icon={Calendar}
          color="blue"
          delta={stats.total > 0 ? Math.round((stats.onLeave / stats.total) * 100) : undefined}
          deltaLabel="% of workforce"
        />
      </div>

      {/* Anomaly Alert Banner */}
      {anomalyFlags && (anomalyFlags as unknown[]).length > 0 && (
        <Card className="border-[rgba(244,169,31,.25)]" style={{ background: "rgba(244,169,31,.06)" }}>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: "var(--warning)" }}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {(anomalyFlags as unknown[]).length} AI-detected anomal{(anomalyFlags as unknown[]).length === 1 ? "y" : "ies"} pending review
              </span>
              <span className="ai-badge text-[10px]">
                AI Suggestion — Human Review Required
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[var(--warning)] border-[rgba(244,169,31,.35)] hover:bg-[rgba(244,169,31,.08)]"
              onClick={() => navigate("/attendance/anomalies")}
            >
              Review Flags
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Today's Status Distribution"
          type="pie"
          data={statusChartData}
          series={[{ key: "value", label: "Employees", color: "#0FB4A8" }]}
          loading={dailyLoading}
        />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={attendanceRate >= 90 ? "#0FB4A8" : attendanceRate >= 75 ? "#F4A91F" : "#EF4A5A"}
                    strokeWidth="3"
                    strokeDasharray={`${attendanceRate} ${100 - attendanceRate}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{attendanceRate}%</span>
                  <span className="text-xs text-muted-foreground">Rate</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center text-sm">
                <div>
                  <div className="font-semibold text-lg">{stats.total}</div>
                  <div className="text-muted-foreground text-xs">Total Expected</div>
                </div>
                <div>
                  <div className="font-semibold text-lg" style={{ color: "var(--success)" }}>{stats.present}</div>
                  <div className="text-muted-foreground text-xs">Present</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Today's Attendance Records
            </CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-48 text-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="early_leave">Early Leave</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No records found"
              description="No attendance records match your current filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="hcm-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Status</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Work Hours</th>
                    <th>Late (min)</th>
                    <th>Geo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-mono text-xs">{String(r.employeeId)}</td>
                      <td className="py-2 px-3">
                        <span className={STATUS_CSS[String(r.status)] ?? "status-draft"}>
                          {String(r.status ?? "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {r.clockIn ? format(new Date(r.clockIn as string), "HH:mm") : "—"}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {r.clockOut ? format(new Date(r.clockOut as string), "HH:mm") : "—"}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {r.workMinutes ? `${Math.floor(Number(r.workMinutes) / 60)}h ${Number(r.workMinutes) % 60}m` : "—"}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {r.lateMinutes ? (
                          <span className="text-amber-600 font-medium">{String(r.lateMinutes)}</span>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {r.geoFenceStatus === "outside" ? (
                          <span className="text-xs text-red-600 font-medium">Outside</span>
                        ) : r.geoFenceStatus === "inside" ? (
                          <span className="text-xs text-emerald-600">Inside</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
