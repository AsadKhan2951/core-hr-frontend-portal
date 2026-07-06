import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, Users, Gift, Award, RefreshCw, LogOut } from "lucide-react";
import * as XLSX from "xlsx";

const companyId = 1;

type EmpRow = {
  id: number;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  employmentType: string | null;
  status: string | null;
  joinDate: Date | null;
  departmentName?: string;
  designationName?: string;
  locationName?: string;
  gender?: string | null;
  nationality?: string | null;
};

function HeadcountReport() {
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: employees, isLoading } = trpc.employees.list.useQuery({ companyId });
  const { data: departments } = trpc.org.listDepartments.useQuery({ companyId });

  const filtered = (employees ?? []).filter(e => {
    if (deptFilter !== "all" && String(e.departmentId) !== deptFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (typeFilter !== "all" && e.employmentType !== typeFilter) return false;
    return true;
  });

  const cols: ColumnDef<EmpRow>[] = [
    { key: "employeeNumber", header: "Emp #", sortable: true, render: (row) => <span className="text-xs font-mono text-muted-foreground">{row.employeeNumber ?? "—"}</span> },
    { key: "firstName", header: "Name", sortable: true, render: (row) => <span className="font-medium text-sm">{row.firstName} {row.lastName}</span> },
    { key: "departmentName", header: "Department", sortable: true, render: (row) => <span className="text-sm">{(row as unknown as { departmentName?: string }).departmentName ?? "—"}</span> },
    { key: "designationName", header: "Designation", sortable: true, render: (row) => <span className="text-sm">{(row as unknown as { designationName?: string }).designationName ?? "—"}</span> },
    { key: "employmentType", header: "Type", sortable: true, render: (row) => <span className="text-xs capitalize">{(row.employmentType ?? "—").replace("_", " ")}</span> },
    { key: "status", header: "Status", sortable: true, render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
        row.status === "active" ? "bg-emerald-100 text-emerald-800" :
        row.status === "on_leave" ? "bg-amber-100 text-amber-800" :
        "bg-gray-100 text-gray-600"
      }`}>{row.status ?? "—"}</span>
    )},
    { key: "joinDate", header: "Join Date", sortable: true, render: (row) => <span className="text-sm">{row.joinDate ? new Date(row.joinDate).toLocaleDateString() : "—"}</span> },
    { key: "gender", header: "Gender", render: (row) => <span className="text-sm capitalize">{row.gender ?? "—"}</span> },
    { key: "workEmail", header: "Work Email", render: (row) => <span className="text-xs text-muted-foreground">{row.workEmail ?? "—"}</span> },
  ];

  const exportExcel = () => {
    const rows = filtered.map(e => ({
      "Employee Number": e.employeeNumber ?? "",
      "First Name": e.firstName,
      "Last Name": e.lastName,
      "Department": (e as unknown as { departmentName?: string }).departmentName ?? "",
      "Designation": (e as unknown as { designationName?: string }).designationName ?? "",
      "Employment Type": e.employmentType ?? "",
      "Status": e.status ?? "",
      "Join Date": e.joinDate ? new Date(e.joinDate).toLocaleDateString() : "",
      "Gender": e.gender ?? "",
      "Work Email": e.workEmail ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Headcount Report");
    XLSX.writeFile(wb, "headcount_report.xlsx");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments ?? []).map((d: { id: number; name: string }) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="intern">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={exportExcel} className="h-8 ml-auto">
          <Download className="w-3.5 h-3.5 mr-1.5" />Export Excel
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} employee{filtered.length !== 1 ? "s" : ""} found</div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> :
        !filtered.length ? <EmptyState icon={Users} title="No employees" description="No employees match the selected filters." /> :
        <DataTable<EmpRow> columns={cols} data={filtered as unknown as EmpRow[]} exportFilename="headcount_report" />
      }
    </div>
  );
}

type BirthdayRow = { id: number; firstName: string; lastName: string; dateOfBirth: Date | null; departmentName?: string; daysUntilBirthday: number; nextBirthday: Date };

function BirthdaysReport() {
  const { data: birthdays, isLoading } = trpc.employees.reports.birthdays.useQuery({ companyId });
  const exportExcel = () => {
    const rows = (birthdays ?? []).map(e => ({
      "Name": `${e.firstName} ${e.lastName}`,
      "Department": (e as unknown as { departmentName?: string }).departmentName ?? "",
      "Date of Birth": e.dateOfBirth ? new Date(e.dateOfBirth).toLocaleDateString() : "",
      "Next Birthday": e.nextBirthday ? new Date(e.nextBirthday).toLocaleDateString() : "",
      "Days Until": e.daysUntilBirthday,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Birthdays");
    XLSX.writeFile(wb, "birthdays_report.xlsx");
  };
  const cols: ColumnDef<BirthdayRow>[] = [
    { key: "firstName", header: "Name", sortable: true, render: (row) => <span className="font-medium text-sm">{row.firstName} {row.lastName}</span> },
    { key: "departmentName", header: "Department", render: (row) => <span className="text-sm">{(row as unknown as { departmentName?: string }).departmentName ?? "—"}</span> },
    { key: "dateOfBirth", header: "Date of Birth", render: (row) => <span className="text-sm">{row.dateOfBirth ? new Date(row.dateOfBirth).toLocaleDateString() : "—"}</span> },
    { key: "daysUntilBirthday", header: "Days Until", sortable: true, render: (row) => (
      <span className={`text-sm font-medium ${row.daysUntilBirthday <= 7 ? "text-rose-600" : row.daysUntilBirthday <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
        {row.daysUntilBirthday === 0 ? "Today!" : `${row.daysUntilBirthday} days`}
      </span>
    )},
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportExcel} className="h-8"><Download className="w-3.5 h-3.5 mr-1.5" />Export Excel</Button></div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> :
        !birthdays?.length ? <EmptyState icon={Gift} title="No upcoming birthdays" description="No birthdays in the next 90 days." /> :
        <DataTable<BirthdayRow> columns={cols} data={birthdays as unknown as BirthdayRow[]} exportFilename="birthdays_report" />}
    </div>
  );
}

