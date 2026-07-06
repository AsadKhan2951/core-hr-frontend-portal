import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Clock, TrendingUp, AlertTriangle, MapPin, FileText, Users
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";

const COMPANY_ID = 1;

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-blue-100 text-blue-700",
  on_leave: "bg-purple-100 text-purple-700",
  holiday: "bg-slate-100 text-slate-600",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status.replace("_", " ")}</span>;
}

function DateRangePicker({
  startDate, endDate,
  onStartChange, onEndChange,
}: {
  startDate: string; endDate: string;
  onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input type="date" value={startDate} onChange={e => onStartChange(e.target.value)} className="h-8 text-sm w-36" />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input type="date" value={endDate} onChange={e => onEndChange(e.target.value)} className="h-8 text-sm w-36" />
      </div>
    </div>
  );
}

// ─── Daily Report Tab ─────────────────────────────────────────────────────────
function DailyReportTab() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading } = trpc.attendance.reports.daily.useQuery(
    { companyId: COMPANY_ID, date: new Date(date) },
    { enabled: !!date }
  );

  const columns = [
    { key: "employeeId", header: "Emp ID", sortable: true },
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "department", header: "Department", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status ?? "")} />,
    },
    {
      key: "clockIn",
      header: "Clock In",
      render: (row: Record<string, unknown>) => row.clockIn ? format(new Date(String(row.clockIn)), "HH:mm") : "—",
    },
    {
      key: "clockOut",
      header: "Clock Out",
      render: (row: Record<string, unknown>) => row.clockOut ? format(new Date(String(row.clockOut)), "HH:mm") : "—",
    },
    { key: "workMinutes", header: "Work (min)", sortable: true },
    { key: "lateMinutes", header: "Late (min)", sortable: true },
    { key: "source", header: "Source" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground">Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-8 text-sm w-40" />
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={BarChart3} title="No records for this date" description="Select a date with attendance data." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`daily-attendance-${date}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Date Range Report Tab ────────────────────────────────────────────────────
function DateRangeReportTab() {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading } = trpc.attendance.reports.dateRange.useQuery(
    { companyId: COMPANY_ID, startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled }
  );

  const columns = [
    { key: "employeeId", header: "Emp ID", sortable: true },
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "date", header: "Date", sortable: true, render: (row: Record<string, unknown>) => format(new Date(String(row.date)), "dd MMM yyyy") },
    { key: "status", header: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status ?? "")} /> },
    { key: "workMinutes", header: "Work (min)", sortable: true },
    { key: "lateMinutes", header: "Late (min)", sortable: true },
    { key: "source", header: "Source" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <Button size="sm" onClick={() => setEnabled(true)}>Run Report</Button>
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={BarChart3} title="Run the report to see data" description="Select a date range and click Run Report." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`attendance-${startDate}-to-${endDate}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Status Summary Tab ───────────────────────────────────────────────────────
function StatusSummaryTab() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = trpc.attendance.reports.statusSummary.useQuery(
    { companyId: COMPANY_ID, startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled }
  );

  const columns = [
    { key: "status", header: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status ?? "")} /> },
    { key: "count", header: "Count", sortable: true },
    { key: "percentage", header: "% Share", sortable: true, render: (row: Record<string, unknown>) => `${Number(row.percentage ?? 0).toFixed(1)}%` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <Button size="sm" onClick={() => setEnabled(true)}>Run Report</Button>
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={Users} title="No summary data" description="Select a date range and run the report." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`status-summary-${startDate}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Top Late Employees Tab ───────────────────────────────────────────────────
function TopLateTab() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = trpc.attendance.reports.topLate.useQuery(
    { companyId: COMPANY_ID, startDate: new Date(startDate), endDate: new Date(endDate), limit: 20 },
    { enabled }
  );

  const columns = [
    { key: "employeeId", header: "Emp ID", sortable: true },
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "department", header: "Department", sortable: true },
    { key: "lateCount", header: "Late Days", sortable: true },
    { key: "totalLateMinutes", header: "Total Late (min)", sortable: true },
    { key: "avgLateMinutes", header: "Avg Late (min)", sortable: true, render: (row: Record<string, unknown>) => Number(row.avgLateMinutes ?? 0).toFixed(0) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <Button size="sm" onClick={() => setEnabled(true)}>Run Report</Button>
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={Clock} title="No late records" description="No late arrivals in the selected period." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`top-late-${startDate}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Geo-Fence Violations Tab ─────────────────────────────────────────────────
function GeoFenceViolationsTab() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = trpc.attendance.reports.geoFenceViolations.useQuery(
    { companyId: COMPANY_ID, startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled }
  );

  const columns = [
    { key: "employeeId", header: "Emp ID", sortable: true },
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "date", header: "Date", sortable: true, render: (row: Record<string, unknown>) => format(new Date(String(row.date)), "dd MMM yyyy") },
    { key: "violationType", header: "Violation Type" },
    { key: "latitude", header: "Lat", render: (row: Record<string, unknown>) => Number(row.latitude ?? 0).toFixed(5) },
    { key: "longitude", header: "Lng", render: (row: Record<string, unknown>) => Number(row.longitude ?? 0).toFixed(5) },
    { key: "distance", header: "Distance (m)", sortable: true, render: (row: Record<string, unknown>) => Number(row.distance ?? 0).toFixed(0) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <Button size="sm" onClick={() => setEnabled(true)}>Run Report</Button>
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={MapPin} title="No geo-fence violations" description="No violations in the selected period." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`geofence-violations-${startDate}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Overtime Summary Tab ─────────────────────────────────────────────────────
function OvertimeSummaryTab() {
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading } = trpc.attendance.reports.overtimeSummary.useQuery(
    { companyId: COMPANY_ID, startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled }
  );

  const columns = [
    { key: "employeeId", header: "Emp ID", sortable: true },
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "department", header: "Department", sortable: true },
    { key: "totalRequests", header: "OT Requests", sortable: true },
    { key: "approvedRequests", header: "Approved", sortable: true },
    { key: "totalApprovedMinutes", header: "Approved (min)", sortable: true },
    { key: "totalApprovedHours", header: "Approved (hrs)", sortable: true, render: (row: Record<string, unknown>) => (Number(row.totalApprovedMinutes ?? 0) / 60).toFixed(1) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <Button size="sm" onClick={() => setEnabled(true)}>Run Report</Button>
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={TrendingUp} title="No overtime data" description="No overtime records in the selected period." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`overtime-summary-${startDate}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Monthly Report Tab ───────────────────────────────────────────────────────
function MonthlyReportTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = trpc.attendance.reports.monthly.useQuery(
    { companyId: COMPANY_ID, year, month },
  );

  const columns = [
    { key: "employeeId", header: "Emp ID", sortable: true },
    { key: "employeeName", header: "Employee", sortable: true },
    { key: "date", header: "Date", sortable: true, render: (row: Record<string, unknown>) => format(new Date(String(row.date)), "dd MMM") },
    { key: "status", header: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={String(row.status ?? "")} /> },
    { key: "workMinutes", header: "Work (min)", sortable: true },
    { key: "lateMinutes", header: "Late (min)", sortable: true },
  ];

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="h-8 text-sm w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="h-8 text-sm border border-border rounded-md px-2 bg-background"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>
      {!data || (data as unknown[]).length === 0
        ? <EmptyState icon={FileText} title="No monthly data" description="No records for the selected month." compact />
        : <DataTable
            columns={columns}
            data={data as unknown as Record<string, unknown>[]}
            exportFilename={`monthly-attendance-${year}-${String(month).padStart(2,"0")}`}
            loading={isLoading}
          />
      }
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendanceReportsPage() {
  const tabs = useMemo(() => [
    { id: "daily", label: "Daily", icon: BarChart3 },
    { id: "dateRange", label: "Date Range", icon: FileText },
    { id: "monthly", label: "Monthly", icon: FileText },
    { id: "statusSummary", label: "Status Summary", icon: Users },
    { id: "topLate", label: "Late Arrivals", icon: Clock },
    { id: "geoFence", label: "Geo-Fence Violations", icon: MapPin },
    { id: "overtime", label: "Overtime", icon: TrendingUp },
  ], []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All reports support Excel export. Select a tab and configure the date range.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="daily">
            <TabsList className="flex-wrap h-auto gap-1 mb-4">
              {tabs.map(t => (
                <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 text-xs">
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="daily"><DailyReportTab /></TabsContent>
            <TabsContent value="dateRange"><DateRangeReportTab /></TabsContent>
            <TabsContent value="monthly"><MonthlyReportTab /></TabsContent>
            <TabsContent value="statusSummary"><StatusSummaryTab /></TabsContent>
            <TabsContent value="topLate"><TopLateTab /></TabsContent>
            <TabsContent value="geoFence"><GeoFenceViolationsTab /></TabsContent>
            <TabsContent value="overtime"><OvertimeSummaryTab /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
