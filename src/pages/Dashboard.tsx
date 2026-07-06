/**
 * pages/Dashboard.tsx
 *
 * Global HR Dashboard — the landing page after login.
 * Uses the shared component library (StatCard, ChartCard, DataTable, ApprovalTimeline).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { ApprovalTimeline } from "@/components/shared/ApprovalTimeline";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTable } from "@/components/shared/DataTable";
import type { ColumnDef } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  CalendarOff,
  ClipboardList,
  UserPlus,
  Cake,
  TrendingUp,
  Building2,
  RefreshCw,
  ChevronRight,
  Activity,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Link } from "wouter";

// ─── Placeholder data ─────────────────────────────────────────────────────────

const HEADCOUNT_TREND = [
  { month: "Jan", count: 280 },
  { month: "Feb", count: 295 },
  { month: "Mar", count: 302 },
  { month: "Apr", count: 318 },
  { month: "May", count: 325 },
  { month: "Jun", count: 342 },
];

const DEPT_HEADCOUNT = [
  { dept: "Engineering", count: 98 },
  { dept: "Sales", count: 74 },
  { dept: "HR", count: 32 },
  { dept: "Finance", count: 45 },
  { dept: "Operations", count: 56 },
  { dept: "Marketing", count: 37 },
];

const GENDER_SPLIT = [
  { name: "Male", value: 198 },
  { name: "Female", value: 144 },
];

const EMPLOYMENT_TYPE = [
  { name: "Full-time", value: 290 },
  { name: "Part-time", value: 28 },
  { name: "Contract", value: 24 },
];

const UPCOMING_BIRTHDAYS = [
  { id: 1, name: "Ahmed Al-Rashid",   dept: "Engineering", date: addDays(new Date(), 2) },
  { id: 2, name: "Sara Khan",         dept: "HR",          date: addDays(new Date(), 5) },
  { id: 3, name: "Mohammed Al-Farsi", dept: "Finance",     date: addDays(new Date(), 8) },
  { id: 4, name: "Priya Sharma",      dept: "Marketing",   date: addDays(new Date(), 12) },
  { id: 5, name: "James O\'Brien",    dept: "Sales",       date: addDays(new Date(), 15) },
];

const NEW_JOINERS = [
  { id: 1, name: "Fatima Al-Zahra", designation: "Senior Developer", dept: "Engineering", joinDate: addDays(new Date(), -3) },
  { id: 2, name: "Ravi Patel",      designation: "Sales Executive",  dept: "Sales",       joinDate: addDays(new Date(), -7) },
  { id: 3, name: "Aisha Noor",      designation: "HR Coordinator",   dept: "HR",          joinDate: addDays(new Date(), -10) },
  { id: 4, name: "Carlos Mendez",   designation: "Finance Analyst",  dept: "Finance",     joinDate: addDays(new Date(), -14) },
];

const SAMPLE_APPROVAL_STEPS = [
  {
    id: "1",
    label: "Line Manager Approval",
    approver: "Ahmed Al-Rashid",
    approverRole: "Engineering Manager",
    status: "approved" as const,
    timestamp: addDays(new Date(), -2),
    comment: "Approved. Employee has sufficient leave balance.",
  },
  {
    id: "2",
    label: "HR Manager Review",
    approver: "Sara Khan",
    approverRole: "HR Manager",
    status: "pending" as const,
  },
  {
    id: "3",
    label: "Director Sign-off",
    approver: "Mohammed Al-Farsi",
    approverRole: "Operations Director",
    status: "waiting" as const,
  },
];

// ─── Column definitions ───────────────────────────────────────────────────────

const birthdayColumns: ColumnDef<typeof UPCOMING_BIRTHDAYS[0]>[] = [
  {
    key: "name",
    header: "Employee",
    sortable: true,
    searchable: true,
    render: (row) => (
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--grad-brand)" }}>
          {row.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
        </div>
        <span className="text-sm font-medium">{row.name}</span>
      </div>
    ),
  },
  { key: "dept", header: "Department", sortable: true },
  {
    key: "date",
    header: "Birthday",
    sortable: true,
    render: (row) => {
      const daysUntil = Math.round((row.date.getTime() - Date.now()) / 86400000);
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">{format(row.date, "MMM d")}</span>
          <Badge variant="secondary" className="text-xs">
            {daysUntil === 0 ? "Today 🎉" : `in ${daysUntil}d`}
          </Badge>
        </div>
      );
    },
  },
];

const joinerColumns: ColumnDef<typeof NEW_JOINERS[0]>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    searchable: true,
    render: (row) => (
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--grad-brand)" }}>
          {row.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
        </div>
        <span className="text-sm font-medium">{row.name}</span>
      </div>
    ),
  },
  { key: "designation", header: "Designation", sortable: true },
  { key: "dept", header: "Department", sortable: true },
  {
    key: "joinDate",
    header: "Joined",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-muted-foreground">{format(row.joinDate, "MMM d, yyyy")}</span>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const companyId = 1;

  const statsQuery = trpc.dashboard.stats.useQuery(
    { companyId },
    { retry: false, refetchOnWindowFocus: false }
  );

  const workflowsQuery = trpc.dashboard.recentWorkflows.useQuery(
    { companyId, limit: 5 },
    { retry: false, refetchOnWindowFocus: false }
  );

  const chartQuery = trpc.dashboard.chartData.useQuery(
    { companyId },
    { retry: false, refetchOnWindowFocus: false }
  );

  const stats = statsQuery.data;
  const loading = statsQuery.isLoading;
  const chartData = chartQuery.data;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()}, {user?.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, MMMM d, yyyy")} · Here\'s what\'s happening at your company today.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => { statsQuery.refetch(); workflowsQuery.refetch(); }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Headcount"
          value={loading ? "—" : (stats?.headcount.total ?? 342)}
          icon={Users}
          trend="up"
          delta={4.2}
          deltaLabel="vs last month"
          color="indigo"
          loading={loading}
        />
        <StatCard
          title="Active Employees"
          value={loading ? "—" : (stats?.headcount.active ?? 318)}
          icon={UserCheck}
          trend="up"
          delta={1.8}
          color="green"
          loading={loading}
        />
        <StatCard
          title="On Leave Today"
          value={loading ? "—" : (stats?.headcount.onLeave ?? 24)}
          subValue="7.0% of workforce"
          icon={CalendarOff}
          trend="neutral"
          color="amber"
          loading={loading}
        />
        <StatCard
          title="Pending Approvals"
          value={loading ? "—" : (stats?.pendingApprovals ?? 8)}
          icon={ClipboardList}
          trend="neutral"
          color="purple"
          loading={loading}
        />
        <StatCard
          title="New Joiners"
          value={loading ? "—" : (stats?.headcount.newThisMonth ?? 4)}
          subValue="This month"
          icon={UserPlus}
          trend="up"
          delta={2}
          deltaType="absolute"
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Upcoming Birthdays"
          value={UPCOMING_BIRTHDAYS.length}
          subValue="Next 30 days"
          icon={Cake}
          color="slate"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="New Joiners by Month"
            description="Employees who joined in the last 6 months"
            type="area"
            data={chartData?.newJoinersByMonth ?? HEADCOUNT_TREND}
            xKey="month"
            series={[{ key: "count", label: "New Joiners", color: "#0FB4A8" }]}
            height={220}
            legend={false}
            loading={chartQuery.isLoading}
          />
        </div>
        <ChartCard
          title="Gender Distribution"
          type="pie"
          data={chartData?.byGender ?? GENDER_SPLIT}
          series={[
            { key: "Male",   label: "Male",   color: "#4F9AB3" },
            { key: "Female", label: "Female", color: "#0FB4A8" },
            { key: "Other",  label: "Other",  color: "#7A8896" },
          ]}
          height={220}
          xKey="name"
          loading={chartQuery.isLoading}
        />
      </div>

      {/* ── Second charts row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Headcount by Department"
          description="Active employee distribution across departments"
          type="bar"
          data={chartData?.byDepartment ?? DEPT_HEADCOUNT}
          xKey="dept"
          series={[{ key: "count", label: "Employees", color: "#0FB4A8" }]}
          height={220}
          legend={false}
          loading={chartQuery.isLoading}
          action={
            <Link href="/org">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View Org <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        />
        <ChartCard
          title="Employment Type"
          type="pie"
          data={chartData?.byEmploymentType ?? EMPLOYMENT_TYPE}
          series={[
            { key: "Full Time",  label: "Full Time",  color: "#0FB4A8" },
            { key: "Part Time",  label: "Part Time",  color: "#4F9AB3" },
            { key: "Contract",   label: "Contract",   color: "#16B27A" },
            { key: "Intern",     label: "Intern",     color: "#F4A91F" },
            { key: "Probation",  label: "Probation",  color: "#7B5CFF" },
          ]}
          height={220}
          xKey="name"
          loading={chartQuery.isLoading}
        />
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <DataTable
            title="Recent Joiners"
            columns={joinerColumns}
            data={(chartData?.recentJoiners ?? NEW_JOINERS).map((r: { id: number; name: string; dept: string; joinDate: Date | null }) => ({
              id: r.id,
              name: r.name,
              designation: "",
              dept: r.dept,
              joinDate: r.joinDate ?? new Date(),
            }))}
            pageSize={5}
            exportFilename="recent-joiners"
            emptyIcon={UserPlus}
            emptyTitle="No recent joiners"
            loading={chartQuery.isLoading}
            toolbarAction={
              <Link href="/employees">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  All Employees <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            }
          />
          <DataTable
            title="Upcoming Birthdays"
            columns={birthdayColumns}
            data={UPCOMING_BIRTHDAYS}
            pageSize={5}
            exportFilename="upcoming-birthdays"
            emptyIcon={Cake}
            emptyTitle="No upcoming birthdays"
          />
        </div>

        {/* Approval panel */}
        <div className="hcm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Approval</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Annual Leave — Sara Khan</p>
            </div>
          </div>

          <ApprovalTimeline
            steps={SAMPLE_APPROVAL_STEPS}
            currentStepId="2"
            overallStatus="pending"
          />

          {workflowsQuery.isLoading ? (
            <div className="mt-4 space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : workflowsQuery.data && workflowsQuery.data.length > 0 ? (
            <div className="mt-4 border-t pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Live Requests</p>
              {workflowsQuery.data.map(wf => (
                <div key={wf.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground">{wf.requestType}</span>
                  <Badge
                    variant={wf.status === "approved" ? "default" : wf.status === "rejected" ? "destructive" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {wf.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="No pending approvals" compact />
          )}

          <Link href="/approvals">
            <Button variant="outline" size="sm" className="w-full mt-4 text-xs gap-1">
              View All Approvals <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Quick stats footer ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Departments",    value: "12",   icon: Building2,  color: "text-primary" },
          { label: "Open Positions", value: "7",    icon: UserPlus,   color: "text-green-600" },
          { label: "Avg Tenure",     value: "3.2y", icon: TrendingUp, color: "text-amber-600" },
          { label: "Turnover Rate",  value: "4.1%", icon: Activity,   color: "text-red-500" },
        ].map(item => (
          <div key={item.label} className="hcm-card p-4 flex items-center gap-3">
            <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
            <div>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