type AnniversaryRow = { id: number; firstName: string; lastName: string; joinDate: Date | null; departmentName?: string; daysUntilAnniversary: number; yearsOfService: number; nextAnniversary: Date };

function AnniversariesReport() {
  const { data: anniversaries, isLoading } = trpc.employees.reports.anniversaries.useQuery({ companyId });
  const exportExcel = () => {
    const rows = (anniversaries ?? []).map(e => ({
      "Name": `${e.firstName} ${e.lastName}`,
      "Department": (e as unknown as { departmentName?: string }).departmentName ?? "",
      "Join Date": e.joinDate ? new Date(e.joinDate).toLocaleDateString() : "",
      "Years of Service": e.yearsOfService,
      "Days Until": e.daysUntilAnniversary,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anniversaries");
    XLSX.writeFile(wb, "anniversaries_report.xlsx");
  };
  const cols: ColumnDef<AnniversaryRow>[] = [
    { key: "firstName", header: "Name", sortable: true, render: (row) => <span className="font-medium text-sm">{row.firstName} {row.lastName}</span> },
    { key: "departmentName", header: "Department", render: (row) => <span className="text-sm">{(row as unknown as { departmentName?: string }).departmentName ?? "—"}</span> },
    { key: "yearsOfService", header: "Years of Service", sortable: true, render: (row) => <span className="text-sm font-medium text-indigo-700">{row.yearsOfService} yr{row.yearsOfService !== 1 ? "s" : ""}</span> },
    { key: "daysUntilAnniversary", header: "Days Until", sortable: true, render: (row) => (
      <span className={`text-sm font-medium ${row.daysUntilAnniversary <= 7 ? "text-rose-600" : row.daysUntilAnniversary <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
        {row.daysUntilAnniversary === 0 ? "Today!" : `${row.daysUntilAnniversary} days`}
      </span>
    )},
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportExcel} className="h-8"><Download className="w-3.5 h-3.5 mr-1.5" />Export Excel</Button></div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> :
        !anniversaries?.length ? <EmptyState icon={Award} title="No upcoming anniversaries" description="No work anniversaries in the next 90 days." /> :
        <DataTable<AnniversaryRow> columns={cols} data={anniversaries as unknown as AnniversaryRow[]} exportFilename="anniversaries_report" />}
    </div>
  );
}

type TransferRow = { id: number; employeeId: number; effectiveDate: Date; status: string; reason: string | null; employeeName?: string; fromDepartmentName?: string; toDepartmentName?: string };

function TransfersReport() {
  const { data: transfers, isLoading } = trpc.employees.transfers.list.useQuery({ companyId });
  const exportExcel = () => {
    const rows = (transfers ?? []).map(t => ({
      "Employee": (t as unknown as { employeeName?: string }).employeeName ?? `EMP-${t.employeeId}`,
      "From": (t as unknown as { fromDepartmentName?: string }).fromDepartmentName ?? "",
      "To": (t as unknown as { toDepartmentName?: string }).toDepartmentName ?? "",
      "Effective Date": new Date(t.effectiveDate).toLocaleDateString(),
      "Status": t.status,
      "Reason": t.reason ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfers");
    XLSX.writeFile(wb, "transfers_report.xlsx");
  };
  const cols: ColumnDef<TransferRow>[] = [
    { key: "employeeName", header: "Employee", sortable: true, render: (row) => <span className="font-medium text-sm">{row.employeeName ?? `EMP-${row.employeeId}`}</span> },
    { key: "fromDepartmentName", header: "From", render: (row) => <span className="text-sm">{row.fromDepartmentName ?? "—"}</span> },
    { key: "toDepartmentName", header: "To", render: (row) => <span className="text-sm">{row.toDepartmentName ?? "—"}</span> },
    { key: "effectiveDate", header: "Effective Date", sortable: true, render: (row) => <span className="text-sm">{new Date(row.effectiveDate).toLocaleDateString()}</span> },
    { key: "status", header: "Status", sortable: true, render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
        row.status === "approved" || row.status === "executed" ? "bg-emerald-100 text-emerald-800" :
        row.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
      }`}>{row.status}</span>
    )},
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportExcel} className="h-8"><Download className="w-3.5 h-3.5 mr-1.5" />Export Excel</Button></div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> :
        !transfers?.length ? <EmptyState icon={RefreshCw} title="No transfers" description="No transfer records found." /> :
        <DataTable<TransferRow> columns={cols} data={transfers as unknown as TransferRow[]} exportFilename="transfers_report" />}
    </div>
  );
}

type ExitRow = { id: number; employeeId: number; exitType: string; lastWorkingDay: Date; status: string; reason: string | null; employeeName?: string };

function ExitsReport() {
  const { data: exits, isLoading } = trpc.employees.exits.list.useQuery({ companyId });
  const exportExcel = () => {
    const rows = (exits ?? []).map(e => ({
      "Employee": (e as unknown as { employeeName?: string }).employeeName ?? `EMP-${e.employeeId}`,
      "Exit Type": e.exitType,
      "Last Working Day": new Date(e.lastWorkingDay).toLocaleDateString(),
      "Status": e.status,
      "Reason": e.reason ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exits");
    XLSX.writeFile(wb, "exits_report.xlsx");
  };
  const cols: ColumnDef<ExitRow>[] = [
    { key: "employeeName", header: "Employee", sortable: true, render: (row) => <span className="font-medium text-sm">{row.employeeName ?? `EMP-${row.employeeId}`}</span> },
    { key: "exitType", header: "Exit Type", sortable: true, render: (row) => <span className="text-sm capitalize">{row.exitType.replace("_", " ")}</span> },
    { key: "lastWorkingDay", header: "Last Working Day", sortable: true, render: (row) => <span className="text-sm">{new Date(row.lastWorkingDay).toLocaleDateString()}</span> },
    { key: "status", header: "Status", sortable: true, render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
        row.status === "cleared" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}>{row.status}</span>
    )},
    { key: "reason", header: "Reason", render: (row) => <span className="text-sm text-muted-foreground">{row.reason ?? "—"}</span> },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportExcel} className="h-8"><Download className="w-3.5 h-3.5 mr-1.5" />Export Excel</Button></div>
      {isLoading ? <Skeleton className="h-64 rounded-xl" /> :
        !exits?.length ? <EmptyState icon={LogOut} title="No exits" description="No exit records found." /> :
        <DataTable<ExitRow> columns={cols} data={exits as unknown as ExitRow[]} exportFilename="exits_report" />}
    </div>
  );
}

const REPORTS = [
  { id: "headcount", label: "Headcount", icon: Users },
  { id: "birthdays", label: "Birthdays", icon: Gift },
  { id: "anniversaries", label: "Anniversaries", icon: Award },
  { id: "transfers", label: "Transfers", icon: RefreshCw },
  { id: "exits", label: "Exits", icon: LogOut },
];

export default function EmployeeReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All reports include Excel export</p>
        </div>
        <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
      </div>
      <Tabs defaultValue="headcount">
        <TabsList className="flex-wrap h-auto gap-1">
          {REPORTS.map(r => (
            <TabsTrigger key={r.id} value={r.id} className="flex items-center gap-1.5 text-xs">
              <r.icon className="w-3.5 h-3.5" />{r.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="headcount" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />Headcount Report</CardTitle></CardHeader><CardContent><HeadcountReport /></CardContent></Card>
        </TabsContent>
        <TabsContent value="birthdays" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Gift className="w-4 h-4" />Upcoming Birthdays</CardTitle></CardHeader><CardContent><BirthdaysReport /></CardContent></Card>
        </TabsContent>
        <TabsContent value="anniversaries" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" />Work Anniversaries</CardTitle></CardHeader><CardContent><AnniversariesReport /></CardContent></Card>
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" />Transfer History</CardTitle></CardHeader><CardContent><TransfersReport /></CardContent></Card>
        </TabsContent>
        <TabsContent value="exits" className="mt-4">
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><LogOut className="w-4 h-4" />Exit Records</CardTitle></CardHeader><CardContent><ExitsReport /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
