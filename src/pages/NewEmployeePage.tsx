/**
 * NewEmployeePage — /employees/new
 *
 * Full create-employee form with:
 *  - Personal info (first/last name, gender, DOB, nationality, marital status)
 *  - Contact (work email, personal email, work phone, personal phone, address)
 *  - Employment (employee number, department, designation, location, role, reports-to,
 *    join date, employment type, status)
 *  - Emergency contact
 *  - Bank details
 *
 * On submit → trpc.employees.create → redirect to the new employee's profile.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const COMPANY_ID = 1;

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function NewEmployeePage() {
  const [, navigate] = useLocation();

  // ── Queries for dropdown options ──────────────────────────────────────────
  const { data: departments = [] } = trpc.org.listDepartments.useQuery({ companyId: COMPANY_ID });
  const { data: designations = [] } = trpc.org.listDesignations.useQuery({ companyId: COMPANY_ID });
  const { data: locations = [] } = trpc.org.listLocations.useQuery({ companyId: COMPANY_ID });
  const { data: roles = [] } = trpc.roles.list.useQuery({ companyId: COMPANY_ID });
  const { data: allEmployees = [] } = trpc.employees.list.useQuery({ companyId: COMPANY_ID });

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    gender: "",
    dateOfBirth: "",
    nationality: "",
    nationalId: "",
    maritalStatus: "",
    workEmail: "",
    personalEmail: "",
    workPhone: "",
    personalPhone: "",
    address: "",
    employeeNumber: "",
    departmentId: "",
    designationId: "",
    locationId: "",
    hcmRoleId: "",
    reportsToId: "",
    joinDate: "",
    employmentType: "",
    status: "active",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    bankName: "",
    bankAccountNumber: "",
    bankIban: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setSelect = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  // ── Mutation ──────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const createMutation = trpc.employees.create.useMutation({
    onSuccess: (newEmployee) => {
      toast.success(`Employee ${form.firstName} ${form.lastName} created successfully`);
      utils.employees.list.invalidate();
      utils.dashboard.stats.invalidate();
      navigate(`/employees/${(newEmployee as { id: number }).id}`);
    },
    onError: (err) => {
      toast.error(`Failed to create employee: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    createMutation.mutate({
      companyId: COMPANY_ID,
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
      reportsToId: form.reportsToId ? Number(form.reportsToId) : undefined,
      joinDate: form.joinDate ? new Date(form.joinDate) : undefined,
      employmentType: (form.employmentType as "full_time" | "part_time" | "contract" | "intern" | "probation") || undefined,
      status: (form.status as "active" | "inactive" | "on_leave" | "terminated" | "resigned") || "active",
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      emergencyContactRelation: form.emergencyContactRelation || undefined,
      bankName: form.bankName || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
      bankIban: form.bankIban || undefined,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/employees")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </button>
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">Add New Employee</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First Name" required>
              <Input
                value={form.firstName}
                onChange={set("firstName")}
                placeholder="e.g. Ahmed"
                required
              />
            </Field>
            <Field label="Last Name" required>
              <Input
                value={form.lastName}
                onChange={set("lastName")}
                placeholder="e.g. Al Rashid"
                required
              />
            </Field>
            <Field label="Display Name">
              <Input
                value={form.displayName}
                onChange={set("displayName")}
                placeholder="Optional preferred name"
              />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={setSelect("gender")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of Birth">
              <Input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </Field>
            <Field label="Nationality">
              <Input value={form.nationality} onChange={set("nationality")} placeholder="e.g. Emirati" />
            </Field>
            <Field label="National ID / Emirates ID">
              <Input value={form.nationalId} onChange={set("nationalId")} placeholder="ID number" />
            </Field>
            <Field label="Marital Status">
              <Select value={form.maritalStatus} onValueChange={setSelect("maritalStatus")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Work Email">
              <Input
                type="email"
                value={form.workEmail}
                onChange={set("workEmail")}
                placeholder="ahmed@company.com"
              />
            </Field>
            <Field label="Personal Email">
              <Input
                type="email"
                value={form.personalEmail}
                onChange={set("personalEmail")}
                placeholder="ahmed@gmail.com"
              />
            </Field>
            <Field label="Work Phone">
              <Input value={form.workPhone} onChange={set("workPhone")} placeholder="+971 50 000 0000" />
            </Field>
            <Field label="Personal Phone">
              <Input value={form.personalPhone} onChange={set("personalPhone")} placeholder="+971 50 000 0000" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Address">
                <Input value={form.address} onChange={set("address")} placeholder="Full address" />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee Number">
              <Input
                value={form.employeeNumber}
                onChange={set("employeeNumber")}
                placeholder="e.g. EMP-001"
              />
            </Field>
            <Field label="Join Date">
              <Input type="date" value={form.joinDate} onChange={set("joinDate")} />
            </Field>
            <Field label="Department">
              <Select value={form.departmentId} onValueChange={setSelect("departmentId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {(departments as { id: number; name: string }[]).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Designation / Job Title">
              <Select value={form.designationId} onValueChange={setSelect("designationId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {(designations as { id: number; name: string }[]).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Location / Office">
              <Select value={form.locationId} onValueChange={setSelect("locationId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {(locations as { id: number; name: string }[]).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="CORE HR Role">
              <Select value={form.hcmRoleId} onValueChange={setSelect("hcmRoleId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {(roles as { id: number; name: string }[]).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reports To">
              <Select value={form.reportsToId} onValueChange={setSelect("reportsToId")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(allEmployees as { id: number; firstName: string; lastName: string }[]).map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.firstName} {e.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment Type">
              <Select value={form.employmentType} onValueChange={setSelect("employmentType")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={setSelect("status")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Contact Name">
              <Input
                value={form.emergencyContactName}
                onChange={set("emergencyContactName")}
                placeholder="Full name"
              />
            </Field>
            <Field label="Phone Number">
              <Input
                value={form.emergencyContactPhone}
                onChange={set("emergencyContactPhone")}
                placeholder="+971 50 000 0000"
              />
            </Field>
            <Field label="Relationship">
              <Input
                value={form.emergencyContactRelation}
                onChange={set("emergencyContactRelation")}
                placeholder="e.g. Spouse, Parent"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Bank Name">
              <Input value={form.bankName} onChange={set("bankName")} placeholder="e.g. Emirates NBD" />
            </Field>
            <Field label="Account Number">
              <Input
                value={form.bankAccountNumber}
                onChange={set("bankAccountNumber")}
                placeholder="Account number"
              />
            </Field>
            <Field label="IBAN">
              <Input value={form.bankIban} onChange={set("bankIban")} placeholder="AE00 0000 0000 0000 0000 000" />
            </Field>
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/employees")}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="min-w-[140px]">
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
