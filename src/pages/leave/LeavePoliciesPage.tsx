import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Users, Building2, UserCheck } from "lucide-react";

type PolicyForm = {
  name: string;
  leaveTypeId: string;
  applicableTo: "all" | "department" | "gender" | "designation";
  departmentId: string;
  gender: "all" | "male" | "female";
  entitlementDays: string;
  prorateOnJoining: boolean;
  prorateOnExit: boolean;
  effectiveFrom: string;
  effectiveTo: string;
};

const emptyForm: PolicyForm = {
  name: "",
  leaveTypeId: "",
  applicableTo: "all",
  departmentId: "",
  gender: "all",
  entitlementDays: "0",
  prorateOnJoining: true,
  prorateOnExit: true,
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveTo: "",
};

export default function LeavePoliciesPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PolicyForm>(emptyForm);

  const { data: policies = [], refetch } = trpc.leave.policies.list.useQuery({ companyId });
  const { data: leaveTypes = [] } = trpc.leave.types.list.useQuery({ companyId });
  const { data: departments = [] } = trpc.org.listDepartments.useQuery({ companyId });

  const createMutation = trpc.leave.policies.create.useMutation({
    onSuccess: () => { toast.success("Policy created"); refetch(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.leave.policies.update.useMutation({
    onSuccess: () => { toast.success("Policy updated"); refetch(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.leave.policies.delete.useMutation({
    onSuccess: () => { toast.success("Policy deactivated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: typeof policies[0]) => {
    setEditId(p.id);
    setForm({
      name: p.name,
      leaveTypeId: String(p.leaveTypeId),
      applicableTo: p.applicableTo,
      departmentId: p.departmentId ? String(p.departmentId) : "",
      gender: p.gender,
      entitlementDays: p.entitlementDays,
      prorateOnJoining: p.prorateOnJoining,
      prorateOnExit: p.prorateOnExit,
      effectiveFrom: new Date(p.effectiveFrom).toISOString().split("T")[0],
      effectiveTo: p.effectiveTo ? new Date(p.effectiveTo).toISOString().split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.leaveTypeId || !form.entitlementDays) {
      toast.error("Name, leave type, and entitlement days are required");
      return;
    }
    const payload = {
      companyId,
      name: form.name,
      leaveTypeId: parseInt(form.leaveTypeId),
      applicableTo: form.applicableTo,
      departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
      gender: form.gender,
      entitlementDays: form.entitlementDays,
      prorateOnJoining: form.prorateOnJoining,
      prorateOnExit: form.prorateOnExit,
      effectiveFrom: new Date(form.effectiveFrom),
      effectiveTo: form.effectiveTo ? new Date(form.effectiveTo) : undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, data: { name: form.name, entitlementDays: form.entitlementDays, prorateOnJoining: form.prorateOnJoining, prorateOnExit: form.prorateOnExit } });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getLeaveTypeName = (id: number) => leaveTypes.find(lt => lt.id === id)?.name ?? "Unknown";
  const getDeptName = (id: number | null) => departments.find((d: { id: number }) => d.id === id)?.name ?? "—";

  const applicableToIcon = {
    all: Users,
    department: Building2,
    gender: UserCheck,
    designation: FileText,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define entitlements per leave type, department, gender, or designation
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Policy
        </Button>
      </div>

      {/* Policies Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Policies ({policies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No policies configured yet.</p>
              <Button variant="outline" className="mt-3" onClick={openCreate}>Create First Policy</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Policy Name</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Leave Type</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Applicable To</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Entitlement</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Prorate</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {policies.map(p => {
                    const Icon = applicableToIcon[p.applicableTo];
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{p.name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{getLeaveTypeName(p.leaveTypeId)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="capitalize">{p.applicableTo}</span>
                            {p.applicableTo === "department" && p.departmentId && (
                              <span className="text-muted-foreground">({getDeptName(p.departmentId)})</span>
                            )}
                            {p.applicableTo === "gender" && p.gender !== "all" && (
                              <span className="text-muted-foreground capitalize">({p.gender})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {p.entitlementDays} days
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1">
                            {p.prorateOnJoining && <Badge variant="outline" className="text-xs">Join</Badge>}
                            {p.prorateOnExit && <Badge variant="outline" className="text-xs">Exit</Badge>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                            {p.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate({ id: p.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Policy" : "New Leave Policy"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Policy Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Annual Leave – All Staff" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Leave Type *</Label>
                <Select value={form.leaveTypeId} onValueChange={v => setForm(f => ({ ...f, leaveTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.filter(lt => lt.isActive).map(lt => (
                      <SelectItem key={lt.id} value={String(lt.id)}>{lt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Entitlement Days *</Label>
                <Input value={form.entitlementDays}
                  onChange={e => setForm(f => ({ ...f, entitlementDays: e.target.value }))}
                  placeholder="e.g. 21" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Applicable To</Label>
                <Select value={form.applicableTo}
                  onValueChange={v => setForm(f => ({ ...f, applicableTo: v as PolicyForm["applicableTo"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="gender">Gender</SelectItem>
                    <SelectItem value="designation">Designation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.applicableTo === "department" && (
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: { id: number; name: string }) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.applicableTo === "gender" && (
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v as PolicyForm["gender"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom}
                  onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Effective To (optional)</Label>
                <Input type="date" value={form.effectiveTo}
                  onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "prorateOnJoining" as const, label: "Prorate on Joining" },
                { key: "prorateOnExit" as const, label: "Prorate on Exit" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <Label>{label}</Label>
                  <Switch checked={form[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
