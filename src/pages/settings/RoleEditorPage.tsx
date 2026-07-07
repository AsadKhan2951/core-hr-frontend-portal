/**
 * Settings → Roles & Permissions
 *
 * Lists all CORE HR roles and shows a full permission matrix editor:
 *   - Modules down the left, actions (View/Create/Edit/Approve/Delete/Export) across the top
 *   - Toggle each cell individually or use row/column bulk toggles
 *   - Clone an existing role to create a custom one
 *   - Super Admin role is locked from deletion and permission changes
 *   - All changes are written to the audit log
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Shield,
  Copy,
  Trash2,
  Plus,
  Lock,
  Info,
  Save,
  ChevronRight,
} from "lucide-react";

// All CORE HR modules with display labels
const HCM_MODULES = [
  { key: "employees", label: "Employees" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "recruitment", label: "Recruitment" },
  { key: "recruitment.requisitions", label: "  → Requisitions" },
  { key: "recruitment.shortlist", label: "  → Shortlist" },
  { key: "recruitment.interviews", label: "  → Interviews" },
  { key: "recruitment.offers", label: "  → Offers" },
  { key: "reports", label: "Reports" },
  { key: "access_management", label: "Access Management" },
  { key: "settings", label: "Settings" },
];

const ACTIONS = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canApprove", label: "Approve" },
  { key: "canDelete", label: "Delete" },
  { key: "canExport", label: "Export" },
] as const;

type ActionKey = (typeof ACTIONS)[number]["key"];

type PermissionRow = {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
};

type HcmRole = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isPredefined: boolean;
  isLocked?: boolean;
  isActive: boolean;
  dataScope?: string;
};

function buildDefaultMatrix(): PermissionRow[] {
  return HCM_MODULES.map((m) => ({
    module: m.key,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canExport: false,
  }));
}

export default function RoleEditorPage() {
  const [selectedRole, setSelectedRole] = useState<HcmRole | null>(null);
  const [matrix, setMatrix] = useState<PermissionRow[]>(buildDefaultMatrix());
  const [pendingChanges, setPendingChanges] = useState<Map<string, PermissionRow>>(new Map());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HcmRole | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [cloneSourceId, setCloneSourceId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: rolesData, refetch: refetchRoles } = trpc.access.roles.list.useQuery();
  const { data: matrixData, refetch: refetchMatrix } = trpc.access.permissions.getMatrix.useQuery(
    { hcmRoleId: selectedRole?.id ?? 0 },
    { enabled: !!selectedRole }
  );

  // Sync matrix when matrixData changes
  const matrixDataKey = JSON.stringify(matrixData);
  const [lastMatrixKey, setLastMatrixKey] = useState("");
  if (matrixData && matrixDataKey !== lastMatrixKey) {
    setLastMatrixKey(matrixDataKey);
    const merged = buildDefaultMatrix().map((row) => {
      const fetched = matrixData.find((p: PermissionRow) => p.module === row.module);
      return fetched ? { ...row, ...fetched } : row;
    });
    setMatrix(merged);
    setPendingChanges(new Map());
  }

  const setBulkMutation = trpc.access.permissions.setBulkPermissions.useMutation({
    onSuccess: () => {
      toast.success("Permissions saved");
      setPendingChanges(new Map());
      refetchMatrix();
    },
    onError: (e) => toast.error(e.message),
  });

  const createRoleMutation = trpc.access.roles.create.useMutation({
    onSuccess: () => {
      toast.success("Role created");
      setShowCreateDialog(false);
      setNewRoleName("");
      setNewRoleDesc("");
      refetchRoles();
    },
    onError: (e) => toast.error(e.message),
  });

  const cloneRoleMutation = trpc.access.roles.clone.useMutation({
    onSuccess: () => {
      toast.success("Role cloned successfully");
      setShowCloneDialog(false);
      setNewRoleName("");
      setCloneSourceId(null);
      refetchRoles();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRoleMutation = trpc.access.roles.delete.useMutation({
    onSuccess: () => {
      toast.success("Role deleted");
      setDeleteTarget(null);
      if (selectedRole?.id === deleteTarget?.id) setSelectedRole(null);
      refetchRoles();
    },
    onError: (e) => toast.error(e.message),
  });

  const roles: HcmRole[] = rolesData ?? [];

  function togglePermission(module: string, action: ActionKey, value: boolean) {
    setMatrix((prev) =>
      prev.map((row) => (row.module === module ? { ...row, [action]: value } : row))
    );
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const current = matrix.find((r) => r.module === module)!;
      next.set(module, { ...current, [action]: value });
      return next;
    });
  }

  function toggleRow(module: string, value: boolean) {
    setMatrix((prev) =>
      prev.map((row) =>
        row.module === module
          ? {
              ...row,
              canView: value,
              canCreate: value,
              canEdit: value,
              canDelete: value,
              canApprove: value,
              canExport: value,
            }
          : row
      )
    );
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const current = matrix.find((r) => r.module === module)!;
      next.set(module, {
        ...current,
        canView: value,
        canCreate: value,
        canEdit: value,
        canDelete: value,
        canApprove: value,
        canExport: value,
      });
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedRole || pendingChanges.size === 0) return;
    setIsSaving(true);
    try {
      await setBulkMutation.mutateAsync({
        hcmRoleId: selectedRole.id,
        permissions: Array.from(pendingChanges.values()),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const isLocked = selectedRole?.slug === "super_admin" || selectedRole?.isPredefined;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure what each role can do across every module. Super Admin is locked and cannot be
            modified or deleted.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCloneDialog(true)}>
            <Copy className="h-4 w-4 mr-2" />
            Clone Role
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The <strong>Super Admin</strong> role has full access to all modules and cannot be edited
          or deleted. Default roles (HR Admin, HR Manager, Department Head, Manager, Employee) are
          predefined but their permissions can be adjusted.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-12 gap-6">
        {/* Role list */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Roles ({roles.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between group ${
                      selectedRole?.id === role.id ? "bg-primary/10 border-l-2 border-primary" : ""
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{role.name}</span>
                        {role.slug === "super_admin" && (
                          <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {role.isPredefined && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Built-in
                          </Badge>
                        )}
                        {!role.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permission matrix */}
        <div className="col-span-9">
          {selectedRole ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      {selectedRole.name}
                      {selectedRole.slug === "super_admin" && (
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {selectedRole.description ?? "Configure module-level permissions below"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isLocked && pendingChanges.size > 0 && (
                      <Button onClick={savePermissions} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        Save {pendingChanges.size} Change{pendingChanges.size !== 1 ? "s" : ""}
                      </Button>
                    )}
                    {selectedRole.slug !== "super_admin" && !selectedRole.isPredefined && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/50 hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(selectedRole)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLocked && selectedRole.slug === "super_admin" ? (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      Super Admin has unrestricted access to all modules. This role cannot be
                      modified.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-48">
                            Module
                          </th>
                          {ACTIONS.map((action) => (
                            <th
                              key={action.key}
                              className="text-center py-2 px-3 font-medium text-muted-foreground w-20"
                            >
                              {action.label}
                            </th>
                          ))}
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground w-16">
                            All
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {HCM_MODULES.map((mod) => {
                          const row = matrix.find((r) => r.module === mod.key) ?? {
                            module: mod.key,
                            canView: false,
                            canCreate: false,
                            canEdit: false,
                            canDelete: false,
                            canApprove: false,
                            canExport: false,
                          };
                          const allOn = ACTIONS.every((a) => row[a.key]);
                          const isSubModule = mod.key.includes(".");
                          return (
                            <tr
                              key={mod.key}
                              className={`hover:bg-muted/30 transition-colors ${isSubModule ? "bg-muted/10" : ""}`}
                            >
                              <td className="py-2 pr-4 font-medium text-foreground">
                                <span className={isSubModule ? "text-muted-foreground text-xs pl-2" : ""}>
                                  {mod.label}
                                </span>
                              </td>
                              {ACTIONS.map((action) => (
                                <td key={action.key} className="text-center py-2 px-3">
                                  <Switch
                                    checked={row[action.key]}
                                    onCheckedChange={(v) =>
                                      togglePermission(mod.key, action.key, v)
                                    }
                                    className="scale-75"
                                  />
                                </td>
                              ))}
                              <td className="text-center py-2 px-3">
                                <Switch
                                  checked={allOn}
                                  onCheckedChange={(v) => toggleRow(mod.key, v)}
                                  className="scale-75"
                                />
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
          ) : (
            <Card className="h-full flex items-center justify-center min-h-64">
              <CardContent className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a role to view and edit its permissions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Role Name *</Label>
              <Input
                placeholder="e.g. Finance Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of this role's responsibilities"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newRoleName.trim()) return toast.error("Role name is required");
                createRoleMutation.mutate({
                  name: newRoleName.trim(),
                  slug: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"),
                  description: newRoleDesc.trim() || undefined,
                });
              }}
              disabled={createRoleMutation.isPending}
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Role Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Source Role *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    className={`text-left px-3 py-2 rounded text-sm border transition-colors ${
                      cloneSourceId === role.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setCloneSourceId(role.id)}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>New Role Name *</Label>
              <Input
                placeholder="e.g. Finance Manager (Custom)"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!cloneSourceId) return toast.error("Select a source role");
                if (!newRoleName.trim()) return toast.error("New role name is required");
                cloneRoleMutation.mutate({
                  sourceRoleId: cloneSourceId,
                  newName: newRoleName.trim(),
                  newSlug: newRoleName.trim().toLowerCase().replace(/\s+/g, "_"),
                });
              }}
              disabled={cloneRoleMutation.isPending}
            >
              Clone Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. Users assigned this
              role will lose its permissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteRoleMutation.mutate({ id: deleteTarget.id })}
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
