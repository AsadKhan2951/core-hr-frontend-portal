import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, Calendar, RotateCcw, Search, Download, AlertCircle } from "lucide-react";

export default function LeaveBalancePage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });
  const { data: departments = [] } = trpc.org.listDepartments.useQuery({ companyId });
  const { data: balances = [] } = trpc.leave.balances.list.useQuery({ companyId, year });
  const { data: accruals = [] } = trpc.leave.accrual.logs.useQuery({ companyId, year });

  const runAccrualMutation = trpc.leave.accrual.runMonthly.useMutation({
    onSuccess: () => toast.success("Accrual run completed"),
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const currentMonth = new Date().getMonth() + 1;

  const runYearCloseMutation = trpc.leave.carryForward.runYearEnd.useMutation({
    onSuccess: () => toast.success("Year-end closing completed — carry-forward balances updated"),
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Group balances by employee
  type BalanceRow = typeof balances[0];
  const employeeMap = useMemo(() => {
    const map: Record<number, BalanceRow[]> = {};
    balances.forEach(b => {
      if (!map[b.employeeId]) map[b.employeeId] = [];
      map[b.employeeId].push(b);
    });
    return map;
  }, [balances]);

  const employeeIds = Object.keys(employeeMap).map(Number);

  const getTypeName = (id: number) => leaveTypes.find(lt => lt.id === id)?.name ?? "Unknown";
  const getTypeColor = (id: number) => leaveTypes.find(lt => lt.id === id)?.colorCode ?? "#6366f1";

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Balance Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor entitlements, accruals, and carry-forward balances across the team
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() =>         runAccrualMutation.mutate({ companyId, year, month: currentMonth })}
            disabled={runAccrualMutation.isPending}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Run Accrual
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            onClick={() => {
              if (window.confirm(`Run year-end closing for ${year}? This will process carry-forward balances.`)) {
                runYearCloseMutation.mutate({ companyId, fromYear: year });
              }
            }}
            disabled={runYearCloseMutation.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Year-End Close
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: { id: number; name: string }) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder="Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Employees Tracked", value: employeeIds.length },
          { label: "Total Accrual Runs", value: accruals.length },
          { label: "Leave Types", value: leaveTypes.filter(lt => lt.isActive).length },
          {
            label: "Low Balance Alerts",
            value: balances.filter(b => parseFloat(b.balance ?? "0") < 2).length,
          },
        ].map(({ label, value }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employee Balances — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {employeeIds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No balance data for {year}.</p>
              <p className="text-xs mt-1">Run accrual to populate balances.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Employee</th>
                    {leaveTypes.filter(lt => lt.isActive).map(lt => (
                      <th key={lt.id} className="text-center py-2 px-3 font-medium text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: lt.colorCode ?? "#6366f1" }} />
                          <span className="truncate max-w-20">{lt.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employeeIds.map(empId => {
                    const empBalances = employeeMap[empId];
                    const firstName = empBalances[0]?.employeeId ?? empId;
                    return (
                      <tr key={empId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-medium">Employee #{empId}</div>
                        </td>
                        {leaveTypes.filter(lt => lt.isActive).map(lt => {
                          const bal = empBalances.find(b => b.leaveTypeId === lt.id);
                          if (!bal) return (
                            <td key={lt.id} className="py-2.5 px-3 text-center text-muted-foreground text-xs">—</td>
                          );
                          const available = parseFloat(bal.balance ?? "0");
                          const entitled = parseFloat(bal.entitled ?? "0");
                          const isLow = available < 2 && entitled > 0;
                          return (
                            <td key={lt.id} className="py-2.5 px-3 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className={`font-semibold ${isLow ? "text-amber-600" : "text-foreground"}`}>
                                  {bal.balance}
                                </span>
                                <span className="text-xs text-muted-foreground">/ {bal.entitled}</span>
                                {isLow && <AlertCircle className="h-3 w-3 text-amber-500" />}
                                {bal.carryForward && parseFloat(bal.carryForward) > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    +{bal.carryForward} CF
                                  </Badge>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Accruals */}
      {accruals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Accrual Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accruals.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getTypeColor(a.leaveTypeId) }} />
                    <span className="text-muted-foreground">Employee #{a.employeeId}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{getTypeName(a.leaveTypeId)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">+{a.accrualDays} days</Badge>
                    <span className="text-xs text-muted-foreground">{a.year}/{String(a.month).padStart(2, "0")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
