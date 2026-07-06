import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, FileSpreadsheet, BarChart2, Calendar, TrendingUp, Users, Clock, Gift, RotateCcw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

type ReportTab =
  | "balance-summary"
  | "all-requests"
  | "pending"
  | "upcoming"
  | "by-type"
  | "by-department"
  | "carry-forward"
  | "accrual-history"
  | "compensatory"
  | "monthly-trend";

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: "balance-summary", label: "Balance Summary", icon: BarChart2 },
  { id: "all-requests", label: "All Requests", icon: Calendar },
  { id: "pending", label: "Pending", icon: AlertCircle },
  { id: "upcoming", label: "Upcoming", icon: TrendingUp },
  { id: "by-type", label: "By Leave Type", icon: FileSpreadsheet },
  { id: "by-department", label: "By Department", icon: Users },
  { id: "carry-forward", label: "Carry-Forward", icon: RotateCcw },
  { id: "accrual-history", label: "Accrual History", icon: TrendingUp },
  { id: "compensatory", label: "Compensatory", icon: Gift },
  { id: "monthly-trend", label: "Monthly Trend", icon: BarChart2 },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  withdrawn: "bg-purple-100 text-purple-700",
};

function exportToExcel(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) { toast.error("No data to export"); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
  toast.success("Excel file downloaded");
}

