/**
 * PayrollDashboardPage — Payroll Module 4
 * Overview dashboard: current month stats, recent runs, pending approvals, anomaly summary.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DollarSign, Users, AlertTriangle, CheckCircle, Clock, TrendingUp,
  Play, FileText, Bot, ChevronRight
} from "lucide-react";

const COMPANY_ID = 1;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const runStatusColor: Record<string, string> = {
  processing:        "status-open",
  pending_approval:  "status-pending",
  approved:          "status-approved",
  locked:            "status-leave",
  disbursed:         "status-disbursed",
  cancelled:         "status-cancelled",
};

export default function PayrollDashboardPage() {
  const now = new Date();

  const { data: runs = [], isLoading } = trpc.payroll.runs.list.useQuery({ companyId: COMPANY_ID });
  const { data: summary } = trpc.payroll.reports.summary.useQuery({ companyId: COMPANY_ID, month: now.getMonth() + 1, year: now.getFullYear() });
  const { data: deptReport = [] } = trpc.payroll.reports.byDepartment.useQuery({ companyId: COMPANY_ID, year: now.getFullYear(), month: now.getMonth() + 1 });

  // Latest run
  const latestRun = runs[0] ?? null;
  const pendingApprovals = runs.filter((r) => r.status === "pending_approval");
  const currentYearRuns = runs.filter((r) => r.year === now.getFullYear());

  const totalNetYTD = currentYearRuns.reduce((sum, r) => sum + parseFloat(r.totalNet || "0"), 0);
  const totalGrossYTD = currentYearRuns.reduce((sum, r) => sum + parseFloat(r.totalGross || "0"), 0);
  const avgEmployees = currentYearRuns.length > 0
    ? Math.round(currentYearRuns.reduce((sum, r) => sum + r.employeeCount, 0) / currentYearRuns.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview for {now.getFullYear()}</p>
        </div>
        <Link href="/payroll/run">
          <Button>
            <Play className="w-4 h-4 mr-2" />Run Payroll
          </Button>
        </Link>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Paid YTD</p>
                <p className="text-2xl font-bold mt-1">AED {(totalNetYTD / 1000).toFixed(0)}K</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(22,178,122,.12)" }}>
                <DollarSign className="w-5 h-5" style={{ color: "var(--success)" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Employees</p>
                <p className="text-2xl font-bold mt-1">{avgEmployees}</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(15,180,168,.12)" }}>
                <Users className="w-5 h-5" style={{ color: "var(--brand-teal)" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold mt-1">{pendingApprovals.length}</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: pendingApprovals.length > 0 ? "rgba(244,169,31,.12)" : "rgba(122,136,150,.12)" }}>
                <Clock className="w-5 h-5" style={{ color: pendingApprovals.length > 0 ? "#A06B00" : "#7A8896" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Runs This Year</p>
                <p className="text-2xl font-bold mt-1">{currentYearRuns.length}</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(123,92,255,.12)" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "var(--info)" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── RECENT RUNS ──────────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payroll Runs</CardTitle>
            <Link href="/payroll/run">
              <Button size="sm" variant="ghost">View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No payroll runs yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {runs.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{MONTHS[r.month - 1]} {r.year}</p>
                      <p className="text-xs text-muted-foreground">{r.employeeCount} employees · {r.currency} {parseFloat(r.totalNet).toLocaleString()} net</p>
                    </div>
                    <span className={runStatusColor[r.status] ?? "status-draft"}>
                      {r.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── QUICK ACTIONS + PENDING ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Pending approvals */}
          {pendingApprovals.length > 0 && (
            <Card className="border-[rgba(244,169,31,.25)]" style={{ background: "rgba(244,169,31,.06)" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: "var(--warning)" }}>
                  <Clock className="w-4 h-4" />
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingApprovals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <span className="text-sm">{MONTHS[r.month - 1]} {r.year}</span>
                    <Link href="/payroll/run">
                      <Button size="sm" variant="outline" className="h-7 text-[var(--warning)] border-[rgba(244,169,31,.35)] hover:bg-[rgba(244,169,31,.08)]">Review</Button>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Salary Structures", href: "/payroll/structures", icon: <DollarSign className="w-4 h-4" /> },
                { label: "Tax & PF Settings", href: "/payroll/tax", icon: <CheckCircle className="w-4 h-4" /> },
                { label: "Loans & Advances", href: "/payroll/loans", icon: <AlertTriangle className="w-4 h-4" /> },
                { label: "Payslips", href: "/payroll/payslips", icon: <FileText className="w-4 h-4" /> },
                { label: "Reports", href: "/payroll/reports", icon: <TrendingUp className="w-4 h-4" /> },
              ].map(({ label, href, icon }) => (
                <Link key={href} href={href}>
                  <Button variant="ghost" className="w-full justify-start gap-2 h-9">
                    {icon}{label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* By department */}
          {deptReport.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">This Month by Department</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deptReport.slice(0, 5).map((d) => (
                  <div key={d.departmentId ?? "none"} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">Dept #{d.departmentId ?? "—"}</span>
                    <span className="font-medium">{d.headcount} emp</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
