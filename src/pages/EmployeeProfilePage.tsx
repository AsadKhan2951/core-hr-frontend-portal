import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, User, FileText, Package, History,
  Sparkles, Edit, LogOut, RefreshCw, Mail, Phone,
  Calendar, Shield, Brain, Loader2, Save,
} from "lucide-react";

const COMPANY_ID = 1;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-600",
  on_leave: "bg-amber-100 text-amber-800",
  terminated: "bg-red-100 text-red-800",
  resigned: "bg-orange-100 text-orange-800",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-orange-700 bg-orange-50 border-orange-200",
  critical: "text-red-700 bg-red-50 border-red-200",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

function AttritionRiskPanel({ employeeId, companyId }: { employeeId: number; companyId: number }) {
  const { data: risk, isLoading } = trpc.employees.ai.attritionRisk.useQuery({ employeeId, companyId });
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!risk) return null;
  return (
    <Card className={`border ${RISK_COLORS[risk.riskLevel]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4" />AI Attrition Risk Assessment
          </CardTitle>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />AI Generated — Review before acting
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Risk Score</span>
              <span className="text-sm font-bold">{risk.riskScore}/100</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div className={`h-2 rounded-full transition-all ${
                risk.riskLevel === "low" ? "bg-emerald-500" :
                risk.riskLevel === "medium" ? "bg-amber-500" :
                risk.riskLevel === "high" ? "bg-orange-500" : "bg-red-500"
              }`} style={{ width: `${risk.riskScore}%` }} />
            </div>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full border capitalize ${RISK_COLORS[risk.riskLevel]}`}>
            {risk.riskLevel}
          </span>
        </div>
        <div className="space-y-2">
          {risk.factors.map((f: { factor: string; impact: string; description: string }, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                f.impact === "positive" ? "bg-emerald-500" : f.impact === "negative" ? "bg-red-500" : "bg-gray-400"
              }`} />
              <div><span className="font-medium">{f.factor}</span><span className="text-muted-foreground ml-1">— {f.description}</span></div>
            </div>
          ))}
        </div>
        <div className="bg-white/60 rounded-lg p-3 text-xs">
          <span className="font-medium">Recommendation: </span>
          <span className="text-muted-foreground">{risk.recommendation}</span>
        </div>
        <p className="text-xs text-muted-foreground italic">
          Confidence: {risk.confidence} · Computed {new Date(risk.computedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

type DocRow = { id: number; documentType: string; documentName: string; expiryDate?: Date | null; isVerified?: boolean | null; [key: string]: unknown };
type AssetRow = { id: number; assetType: string; assetName: string; assetTag?: string | null; status?: string | null; assignedDate?: Date | null; [key: string]: unknown };
type HistoryRow = { id: number; eventType: string; effectiveDate: Date; description?: string | null; [key: string]: unknown };

function DocumentsTab({ employeeId, companyId }: { employeeId: number; companyId: number }) {
  const { data: docs, isLoading } = trpc.employees.documents.list.useQuery({ employeeId, companyId });
  const columns: ColumnDef<DocRow>[] = [
    { key: "documentType", header: "Type", sortable: true, render: (row) => <span className="capitalize text-sm">{row.documentType.replace("_"," ")}</span> },
    { key: "documentName", header: "Name", sortable: true, render: (row) => <span className="text-sm font-medium">{row.documentName}</span> },
    { key: "expiryDate", header: "Expiry", sortable: true, render: (row) => row.expiryDate ? <span className="text-sm">{new Date(row.expiryDate as Date).toLocaleDateString()}</span> : <span className="text-muted-foreground text-sm">—</span> },
    { key: "isVerified", header: "Verified", render: (row) => row.isVerified
      ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Verified</span>
      : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span> },
  ];
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!docs?.length) return <EmptyState icon={FileText} title="No documents" description="No documents uploaded yet." />;
  return <DataTable<DocRow> columns={columns} data={docs as unknown as DocRow[]} pageSize={10} />;
}

function AssetsTab({ employeeId, companyId }: { employeeId: number; companyId: number }) {
  const { data: assets, isLoading } = trpc.employees.assets.listByEmployee.useQuery({ employeeId, companyId });
  const columns: ColumnDef<AssetRow>[] = [
    { key: "assetType", header: "Type", sortable: true, render: (row) => <span className="capitalize text-sm">{row.assetType.replace("_"," ")}</span> },
    { key: "assetName", header: "Asset", sortable: true, render: (row) => <span className="text-sm font-medium">{row.assetName}</span> },
    { key: "assetTag", header: "Tag", render: (row) => <span className="text-sm font-mono text-muted-foreground">{row.assetTag ?? "—"}</span> },
    { key: "status", header: "Status", render: (row) => <span className="capitalize text-sm">{String(row.status ?? "").replace("_"," ")}</span> },
    { key: "assignedDate", header: "Assigned", render: (row) => row.assignedDate ? <span className="text-sm">{new Date(row.assignedDate as Date).toLocaleDateString()}</span> : <span className="text-muted-foreground">—</span> },
  ];
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!assets?.length) return <EmptyState icon={Package} title="No assets" description="No assets assigned yet." />;
  return <DataTable<AssetRow> columns={columns} data={assets as AssetRow[]} pageSize={10} />;
}

function HistoryTab({ employeeId, companyId }: { employeeId: number; companyId: number }) {
  const { data: history, isLoading } = trpc.employees.history.useQuery({ employeeId, companyId });
  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (!history?.length) return <EmptyState icon={History} title="No history" description="No employment history recorded." />;
  return (
    <div className="space-y-3">
      {(history as HistoryRow[]).map((h) => (
        <div key={h.id} className="flex gap-3 p-3 rounded-lg border bg-card">
          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{h.eventType.replace("_"," ")}</span>
              <span className="text-xs text-muted-foreground">{new Date(h.effectiveDate).toLocaleDateString()}</span>
            </div>
            {h.description && <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Edit Employee Dialog ────────────────────────────────────────────────────────
type EmpRecord = {
  id: number; companyId: number; firstName: string; lastName: string;
  displayName?: string | null; gender?: string | null; dateOfBirth?: Date | null;
  nationality?: string | null; nationalId?: string | null; maritalStatus?: string | null;
  workEmail?: string | null; personalEmail?: string | null;
  workPhone?: string | null; personalPhone?: string | null; address?: string | null;
  employeeNumber?: string | null; departmentId?: number | null; designationId?: number | null;
  locationId?: number | null; hcmRoleId?: number | null; reportsToId?: number | null;
  joinDate?: Date | null; employmentType?: string | null; status?: string | null;
  emergencyContactName?: string | null; emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null; bankName?: string | null;
  bankAccountNumber?: string | null; bankIban?: string | null;
  [key: string]: unknown;
};

function EditEmployeeDialog({
  open, onClose, employee,
}: { open: boolean; onClose: () => void; employee: EmpRecord }) {
  const utils = trpc.useUtils();
  const { data: departments = [] } = trpc.org.listDepartments.useQuery({ companyId: COMPANY_ID });
  const { data: designations = [] } = trpc.org.listDesignations.useQuery({ companyId: COMPANY_ID });
  const { data: locations = [] } = trpc.org.listLocations.useQuery({ companyId: COMPANY_ID });
  const { data: roles = [] } = trpc.roles.list.useQuery({ companyId: COMPANY_ID });
  const { data: allEmployees = [] } = trpc.employees.list.useQuery({ companyId: COMPANY_ID });

  const toDateStr = (d: Date | null | undefined) => d ? new Date(d).toISOString().split("T")[0] : "";

  const [form, setForm] = useState({
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    displayName: employee.displayName ?? "",
    gender: employee.gender ?? "",
    dateOfBirth: toDateStr(employee.dateOfBirth),
    nationality: employee.nationality ?? "",
    nationalId: employee.nationalId ?? "",
    maritalStatus: employee.maritalStatus ?? "",
    workEmail: employee.workEmail ?? "",
    personalEmail: employee.personalEmail ?? "",
    workPhone: employee.workPhone ?? "",
    personalPhone: employee.personalPhone ?? "",
    address: employee.address ?? "",
    employeeNumber: employee.employeeNumber ?? "",
    departmentId: employee.departmentId ? String(employee.departmentId) : "",
    designationId: employee.designationId ? String(employee.designationId) : "",
    locationId: employee.locationId ? String(employee.locationId) : "",
    hcmRoleId: employee.hcmRoleId ? String(employee.hcmRoleId) : "",
    reportsToId: employee.reportsToId ? String(employee.reportsToId) : "",
    joinDate: toDateStr(employee.joinDate),
    employmentType: employee.employmentType ?? "",
    status: employee.status ?? "active",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
    emergencyContactRelation: employee.emergencyContactRelation ?? "",
    bankName: employee.bankName ?? "",
    bankAccountNumber: employee.bankAccountNumber ?? "",
    bankIban: employee.bankIban ?? "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const setSelect = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Employee updated successfully");
      utils.employees.getById.invalidate({ id: employee.id, companyId: COMPANY_ID });
      utils.employees.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    updateMutation.mutate({
      id: employee.id,
      companyId: COMPANY_ID,
      data: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim() || undefined,
        gender: (form.gender as "male" | "female" | "other" | "prefer_not_to_say") || undefined,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : undefined,
        nationality: form.nationality || undefined,
        nationalId: form.nationalId || undefined,
        maritalStatus: (form.maritalStatus as "single" | "married" | "divorced" | "widowed") || undefined,
        workEmail: form.workEmail || undefined,
        personalEmail: form.personalEmail || undefined,
        workPhone: form.workPhone || undefined,
        personalPhone: form.personalPhone || undefined,
        address: form.address || undefined,
        employeeNumber: form.employeeNumber || undefined,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        designationId: form.designationId ? Number(form.designationId) : undefined,
        locationId: form.locationId ? Number(form.locationId) : undefined,
        hcmRoleId: form.hcmRoleId ? Number(form.hcmRoleId) : undefined,
        reportsToId: form.reportsToId && form.reportsToId !== "none" ? Number(form.reportsToId) : undefined,
        joinDate: form.joinDate ? new Date(form.joinDate) : undefined,
        employmentType: (form.employmentType as "full_time" | "part_time" | "contract" | "intern" | "probation") || undefined,
        status: (form.status as "active" | "inactive" | "on_leave" | "terminated" | "resigned") || undefined,
        emergencyContactName: form.emergencyContactName || undefined,
        emergencyContactPhone: form.emergencyContactPhone || undefined,
        emergencyContactRelation: form.emergencyContactRelation || undefined,
        bankName: form.bankName || undefined,
        bankAccountNumber: form.bankAccountNumber || undefined,
        bankIban: form.bankIban || undefined,
      },
    });
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee — {employee.firstName} {employee.lastName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Personal Information</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="First Name *"><Input value={form.firstName} onChange={set("firstName")} /></F>
              <F label="Last Name *"><Input value={form.lastName} onChange={set("lastName")} /></F>
              <F label="Display Name"><Input value={form.displayName} onChange={set("displayName")} /></F>
              <F label="Gender">
                <Select value={form.gender} onValueChange={setSelect("gender")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} /></F>
              <F label="Nationality"><Input value={form.nationality} onChange={set("nationality")} /></F>
              <F label="National ID"><Input value={form.nationalId} onChange={set("nationalId")} /></F>
              <F label="Marital Status">
                <Select value={form.maritalStatus} onValueChange={setSelect("maritalStatus")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
          </div>
          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Work Email"><Input type="email" value={form.workEmail} onChange={set("workEmail")} /></F>
              <F label="Personal Email"><Input type="email" value={form.personalEmail} onChange={set("personalEmail")} /></F>
              <F label="Work Phone"><Input value={form.workPhone} onChange={set("workPhone")} /></F>
              <F label="Personal Phone"><Input value={form.personalPhone} onChange={set("personalPhone")} /></F>
              <div className="col-span-2"><F label="Address"><Input value={form.address} onChange={set("address")} /></F></div>
            </div>
          </div>
          {/* Employment */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Employment</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Employee Number"><Input value={form.employeeNumber} onChange={set("employeeNumber")} /></F>
              <F label="Join Date"><Input type="date" value={form.joinDate} onChange={set("joinDate")} /></F>
              <F label="Department">
                <Select value={form.departmentId} onValueChange={setSelect("departmentId")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(departments as { id: number; name: string }[]).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Designation">
                <Select value={form.designationId} onValueChange={setSelect("designationId")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(designations as { id: number; name: string }[]).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Location">
                <Select value={form.locationId} onValueChange={setSelect("locationId")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(locations as { id: number; name: string }[]).map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="CORE HR Role">
                <Select value={form.hcmRoleId} onValueChange={setSelect("hcmRoleId")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(roles as { id: number; name: string }[]).map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Reports To">
                <Select value={form.reportsToId} onValueChange={setSelect("reportsToId")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {(allEmployees as { id: number; firstName: string; lastName: string }[])
                      .filter((e) => e.id !== employee.id)
                      .map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </F>
              <F label="Employment Type">
                <Select value={form.employmentType} onValueChange={setSelect("employmentType")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                  </SelectContent>
                </Select>
              </F>
              <F label="Status">
                <Select value={form.status} onValueChange={setSelect("status")}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                  </SelectContent>
                </Select>
              </F>
            </div>
          </div>
          {/* Emergency + Bank */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Emergency Contact &amp; Bank</p>
            <div className="grid grid-cols-2 gap-3">
              <F label="Emergency Contact Name"><Input value={form.emergencyContactName} onChange={set("emergencyContactName")} /></F>
              <F label="Emergency Phone"><Input value={form.emergencyContactPhone} onChange={set("emergencyContactPhone")} /></F>
              <F label="Relationship"><Input value={form.emergencyContactRelation} onChange={set("emergencyContactRelation")} /></F>
              <F label="Bank Name"><Input value={form.bankName} onChange={set("bankName")} /></F>
              <F label="Account Number"><Input value={form.bankAccountNumber} onChange={set("bankAccountNumber")} /></F>
              <F label="IBAN"><Input value={form.bankIban} onChange={set("bankIban")} /></F>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="min-w-[100px]">
            {updateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function EmployeeProfilePage({ employeeId: propId }: { employeeId?: number } = {}) {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/employees/:id");
  const employeeId = propId ?? parseInt(params?.id ?? "0");
  const [editOpen, setEditOpen] = useState(false);

  const { data: employee, isLoading } = trpc.employees.getById.useQuery(
    { id: employeeId, companyId: COMPANY_ID }, { enabled: !!employeeId }
  );

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="col-span-2 h-64 rounded-xl" />
      </div>
    </div>
  );

  if (!employee) return (
    <div className="p-6">
      <EmptyState icon={User} title="Employee not found"
        description="This employee record does not exist or you don't have permission to view it."
        action={{ label: "Back to Employees", onClick: () => navigate("/employees") }} />
    </div>
  );

  const emp = employee as EmpRecord & { departmentName?: string; designationName?: string; locationName?: string; reportsToName?: string };
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const initials = `${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`;

  return (
    <div className="p-6 space-y-6">
      {editOpen && (
        <EditEmployeeDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          employee={emp}
        />
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/employees")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Employees
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/employees/transfers")}>
            <RefreshCw className="w-4 h-4 mr-1.5" />Transfer
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/employees/exits")}>
            <LogOut className="w-4 h-4 mr-1.5" />Exit Handoff
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="w-4 h-4 mr-1.5" />Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700 font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{emp.designationName ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{emp.departmentName ?? "—"}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[emp.status ?? "active"]}`}>
              {(emp.status ?? "active").replace("_"," ")}
            </span>
            <Separator />
            <div className="w-full space-y-2 text-left">
              {emp.workEmail && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{emp.workEmail}</span></div>}
              {emp.workPhone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3.5 h-3.5 flex-shrink-0" /><span>{emp.workPhone}</span></div>}
              {emp.joinDate && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5 flex-shrink-0" /><span>Joined {new Date(emp.joinDate).toLocaleDateString()}</span></div>}
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="w-3.5 h-3.5 flex-shrink-0" /><span className="font-mono">{emp.employeeNumber ?? `EMP-${String(emp.id).padStart(4,"0")}`}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <AttritionRiskPanel employeeId={employeeId} companyId={COMPANY_ID} />
          <Tabs defaultValue="personal">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="personal">
              <Card><CardContent className="pt-6 grid grid-cols-2 gap-4">
                <InfoRow label="First Name" value={emp.firstName} />
                <InfoRow label="Last Name" value={emp.lastName} />
                <InfoRow label="Display Name" value={emp.displayName} />
                <InfoRow label="Gender" value={emp.gender} />
                <InfoRow label="Date of Birth" value={emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : null} />
                <InfoRow label="Nationality" value={emp.nationality} />
                <InfoRow label="National ID" value={emp.nationalId} />
                <InfoRow label="Marital Status" value={emp.maritalStatus} />
                <InfoRow label="Personal Email" value={emp.personalEmail} />
                <InfoRow label="Personal Phone" value={emp.personalPhone} />
                <div className="col-span-2"><InfoRow label="Address" value={emp.address} /></div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="employment">
              <Card><CardContent className="pt-6 grid grid-cols-2 gap-4">
                <InfoRow label="Employee Number" value={emp.employeeNumber} />
                <InfoRow label="Employment Type" value={emp.employmentType?.replace("_"," ")} />
                <InfoRow label="Status" value={emp.status?.replace("_"," ")} />
                <InfoRow label="Join Date" value={emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : null} />
                <InfoRow label="Confirmation Date" value={emp.confirmationDate ? new Date(emp.confirmationDate as Date).toLocaleDateString() : null} />
                <InfoRow label="Work Email" value={emp.workEmail} />
                <InfoRow label="Work Phone" value={emp.workPhone} />
                <InfoRow label="Department" value={emp.departmentName} />
                <InfoRow label="Designation" value={emp.designationName} />
                <InfoRow label="Location" value={emp.locationName} />
                <InfoRow label="Reports To" value={emp.reportsToName} />
                <InfoRow label="Emergency Contact" value={emp.emergencyContactName ? `${emp.emergencyContactName} (${emp.emergencyContactRelation ?? ""}) ${emp.emergencyContactPhone ?? ""}` : null} />
                <InfoRow label="Bank" value={emp.bankName ? `${emp.bankName} — ${emp.bankIban ?? emp.bankAccountNumber ?? ""}` : null} />
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="documents">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Documents Repository</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Document upload coming soon")}><FileText className="w-4 h-4 mr-1.5" />Upload</Button>
                </CardHeader>
                <CardContent><DocumentsTab employeeId={employeeId} companyId={COMPANY_ID} /></CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="assets">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Assigned Assets</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Asset assignment coming soon")}><Package className="w-4 h-4 mr-1.5" />Assign</Button>
                </CardHeader>
                <CardContent><AssetsTab employeeId={employeeId} companyId={COMPANY_ID} /></CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Employment History</CardTitle></CardHeader>
                <CardContent><HistoryTab employeeId={employeeId} companyId={COMPANY_ID} /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
