import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCheck, ArrowRight, CheckCircle, Briefcase, Calendar } from "lucide-react";

export default function HiredToEmployeePage() {
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [form, setForm] = useState({
    employeeNumber: "",
    workEmail: "",
    joinDate: "",
    employmentType: "full_time" as const,
    departmentId: "",
    designationId: "",
    locationId: "",
  });

  // Get all hired applications
  const { data: hiredApps = [], refetch } = trpc.recruitment.applications.list.useQuery({ status: "hired" });
  const createEmployeeMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Employee record created! Candidate marked as onboarded.");
      setSelectedApp(null);
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleConvert = () => {
    if (!selectedApp) return;
    if (!form.joinDate) return toast.error("Join date is required");

    const candidate = selectedApp.candidate || {};
    createEmployeeMutation.mutate({
      companyId: 1,
      firstName: candidate.firstName || "Unknown",
      lastName: candidate.lastName || "Candidate",
      personalEmail: candidate.email || undefined,
      workEmail: form.workEmail || undefined,
      employeeNumber: form.employeeNumber || undefined,
      joinDate: new Date(form.joinDate),
      employmentType: form.employmentType,
      departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
      designationId: form.designationId ? parseInt(form.designationId) : undefined,
      locationId: form.locationId ? parseInt(form.locationId) : undefined,
      status: "active",
    });
  };

  const EMPLOYMENT_TYPES = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "intern", label: "Intern" },
    { value: "probation", label: "Probation" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hired → Employee Conversion</h1>
        <p className="text-muted-foreground text-sm">Convert hired candidates into employee records to begin onboarding</p>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800">
          <p className="font-semibold mb-1">How this works</p>
          <p>Candidates with status <strong>Hired</strong> appear here. Click "Convert to Employee" to create their employee record with a join date, department, and designation. The employee will then appear in the main Employee module for further onboarding.</p>
        </div>
      </div>

      {/* Hired Candidates List */}
      <div className="space-y-3">
        {(hiredApps as any[]).length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hired candidates pending conversion</p>
              <p className="text-sm mt-1">When candidates are marked as "Hired" in the pipeline, they will appear here.</p>
            </CardContent>
          </Card>
        ) : (hiredApps as any[]).map((app: any) => (
          <Card key={app.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                    {(app.candidate?.firstName?.[0] || "C")}{(app.candidate?.lastName?.[0] || "")}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {app.candidate?.firstName || "Candidate"} {app.candidate?.lastName || ""}
                    </p>
                    <p className="text-sm text-muted-foreground">{app.candidate?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-green-100 text-green-800 text-xs">Hired</Badge>
                      {app.jobPosting?.title && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {app.jobPosting.title}
                        </span>
                      )}
                      {app.appliedAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={() => { setSelectedApp(app); setForm({ employeeNumber: "", workEmail: app.candidate?.email || "", joinDate: "", employmentType: "full_time", departmentId: "", designationId: "", locationId: "" }); }}
                  className="gap-2 shrink-0">
                  <UserCheck className="w-4 h-4" />
                  Convert to Employee
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Dialog */}
      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-600" />
                Convert to Employee
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1 p-3 bg-green-50 rounded-lg text-sm">
              <p className="font-semibold">{selectedApp.candidate?.firstName} {selectedApp.candidate?.lastName}</p>
              <p className="text-muted-foreground">{selectedApp.jobPosting?.title || "Position"}</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Employee Number</Label>
                  <Input value={form.employeeNumber} onChange={e => setForm(f => ({ ...f, employeeNumber: e.target.value }))} placeholder="e.g. EMP-001" />
                </div>
                <div className="space-y-1">
                  <Label>Work Email</Label>
                  <Input type="email" value={form.workEmail} onChange={e => setForm(f => ({ ...f, workEmail: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Join Date *</Label>
                  <Input type="date" value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Employment Type</Label>
                  <Select value={form.employmentType} onValueChange={v => setForm(f => ({ ...f, employmentType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[{ value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" }, { value: "contract", label: "Contract" }, { value: "intern", label: "Intern" }, { value: "probation", label: "Probation" }].map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Department ID</Label>
                  <Input type="number" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>Designation ID</Label>
                  <Input type="number" value={form.designationId} onChange={e => setForm(f => ({ ...f, designationId: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                After conversion, the employee will appear in the Employee module where you can complete their full profile, assign salary structure, and begin onboarding.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedApp(null)}>Cancel</Button>
              <Button onClick={handleConvert} disabled={createEmployeeMutation.isPending} className="gap-2">
                <UserCheck className="w-4 h-4" />
                {createEmployeeMutation.isPending ? "Creating..." : "Create Employee Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
