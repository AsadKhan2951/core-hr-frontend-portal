import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Building2, Clock, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

const companyId = 1;

type MatrixRow = {
  departmentId: number;
  departmentName: string;
  total: number;
  active: number;
  onLeave: number;
  fullTime: number;
  partTime: number;
  contract: number;
  male: number;
  female: number;
};

function exportMatrixToExcel(data: MatrixRow[]) {
  const rows = data.map(r => ({
    Department: r.departmentName,
    "Total Headcount": r.total,
    Active: r.active,
    "On Leave": r.onLeave,
    "Full Time": r.fullTime,
    "Part Time": r.partTime,
    Contract: r.contract,
    Male: r.male,
    Female: r.female,
    "Gender Ratio (M:F)": r.female > 0 ? `${(r.male / r.female).toFixed(1)}:1` : `${r.male}:0`,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employee Matrix");
  XLSX.writeFile(wb, "employee_matrix.xlsx");
}

export default function EmployeeMatrixPage() {
  const { data: matrix, isLoading: loadingMatrix } = trpc.employees.reports.departmentMatrix.useQuery({ companyId });
  const { data: tenure, isLoading: loadingTenure } = trpc.employees.reports.tenure.useQuery({ companyId });
  const { data: turnover, isLoading: loadingTurnover } = trpc.employees.reports.turnover.useQuery({ companyId });
  const { data: employees, isLoading: loadingEmps } = trpc.employees.list.useQuery({ companyId });

  // Aggregate stats
  const stats = useMemo(() => {
    if (!matrix) return null;
    return {
      total: matrix.reduce((s, r) => s + r.total, 0),
      active: matrix.reduce((s, r) => s + r.active, 0),
      onLeave: matrix.reduce((s, r) => s + r.onLeave, 0),
      fullTime: matrix.reduce((s, r) => s + r.fullTime, 0),
      contract: matrix.reduce((s, r) => s + r.contract, 0),
      male: matrix.reduce((s, r) => s + r.male, 0),
      female: matrix.reduce((s, r) => s + r.female, 0),
    };
  }, [matrix]);

  // Chart data
  const headcountByDept = useMemo(() =>
    (matrix ?? []).map(r => ({ name: r.departmentName.length > 12 ? r.departmentName.slice(0, 12) + "…" : r.departmentName, value: r.total })),
    [matrix]
  );
  const genderByDept = useMemo(() =>
    (matrix ?? []).map(r => ({ name: r.departmentName.length > 10 ? r.departmentName.slice(0, 10) + "…" : r.departmentName, Male: r.male, Female: r.female })),
    [matrix]
  );
  const employmentTypeData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Full Time", value: stats.fullTime },
      { name: "Part Time", value: matrix?.reduce((s, r) => s + r.partTime, 0) ?? 0 },
      { name: "Contract", value: stats.contract },
    ].map(r => ({ name: r.name, value: typeof r.value === "number" ? r.value : 0 }));
  }, [stats, matrix]);
  const tenureData = useMemo(() =>
    (tenure ?? []).map(r => ({ name: r.range, value: r.count })),
    [tenure]
  );

  const matrixCols: ColumnDef<MatrixRow>[] = [
    { key: "departmentName", header: "Department", sortable: true, render: (row) => <span className="font-medium text-sm">{row.departmentName}</span> },
    { key: "total", header: "Total", sortable: true, render: (row) => <span className="font-bold text-sm">{row.total}</span> },
    { key: "active", header: "Active", sortable: true, render: (row) => (
      <span className="text-sm text-emerald-700 font-medium">{row.active}</span>
    )},
    { key: "onLeave", header: "On Leave", sortable: true, render: (row) => (
      <span className="text-sm text-amber-700">{row.onLeave}</span>
    )},
    { key: "fullTime", header: "Full Time", sortable: true, render: (row) => <span className="text-sm">{row.fullTime}</span> },
    { key: "partTime", header: "Part Time", sortable: true, render: (row) => <span className="text-sm">{row.partTime}</span> },
    { key: "contract", header: "Contract", sortable: true, render: (row) => <span className="text-sm">{row.contract}</span> },
    { key: "male", header: "Male", sortable: true, render: (row) => <span className="text-sm">{row.male}</span> },
    { key: "female", header: "Female", sortable: true, render: (row) => <span className="text-sm">{row.female}</span> },
    { key: "departmentId", header: "Gender Ratio", render: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.female > 0 ? `${(row.male / row.female).toFixed(1)}:1` : `${row.male}:0`}
      </span>
    )},
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Matrix Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Workforce composition across departments, employment types, and demographics</p>
        </div>
        <Button variant="outline" onClick={() => matrix && exportMatrixToExcel(matrix)}>
          <Download className="w-4 h-4 mr-1.5" />Export Matrix
        </Button>
      </div>

      {/* Summary stat cards */}
      {loadingMatrix ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Headcount" value={stats?.total ?? 0} icon={Users} color="indigo" />
          <StatCard title="Active Employees" value={stats?.active ?? 0} icon={TrendingUp} color="green"
            delta={stats?.total ? Math.round((stats.active / stats.total) * 100) : 0} deltaLabel="% of total" />
          <StatCard title="On Leave" value={stats?.onLeave ?? 0} icon={Clock} color="amber" />
          <StatCard title="Contract Staff" value={stats?.contract ?? 0} icon={Building2} color="blue" />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Headcount by Department"
          type="bar"
          data={headcountByDept}
          xKey="name"
          series={[{ key: "value", label: "Headcount", color: "#6366f1" }]}
          loading={loadingMatrix}
          height={240}
        />
        <ChartCard
          title="Gender Distribution by Department"
          type="bar"
          data={genderByDept}
          xKey="name"
          series={[{ key: "Male", label: "Male", color: "#6366f1" }, { key: "Female", label: "Female", color: "#ec4899" }]}
          loading={loadingMatrix}
          height={240}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard
          title="Employment Type Breakdown"
          type="pie"
          data={employmentTypeData}
          xKey="name"
          series={[{ key: "value", label: "Count", color: "#6366f1" }, { key: "value", label: "Count", color: "#8b5cf6" }, { key: "value", label: "Count", color: "#a78bfa" }]}
          loading={loadingMatrix}
          height={220}
        />
        <ChartCard
          title="Tenure Distribution"
          type="bar"
          data={tenureData}
          xKey="name"
          series={[{ key: "value", label: "Employees", color: "#06b6d4" }]}
          loading={loadingTenure}
          height={220}
        />
      </div>

      {/* Turnover stats */}
      {!loadingTurnover && turnover && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Turnover Statistics ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold">{(turnover as unknown as { exits?: number }).exits ?? 0}</div>
                <div className="text-sm text-muted-foreground">Total Exits</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{(turnover as unknown as { joiners?: number }).joiners ?? 0}</div>
                <div className="text-sm text-muted-foreground">New Joiners</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {(turnover as unknown as { rate?: number }).rate != null ? `${((turnover as unknown as { rate: number }).rate).toFixed(1)}%` : "—"}
                </div>
                <div className="text-sm text-muted-foreground">Turnover Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department matrix table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Department Breakdown Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMatrix ? (
            <Skeleton className="h-64 m-4 rounded-xl" />
          ) : !matrix?.length ? (
            <EmptyState icon={BarChart3} title="No data" description="No department data available." />
          ) : (
            <DataTable<MatrixRow>
              columns={matrixCols}
              data={matrix}
              exportFilename="employee_matrix"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
