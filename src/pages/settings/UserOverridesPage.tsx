/**
 * Settings → Per-User Overrides & Data Scope
 *
 * Allows admins to:
 *   1. Grant or revoke specific permissions on top of a user's role (one-off exceptions)
 *   2. Configure the data scope (self / reports / department / company / custom) per user per role
 *
 * All changes are written to the audit log.
 * Only Super Admin and HR Admin can access this page.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Plus,
  Trash2,
  Info,
  Database,
  Users,
  ChevronRight,
} from "lucide-react";

const HCM_MODULES = [
  "employees", "attendance", "leave", "payroll", "recruitment",
  "recruitment.requisitions", "recruitment.shortlist", "recruitment.interviews",
  "recruitment.offers", "reports", "access_management", "settings",
];

const ACTIONS = ["canView", "canCreate", "canEdit", "canApprove", "canDelete", "canExport"];

const DATA_SCOPES = [
  { value: "self", label: "Self Only", description: "Can only see their own records" },
  { value: "reports", label: "Direct & Indirect Reports", description: "Sees their reporting hierarchy" },
  { value: "department", label: "Department", description: "Sees all records in their department" },
  { value: "company", label: "Entire Company", description: "Sees all records across the company" },
  { value: "custom", label: "Custom", description: "Manually configured scope" },
];

type UserProfile = {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  isActive: boolean;
};

type PermissionOverride = {
  id: number;
  userId: number;
  module: string;
  action: string;
  granted: boolean;
  reason: string | null;
  expiresAt: Date | null;
};

const EMPTY_OVERRIDE = {
  module: "employees",
  action: "canView",
  granted: true,
  reason: "",
  expiresAt: "",
};

export default function UserOverridesPage() {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ ...EMPTY_OVERRIDE });
  const [scopeRoleId, setScopeRoleId] = useState<number | null>(null);
  const [scopeValue, setScopeValue] = useState<string>("self");

  const { data: usersData } = trpc.access.users.list.useQuery();
  const { data: rolesData } = trpc.access.roles.list.useQuery();

  const { data: overridesData, refetch: refetchOverrides } =
    trpc.access.overrides.list.useQuery(
      { userId: selectedUser?.userId ?? 0 },
      { enabled: !!selectedUser }
    );

  const { data: scopeData, refetch: refetchScope } =
    trpc.access.dataScope.getUserScope.useQuery(
      { userId: selectedUser?.userId ?? 0 },
      { enabled: !!selectedUser }
    );

  const upsertOverrideMutation = trpc.access.overrides.upsert.useMutation({
    onSuccess: () => {
      toast.success("Override saved");
      setShowAddOverride(false);
      setOverrideForm({ ...EMPTY_OVERRIDE });
      refetchOverrides();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteOverrideMutation = trpc.access.overrides.delete.useMutation({
    onSuccess: () => {
      toast.success("Override removed");
      refetchOverrides();
    },
    onError: (e) => toast.error(e.message),
  });

  const setScopeMutation = trpc.access.dataScope.set.useMutation({
    onSuccess: () => {
      toast.success("Data scope updated");
      refetchScope();
    },
    onError: (e) => toast.error(e.message),
  });

  const users = (usersData ?? []) as UserProfile[];
  const roles = rolesData ?? [];
  const overrides: PermissionOverride[] = (overridesData ?? []) as PermissionOverride[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Per-User Overrides & Data Scope</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grant or revoke specific permissions on top of a user's role, and configure what data each
          user can see based on the org structure.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Overrides are <strong>additive or restrictive exceptions</strong> on top of the user's
          assigned role. Use sparingly for one-off cases. All changes are written to the audit log.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-12 gap-6">
        {/* User list */}
        <div className="col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select User</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between group ${
                      selectedUser?.id === user.id ? "bg-primary/10 border-l-2 border-primary" : ""
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.userEmail ?? "—"}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="col-span-9">
          {selectedUser ? (
            <Tabs defaultValue="overrides">
              <TabsList>
                <TabsTrigger value="overrides">
                  <Shield className="h-4 w-4 mr-2" />
                  Permission Overrides
                </TabsTrigger>
                <TabsTrigger value="scope">
                  <Database className="h-4 w-4 mr-2" />
                  Data Scope
                </TabsTrigger>
              </TabsList>

              {/* ── Permission Overrides Tab ── */}
              <TabsContent value="overrides" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          Overrides for {selectedUser.userName}
                        </CardTitle>
                        <CardDescription>
                          These permissions are applied on top of the user's role. Granted overrides
                          add access; revoked overrides remove access even if the role allows it.
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={() => setShowAddOverride(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Override
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {overrides.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No overrides configured for this user.</p>
                        <p className="text-xs mt-1">
                          They rely entirely on their assigned role permissions.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {overrides.map((override) => (
                          <div
                            key={override.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                          >
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={override.granted ? "default" : "destructive"}
                                className={
                                  override.granted
                                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                    : "bg-red-500/20 text-red-700 dark:text-red-400"
                                }
                              >
                                {override.granted ? "Granted" : "Revoked"}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">
                                  {override.module} → {override.action.replace("can", "")}
                                </p>
                                {override.reason && (
                                  <p className="text-xs text-muted-foreground">{override.reason}</p>
                                )}
                                {override.expiresAt && (
                                  <p className="text-xs text-amber-600">
                                    Expires: {new Date(override.expiresAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteOverrideMutation.mutate({ id: override.id, userId: override.userId })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Data Scope Tab ── */}
              <TabsContent value="scope" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      Data Scope for {selectedUser.userName}
                    </CardTitle>
                    <CardDescription>
                      Controls what records this user can see. Scope is configured per role — select
                      a role and set the scope level.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current effective scope */}
                    {scopeData && (
                      <Alert>
                        <Users className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Current effective scope:</strong>{" "}
                          {DATA_SCOPES.find((s) => s.value === scopeData)?.label ?? scopeData}
                          {" — "}
                          {DATA_SCOPES.find((s) => s.value === scopeData)?.description}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Configure per-role scope */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label>Role to configure scope for</Label>
                        <Select
                          value={scopeRoleId?.toString() ?? ""}
                          onValueChange={(v) => setScopeRoleId(Number(v))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id.toString()}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Data Scope Level</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {DATA_SCOPES.map((scope) => (
                            <button
                              key={scope.value}
                              className={`text-left p-3 rounded-lg border transition-colors ${
                                scopeValue === scope.value
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:bg-muted/50"
                              }`}
                              onClick={() => setScopeValue(scope.value)}
                            >
                              <p className="text-sm font-medium">{scope.label}</p>
                              <p className="text-xs text-muted-foreground">{scope.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          if (!scopeRoleId) return toast.error("Select a role first");
                          setScopeMutation.mutate({
                            userId: selectedUser.userId,
                            hcmRoleId: scopeRoleId,
                            dataScope: scopeValue as "self" | "reports" | "department" | "company" | "custom",
                          });
                        }}
                        disabled={setScopeMutation.isPending}
                      >
                        Save Data Scope
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-64">
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a user to configure overrides and data scope</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Override Dialog */}
      <Dialog open={showAddOverride} onOpenChange={setShowAddOverride}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Permission Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Module *</Label>
              <Select
                value={overrideForm.module}
                onValueChange={(v) => setOverrideForm((f) => ({ ...f, module: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HCM_MODULES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Action *</Label>
              <Select
                value={overrideForm.action}
                onValueChange={(v) => setOverrideForm((f) => ({ ...f, action: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a.replace("can", "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Grant or Revoke</Label>
                <p className="text-xs text-muted-foreground">
                  Grant adds access; Revoke removes access even if the role allows it
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${!overrideForm.granted ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  Revoke
                </span>
                <Switch
                  checked={overrideForm.granted}
                  onCheckedChange={(v) => setOverrideForm((f) => ({ ...f, granted: v }))}
                />
                <span className={`text-sm ${overrideForm.granted ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                  Grant
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Reason (recommended)</Label>
              <Textarea
                placeholder="Why is this override needed? e.g. Temporary access during audit"
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label>Expires On (optional)</Label>
              <Input
                type="date"
                value={overrideForm.expiresAt}
                onChange={(e) => setOverrideForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOverride(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedUser) return;
                upsertOverrideMutation.mutate({
                  userId: selectedUser.userId,
                  module: overrideForm.module,
                  action: overrideForm.action,
                  granted: overrideForm.granted,
                  reason: overrideForm.reason || undefined,
                  expiresAt: overrideForm.expiresAt ? new Date(overrideForm.expiresAt) : undefined,
                });
              }}
              disabled={upsertOverrideMutation.isPending}
            >
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
