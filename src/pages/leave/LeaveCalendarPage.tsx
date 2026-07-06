import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Users, Calendar } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function LeaveCalendarPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [deptFilter, setDeptFilter] = useState("all");

  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });
  const { data: departments = [] } = trpc.org.listDepartments.useQuery({ companyId });

  // Fetch approved leaves for the visible month
  const startDate = useMemo(() => new Date(viewYear, viewMonth, 1), [viewYear, viewMonth]);
  const endDate = useMemo(() => new Date(viewYear, viewMonth + 1, 0), [viewYear, viewMonth]);

  const { data: requests = [] } = trpc.leave.requests.list.useQuery({
    companyId,
    startDate,
    endDate,
    status: "approved",
    limit: 500,
  });

  const filteredRequests = useMemo(() => {
    if (deptFilter === "all") return requests;
    return requests.filter((r) => String((r as unknown as { departmentId?: number }).departmentId) === deptFilter);
  }, [requests, deptFilter]);

  // Build a map: day -> list of leave summaries
  const dayLeaveMap = useMemo(() => {
    const map: Record<number, Array<{ name: string; color: string; employeeName: string }>> = {};
    filteredRequests.forEach((req: {
      startDate: Date | string;
      endDate: Date | string;
      leaveTypeId: number;
      employeeName?: string;
    }) => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const lt = leaveTypes.find(t => t.id === req.leaveTypeId);
      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getMonth() === viewMonth && cur.getFullYear() === viewYear) {
          const day = cur.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({
            name: lt?.name ?? "Leave",
            color: lt?.colorCode ?? "#6366f1",
            employeeName: req.employeeName ?? "Employee",
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [filteredRequests, leaveTypes, viewMonth, viewYear]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isWeekend = (cellIndex: number) => {
    const dayOfWeek = cellIndex % 7;
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Team leave overview by month</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <Users className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: { id: number; name: string }) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              {MONTHS[viewMonth]} {viewYear}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="h-20" />;
              }
              const leaves = dayLeaveMap[day] ?? [];
              const weekend = isWeekend(i);
              return (
                <div
                  key={day}
                  className={`h-20 rounded-lg border p-1.5 text-xs overflow-hidden transition-colors ${
                    isToday(day)
                      ? "border-primary bg-primary/5"
                      : weekend
                      ? "border-border/30 bg-muted/20"
                      : "border-border/30 hover:border-border/60"
                  }`}
                >
                  <div className={`font-semibold mb-1 ${
                    isToday(day) ? "text-primary" : weekend ? "text-muted-foreground" : "text-foreground"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {leaves.slice(0, 2).map((l, li) => (
                      <div
                        key={li}
                        className="truncate rounded px-1 py-0.5 text-white text-[10px] leading-tight"
                        style={{ backgroundColor: l.color }}
                        title={`${l.employeeName} — ${l.name}`}
                      >
                        {l.employeeName.split(" ")[0]}
                      </div>
                    ))}
                    {leaves.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{leaves.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      {leaveTypes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground mr-1">Legend:</span>
              {leaveTypes.filter(lt => lt.isActive).map(lt => (
                <div key={lt.id} className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: lt.colorCode ?? "#6366f1" }} />
                  <span className="text-xs text-muted-foreground">{lt.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* On-leave today */}
      {dayLeaveMap[today.getDate()] && viewMonth === today.getMonth() && viewYear === today.getFullYear() && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              On Leave Today ({dayLeaveMap[today.getDate()].length} employee{dayLeaveMap[today.getDate()].length !== 1 ? "s" : ""})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dayLeaveMap[today.getDate()].map((l, i) => (
                <Badge key={i} variant="outline" className="gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.employeeName} — {l.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
