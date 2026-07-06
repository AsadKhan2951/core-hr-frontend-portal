import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, UserPlus, UserCheck, UserX, Building2,
  Download, Upload, Filter, Search, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type EmpRow = {
  id: number;
  firstName: string;
  lastName: string;
  employeeNumber?: string | null;
  workEmail?: string | null;
  departmentId?: number | null;
  designationId?: number | null;
  employmentType?: string | null;
  status?: string | null;
  joinDate?: Date | null;
  gender?: string | null;
  nationality?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  locationName?: string | null;
  [key: string]: unknown;
};

const STATUS_CSS: Record<string, string> = {
  active: "status-active",
  inactive: "status-inactive",
  on_leave: "status-leave",
  terminated: "status-rejected",
  resigned: "status-draft",
};

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time", part_time: "Part-time",
  contract: "Contract", intern: "Intern", probation: "Probation",
};

const RISK_CSS: Record<string, string> = {
  low: "status-active", medium: "status-pending",
  high: "status-late", critical: "status-rejected",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_CSS[status] ?? "status-draft"}>
      {status.replace("_", " ")}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  return (
    <span className={RISK_CSS[level] ?? "status-draft"}>
      <Sparkles className="w-3 h-3" />
      {level}
    </span>
  );
}

export default function EmployeesPage() {
  const [, navigate] = useLocation();
  const companyId = 1;

  const { data: employees, isLoading } = trpc.employees.list.useQuery({ companyId });
  const { data: riskData } = trpc.employees.ai.batchAttritionRisk.useQuery({ companyId });

  const riskMap = useMemo(() => {
    const m: Record<number, { riskLevel: string; riskScore: number }> = {};
    (riskData ?? []).forEach((r: { employeeId: number; riskLevel: string; riskScore: number }) => {
      m[r.employeeId] = { riskLevel: r.riskLevel, riskScore: r.riskScore };
    });
    return m;
  }, [riskData]);

  const stats = useMemo(() => {
    if (!employees) return { total: 0, active: 0, onLeave: 0, inactive: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.status === "active").length,
      onLeave: employees.filter(e => e.status === "on_leave").length,
      inactive: employees.filter(e => ["inactive","terminated","resigned"].includes(e.status ?? "")).length,
    };
  }, [employees]);

  const columns: ColumnDef<EmpRow>[] = [
    {
      key: "firstName", header: "Employee", sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {row.firstName?.[0]}{row.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <button onClick={() => navigate(`/employees/${row.id}`)}
              className="font-medium text-sm hover:text-primary transition-colors">
              {row.firstName} {row.lastName}
            </button>
            <p className="text-xs text-muted-foreground">{row.employeeNumber ?? `EMP-${String(row.id).padStart(4,"0")}`}</p>
          </div>
        </div>
      ),
    },
    { key: "workEmail", header: "Email", sortable: true, render: (row) => <span className="text-sm text-muted-foreground">{row.workEmail ?? "—"}</span> },
    { key: "departmentName", header: "Department", sortable: true, render: (row) => <span className="text-sm">{row.departmentName ?? "—"}</span> },
    { key: "designationName", header: "Designation", sortable: true, render: (row) => <span className="text-sm">{row.designationName ?? "—"}</span> },
    { key: "employmentType", header: "Type", sortable: true, render: (row) => <span className="text-sm text-muted-foreground">{EMP_TYPE_LABELS[row.employmentType ?? ""] ?? row.employmentType}</span> },
    { key: "status", header: "Status", sortable: true, render: (row) => <StatusBadge status={row.status ?? "active"} /> },
    { key: "joinDate", header: "Join Date", sortable: true, render: (row) => row.joinDate ? <span className="text-sm">{new Date(row.joinDate as Date).toLocaleDateString()}</span> : <span className="text-muted-foreground">—</span> },
    {
      key: "id", header: "Risk",
      render: (row) => {
        const risk = riskMap[row.id];
        return risk ? <RiskBadge level={risk.riskLevel} /> : <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    { key: "id", header: "", noExport: true, render: (row) => <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${row.id}`)}>View</Button> },
  ];

  const handleExport = () => {
    if (!employees?.length) return;
    const rows = employees.map(e => ({
      "Employee #": e.employeeNumber ?? "", "First Name": e.firstName, "Last Name": e.lastName,
      "Work Email": e.workEmail ?? "", "Department": (e as EmpRow).departmentName ?? "",
      "Designation": (e as EmpRow).designationName ?? "",
      "Employment Type": EMP_TYPE_LABELS[e.employmentType ?? ""] ?? e.employmentType ?? "",
      "Status": e.status, "Join Date": e.joinDate ? new Date(e.joinDate).toLocaleDateString() : "",
      "Nationality": e.nationality ?? "", "Gender": e.gender ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, `employees_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Employee list exported to Excel");
  };

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your workforce directory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1.5" />Export</Button>
          <Link href="/employees/bulk-upload"><Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1.5" />Bulk Upload</Button></Link>
          <Link href="/employees/new"><Button size="sm"><UserPlus className="w-4 h-4 mr-1.5" />Add Employee</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={stats.total} icon={Users} color="indigo" />
        <StatCard title="Active" value={stats.active} icon={UserCheck} color="green"
          delta={stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0} deltaLabel="of total" />
        <StatCard title="On Leave" value={stats.onLeave} icon={Building2} color="amber" />
        <StatCard title="Inactive / Exited" value={stats.inactive} icon={UserX} color="red" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/employees/matrix"><Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1.5" />Employee Matrix</Button></Link>
        <Link href="/employees/reports"><Button variant="outline" size="sm"><Search className="w-4 h-4 mr-1.5" />Reports</Button></Link>
        <Link href="/employees/workforce-ai">
          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/5">
            <Sparkles className="w-4 h-4 mr-1.5" />AI Workforce Query
          </Button>
        </Link>
      </div>

      {!employees?.length ? (
        <EmptyState icon={Users} title="No employees yet"
          description="Add your first employee or use bulk upload to import from Excel."
          action={{ label: "Add Employee", onClick: () => navigate("/employees/new") }}
          secondaryAction={{ label: "Bulk Upload", onClick: () => navigate("/employees/bulk-upload") }} />
      ) : (
        <DataTable<EmpRow> columns={columns} data={employees as EmpRow[]}
          exportFilename="employees" pageSize={25} title="Employee Directory" />
      )}
    </div>
  );
}
