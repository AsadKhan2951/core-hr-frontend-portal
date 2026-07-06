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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Calendar, Clock, Users, ChevronRight,
  Tag, CheckCircle2, XCircle
} from "lucide-react";

const DEFAULT_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

type LeaveTypeForm = {
  name: string;
  code: string;
  description: string;
  isPaid: boolean;
  isCarryForward: boolean;
  maxCarryDays: number;
  accrualType: "none" | "monthly" | "yearly" | "per_period";
  accrualRate: string;
  maxBalance: string;
  applicableGender: "all" | "male" | "female";
  requiresApproval: boolean;
  requiresDocument: boolean;
  minDaysNotice: number;
  maxConsecutiveDays: number;
  colorCode: string;
};

const emptyForm: LeaveTypeForm = {
  name: "",
  code: "",
  description: "",
  isPaid: true,
  isCarryForward: false,
  maxCarryDays: 0,
  accrualType: "none",
  accrualRate: "0.00",
  maxBalance: "0.00",
  applicableGender: "all",
  requiresApproval: true,
  requiresDocument: false,
  minDaysNotice: 0,
  maxConsecutiveDays: 0,
  colorCode: "#6366f1",
};

export default function LeaveTypesPage() {
  const { user } = useAuth();
  const companyId = (user as { companyId?: number })?.companyId ?? 1;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(emptyForm);

  const { data: leaveTypes = [], refetch } = trpc.leave.types.list.useQuery({ companyId });

  const createMutation = trpc.leave.types.create.useMutation({
    onSuccess: () => { toast.success("Leave type created"); refetch(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.leave.types.update.useMutation({
    onSuccess: () => { toast.success("Leave type updated"); refetch(); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.leave.types.delete.useMutation({
    onSuccess: () => { toast.success("Leave type deactivated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (lt: typeof leaveTypes[0]) => {
    setEditId(lt.id);
    setForm({
      name: lt.name,
      code: lt.code,
      description: lt.description ?? "",
      isPaid: lt.isPaid,
      isCarryForward: lt.isCarryForward,
      maxCarryDays: lt.maxCarryDays,
      accrualType: lt.accrualType,
      accrualRate: lt.accrualRate ?? "0.00",
      maxBalance: lt.maxBalance ?? "0.00",
      applicableGender: lt.applicableGender,
      requiresApproval: lt.requiresApproval,
      requiresDocument: lt.requiresDocument,
      minDaysNotice: lt.minDaysNotice,
      maxConsecutiveDays: lt.maxConsecutiveDays,
      colorCode: lt.colorCode ?? "#6366f1",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, data: form });
    } else {
      createMutation.mutate({ companyId, ...form });
    }
  };

  const activeTypes = leaveTypes.filter(lt => lt.isActive);
  const inactiveTypes = leaveTypes.filter(lt => !lt.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Types</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure leave categories, accrual rules, and carry-forward policies
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Leave Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Types", value: leaveTypes.length, icon: Tag },
          { label: "Active", value: activeTypes.length, icon: CheckCircle2 },
          { label: "Paid Leave Types", value: leaveTypes.filter(lt => lt.isPaid).length, icon: Calendar },
          { label: "With Accrual", value: leaveTypes.filter(lt => lt.accrualType !== "none").length, icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Leave Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Leave Types ({activeTypes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTypes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No leave types configured yet.</p>
              <Button variant="outline" className="mt-3" onClick={openCreate}>Add First Leave Type</Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeTypes.map(lt => (
                <div
                  key={lt.id}
                  className="rounded-xl border border-border/50 p-4 hover:border-border transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full ring-2 ring-offset-1"
                        style={{ backgroundColor: lt.colorCode ?? "#6366f1" }}
                      />
                      <span className="font-semibold text-sm">{lt.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(lt)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: lt.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant={lt.isPaid ? "default" : "secondary"} className="text-xs">
                      {lt.isPaid ? "Paid" : "Unpaid"}
                    </Badge>
                    {lt.isCarryForward && (
                      <Badge variant="outline" className="text-xs">
                        Carry-forward ({lt.maxCarryDays}d)
                      </Badge>
                    )}
                    {lt.accrualType !== "none" && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        Accrual: {lt.accrualType}
                      </Badge>
                    )}
                    {lt.applicableGender !== "all" && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-2.5 w-2.5 mr-1" />
                        {lt.applicableGender}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Code</span>
                      <span className="font-mono font-medium text-foreground">{lt.code}</span>
                    </div>
                    {lt.requiresDocument && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <ChevronRight className="h-3 w-3" />
                        Requires document
                      </div>
                    )}
                    {lt.minDaysNotice > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lt.minDaysNotice} day(s) notice required
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Types */}
      {inactiveTypes.length > 0 && (
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">
              Inactive Types ({inactiveTypes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {inactiveTypes.map(lt => (
                <Badge key={lt.id} variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {lt.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Leave Type" : "New Leave Type"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Annual Leave" />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. AL" maxLength={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this leave type" rows={2} />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map(c => (
                  <button key={c} type="button"
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${form.colorCode === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, colorCode: c }))}
                  />
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "isPaid" as const, label: "Paid Leave" },
                { key: "requiresApproval" as const, label: "Requires Approval" },
                { key: "requiresDocument" as const, label: "Requires Document" },
                { key: "isCarryForward" as const, label: "Allow Carry-Forward" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <Label className="cursor-pointer">{label}</Label>
                  <Switch checked={form[key]} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                </div>
              ))}
            </div>

            {/* Carry-forward max days */}
            {form.isCarryForward && (
              <div className="space-y-1.5">
                <Label>Max Carry-Forward Days</Label>
                <Input type="number" min={0} value={form.maxCarryDays}
                  onChange={e => setForm(f => ({ ...f, maxCarryDays: parseInt(e.target.value) || 0 }))} />
              </div>
            )}

            {/* Accrual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Accrual Type</Label>
                <Select value={form.accrualType}
                  onValueChange={v => setForm(f => ({ ...f, accrualType: v as LeaveTypeForm["accrualType"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Fixed)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="per_period">Per Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.accrualType !== "none" && (
                <div className="space-y-1.5">
                  <Label>Accrual Rate (days)</Label>
                  <Input value={form.accrualRate}
                    onChange={e => setForm(f => ({ ...f, accrualRate: e.target.value }))}
                    placeholder="e.g. 1.25" />
                </div>
              )}
            </div>

            {/* Restrictions */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Applicable Gender</Label>
                <Select value={form.applicableGender}
                  onValueChange={v => setForm(f => ({ ...f, applicableGender: v as LeaveTypeForm["applicableGender"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Min Notice (days)</Label>
                <Input type="number" min={0} value={form.minDaysNotice}
                  onChange={e => setForm(f => ({ ...f, minDaysNotice: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Consecutive (days)</Label>
                <Input type="number" min={0} value={form.maxConsecutiveDays}
                  onChange={e => setForm(f => ({ ...f, maxConsecutiveDays: parseInt(e.target.value) || 0 }))}
                  placeholder="0 = unlimited" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Leave Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