export default function LeaveReportsPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;

  const [activeTab, setActiveTab] = useState<ReportTab>("balance-summary");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });
  const { data: balanceSummary = [] } = trpc.leave.reports.balanceSummary.useQuery(
    { companyId, year }, { enabled: activeTab === "balance-summary" }
  );
  const { data: allRequests = [] } = trpc.leave.reports.requests.useQuery(
    {
      companyId,
      status: statusFilter === "all" ? undefined : statusFilter,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
    { enabled: activeTab === "all-requests" || activeTab === "by-type" || activeTab === "by-department" || activeTab === "monthly-trend" }
  );
  const { data: pendingRequests = [] } = trpc.leave.reports.pending.useQuery(
    { companyId }, { enabled: activeTab === "pending" }
  );
  const { data: upcomingRequests = [] } = trpc.leave.reports.upcoming.useQuery(
    { companyId, days: 30 }, { enabled: activeTab === "upcoming" }
  );
  const { data: carryForwardLogs = [] } = trpc.leave.reports.carryForward.useQuery(
    { companyId }, { enabled: activeTab === "carry-forward" }
  );
  const { data: accrualLogs = [] } = trpc.leave.reports.accrualHistory.useQuery(
    { companyId, year }, { enabled: activeTab === "accrual-history" }
  );
  const { data: compensatoryRecords = [] } = trpc.leave.reports.compensatory.useQuery(
    { companyId }, { enabled: activeTab === "compensatory" }
  );

  const getTypeName = (id: number) => leaveTypes.find(lt => lt.id === id)?.name ?? "Unknown";

  // By-type aggregation
  const byType = useMemo(() => {
    const map: Record<number, { name: string; count: number; totalDays: number }> = {};
    (allRequests as Array<{ leaveTypeId: number; days: string; status: string }>).forEach(r => {
      if (!map[r.leaveTypeId]) map[r.leaveTypeId] = { name: getTypeName(r.leaveTypeId), count: 0, totalDays: 0 };
      map[r.leaveTypeId].count++;
      map[r.leaveTypeId].totalDays += parseFloat(r.days ?? "0");
    });
    return Object.values(map).sort((a, b) => b.totalDays - a.totalDays);
  }, [allRequests, leaveTypes]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { month: string; count: number; totalDays: number }> = {};
    (allRequests as Array<{ startDate: Date; days: string }>).forEach(r => {
      const d = new Date(r.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, count: 0, totalDays: 0 };
      map[key].count++;
      map[key].totalDays += parseFloat(r.days ?? "0");
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [allRequests]);

  const renderTable = (
    columns: { key: string; label: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }[],
    rows: Record<string, unknown>[],
    exportFilename: string
  ) => (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs"
          onClick={() => exportToExcel(rows, exportFilename)}>
          <Download className="h-3.5 w-3.5" />
          Export Excel
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No data found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {columns.map(c => (
                  <th key={c.key} className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                  {columns.map(c => (
                    <td key={c.key} className="py-2.5 px-3 text-xs">
                      {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "balance-summary":
        return renderTable(
          [
            { key: "employeeId", label: "Employee ID" },
            { key: "leaveTypeId", label: "Leave Type", render: (v) => getTypeName(v as number) },
            { key: "year", label: "Year" },
            { key: "entitled", label: "Entitled" },
            { key: "used", label: "Used" },
            { key: "pending", label: "Pending" },
            { key: "balance", label: "Balance" },
            { key: "carryForward", label: "Carry Fwd" },
          ],
          balanceSummary as Record<string, unknown>[],
          "leave_balance_summary"
        );

      case "all-requests":
        return renderTable(
          [
            { key: "id", label: "ID" },
            { key: "employeeId", label: "Employee" },
            { key: "leaveTypeId", label: "Type", render: (v) => getTypeName(v as number) },
            { key: "startDate", label: "Start", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "endDate", label: "End", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "days", label: "Days" },
            {
              key: "status", label: "Status", render: (v) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[v as string] ?? ""}`}>
                  {String(v)}
                </span>
              )
            },
            { key: "reason", label: "Reason" },
          ],
          allRequests as Record<string, unknown>[],
          "leave_all_requests"
        );

      case "pending":
        return renderTable(
          [
            { key: "id", label: "ID" },
            { key: "employeeId", label: "Employee" },
            { key: "leaveTypeId", label: "Type", render: (v) => getTypeName(v as number) },
            { key: "startDate", label: "Start", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "endDate", label: "End", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "days", label: "Days" },
            { key: "appliedAt", label: "Applied", render: (v) => v ? new Date(v as Date).toLocaleDateString() : "—" },
          ],
          pendingRequests as Record<string, unknown>[],
          "leave_pending"
        );

      case "upcoming":
        return renderTable(
          [
            { key: "employeeId", label: "Employee" },
            { key: "leaveTypeId", label: "Type", render: (v) => getTypeName(v as number) },
            { key: "startDate", label: "Start", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "endDate", label: "End", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "days", label: "Days" },
          ],
          upcomingRequests as Record<string, unknown>[],
          "leave_upcoming"
        );

      case "by-type":
        return renderTable(
          [
            { key: "name", label: "Leave Type" },
            { key: "count", label: "Requests" },
            { key: "totalDays", label: "Total Days", render: (v) => (v as number).toFixed(1) },
          ],
          byType as unknown as Record<string, unknown>[],
          "leave_by_type"
        );

      case "by-department":
        return (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Department breakdown requires employee-department join. Available after employee profiles are linked.
          </div>
        );

      case "carry-forward":
        return renderTable(
          [
            { key: "employeeId", label: "Employee" },
            { key: "leaveTypeId", label: "Type", render: (v) => getTypeName(v as number) },
            { key: "fromYear", label: "From Year" },
            { key: "toYear", label: "To Year" },
            { key: "daysBefore", label: "Balance Before" },
            { key: "daysCarried", label: "Days Carried" },
            { key: "daysForfeited", label: "Forfeited" },
            { key: "processedAt", label: "Processed", render: (v) => v ? new Date(v as Date).toLocaleDateString() : "—" },
          ],
          carryForwardLogs as Record<string, unknown>[],
          "leave_carry_forward"
        );

      case "accrual-history":
        return renderTable(
          [
            { key: "employeeId", label: "Employee" },
            { key: "leaveTypeId", label: "Type", render: (v) => getTypeName(v as number) },
            { key: "year", label: "Year" },
            { key: "month", label: "Month" },
            { key: "accrualDays", label: "Accrued" },
            { key: "balanceBefore", label: "Before" },
            { key: "balanceAfter", label: "After" },
            { key: "runAt", label: "Run At", render: (v) => v ? new Date(v as Date).toLocaleDateString() : "—" },
          ],
          accrualLogs as Record<string, unknown>[],
          "leave_accrual_history"
        );

      case "compensatory":
        return renderTable(
          [
            { key: "employeeId", label: "Employee" },
            { key: "earnedDate", label: "Worked On", render: (v) => new Date(v as Date).toLocaleDateString() },
            { key: "earnedDays", label: "Earned" },
            { key: "usedDays", label: "Used" },
            { key: "status", label: "Status" },
            { key: "expiryDate", label: "Expires", render: (v) => v ? new Date(v as Date).toLocaleDateString() : "—" },
            { key: "reason", label: "Reason" },
          ],
          compensatoryRecords as Record<string, unknown>[],
          "leave_compensatory"
        );

      case "monthly-trend":
        return (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => exportToExcel(monthlyTrend as unknown as Record<string, unknown>[], "leave_monthly_trend")}>
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
            </div>
            {monthlyTrend.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No data found.</div>
            ) : (
              <div className="space-y-2">
                {monthlyTrend.map(m => {
                  const maxDays = Math.max(...monthlyTrend.map(x => x.totalDays), 1);
                  const pct = (m.totalDays / maxDays) * 100;
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{m.month}</span>
                      <div className="flex-1 bg-muted/30 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all duration-500 flex items-center pl-2"
                          style={{ width: `${pct}%` }}
                        >
                          {pct > 20 && (
                            <span className="text-[10px] text-white font-medium">{m.totalDays.toFixed(1)}d</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
                        {m.count} req
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leave Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          10 report views with date-range filters and Excel export
        </p>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {(() => {
              const tab = TABS.find(t => t.id === activeTab);
              const Icon = tab?.icon ?? BarChart2;
              return (
                <>
                  <Icon className="h-4 w-4 text-primary" />
                  {tab?.label}
                </>
              );
            })()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
