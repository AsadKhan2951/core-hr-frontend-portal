/**
 * Settings → Users
 *
 * Lists all user accounts with search/filter by role, status, department.
 * Allows create / edit / deactivate (never hard-delete).
 * Creating a user lets you:
 *   (a) link to an existing employee record or create a fresh login-only account
 *   (b) assign one or more HCM roles
 *   (c) set active/inactive
 *   (d) trigger a password-set invite (shown on screen in dev mode)
 *
 * Only Super Admin and HR Admin can access this page.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable, ColumnDef } from "@/components/shared/DataTable";
import {
  UserPlus,
  Shield,
  Mail,
  UserX,
  Edit,
  Copy,
  Info,
  CheckCircle,
} from "lucide-react";

type UserProfile = {
  id: number;
  userId: number;
  companyId: number;
  employeeId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type HcmRole = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isPredefined: boolean;
  isActive: boolean;
};

type UserWithProfile = {
  id: number;
  userId: number;
  companyId: number;
  employeeId: number | null;
  isActive: boolean;
  inviteSentAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
  userOpenId: string | null;
  hcmRoles?: HcmRole[];
};

const EMPTY_FORM = {
  userId: 0,
  employeeId: null as number | null,
  isActive: true,
  roleIds: [] as number[],
};

export default function UsersPage() {
  const [editUser, setEditUser] = useState<UserWithProfile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<UserWithProfile | null>(null);
  const [inviteResult, setInviteResult] = useState<{ userId: number; link: string | null } | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: usersData, isLoading, refetch } = trpc.access.users.list.useQuery();
  const { data: rolesData } = trpc.access.roles.list.useQuery();
  const { data: employeesData } = trpc.employees.list.useQuery({ companyId: 1 });

  const createMutation = trpc.access.users.create.useMutation({
    onSuccess: () => {
      toast.success("User profile created");
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.access.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated");
      setEditUser(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.access.users.deactivate.useMutation({
    onSuccess: () => {
      toast.success("User deactivated (audit history preserved)");
      setDeactivateTarget(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendInviteMutation = trpc.access.users.sendInvite.useMutation({
    onSuccess: (data, vars) => {
                  setInviteResult({ userId: vars.userId, link: (data as { devInviteLink?: string }).devInviteLink ?? null });
      toast.success("Invite sent");
    },
    onError: (e) => toast.error(e.message),
  });

  const users: UserWithProfile[] = (usersData ?? []) as UserWithProfile[];
  const roles: HcmRole[] = rolesData ?? [];
  const employees = (employeesData ?? []) as unknown as Array<{ id: number; firstName: string; lastName: string; employeeNumber: string | null }>;

  const columns: ColumnDef<UserWithProfile>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.userName ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{row.userEmail ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "hcmRoles",
      header: "CORE HR Roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.hcmRoles && row.hcmRoles.length > 0 ? (
            row.hcmRoles.map((r) => (
              <Badge key={r.id} variant="secondary" className="text-xs">
                {r.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No roles</span>
          )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      filterable: true,
      filterType: "enum",
      filterOptions: ["Active", "Inactive"],
      render: (row) => (
        <Badge
          variant={row.isActive ? "default" : "secondary"}
          className={
            row.isActive
              ? "bg-green-500/20 text-green-700 dark:text-green-400"
              : "bg-red-500/20 text-red-700 dark:text-red-400"
          }
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "employeeId",
      header: "Employee Link",
      render: (row) =>
        row.employeeId ? (
          <Badge variant="outline" className="text-xs">
            EMP #{row.employeeId}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Login-only</span>
        ),
    },
    {
      key: "actions",
      header: "",
      noExport: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditUser(row);
              setForm({
                userId: row.userId,
                employeeId: row.employeeId ?? null,
                isActive: row.isActive,
                roleIds: row.hcmRoles?.map((r) => r.id) ?? [],
              });
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => sendInviteMutation.mutate({ userId: row.userId, email: row.userEmail ?? "" })}
            title="Send password invite"
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
          {row.isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeactivateTarget(row)}
              title="Deactivate user"
            >
              <UserX className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user accounts, roles, and access. Users are never deleted — deactivated accounts
            preserve full audit history.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Info banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Access restricted:</strong> Only Super Admin and HR Admin can manage users and
          roles. All changes are written to the audit log.
        </AlertDescription>
      </Alert>

      {/* Users DataTable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Search by name/email, filter by status or role. Click the mail icon to send a password
            invite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            loading={isLoading}
            rowKey={(row) => row.id}
            pageSize={20}
          />
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={showCreate || editUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setEditUser(null);
            setForm({ ...EMPTY_FORM });
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* User ID (for create, pick from existing Manus users) */}
            {!editUser && (
              <div className="space-y-1">
                <Label>Manus User ID *</Label>
                <Input
                  type="number"
                  placeholder="Enter user ID from auth.me"
                  value={form.userId || ""}
                  onChange={(e) => setForm((f) => ({ ...f, userId: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground">
                  The numeric ID from the user's Manus account (visible in auth.me response)
                </p>
              </div>
            )}

            {/* Link to employee */}
            <div className="space-y-1">
              <Label>Link to Employee Record (optional)</Label>
              <Select
                value={form.employeeId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, employeeId: v === "none" ? null : Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee or leave blank for login-only" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No employee link (login-only account)</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName} — {emp.employeeNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CORE HR Roles */}
            <div className="space-y-2">
              <Label>CORE HR Roles</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={form.roleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          roleIds: checked
                            ? [...f.roleIds, role.id]
                            : f.roleIds.filter((id) => id !== role.id),
                        }));
                      }}
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {role.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive users cannot log in but data is preserved
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setEditUser(null);
                setForm({ ...EMPTY_FORM });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editUser) {
                  updateMutation.mutate({
                    userId: editUser.userId,
                    employeeId: form.employeeId,
                    isActive: form.isActive,
                    roleIds: form.roleIds,
                  });
                } else {
                  if (!form.userId) return toast.error("User ID is required");
                  createMutation.mutate({
                    userId: form.userId,
                    employeeId: form.employeeId ?? undefined,
                    isActive: form.isActive,
                    roleIds: form.roleIds,
                  });
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deactivateTarget?.userName ?? deactivateTarget?.userEmail}</strong> will no longer be
              able to log in. Their data and audit history are fully preserved. You can reactivate
              them at any time by editing the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deactivateTarget && deactivateMutation.mutate({ userId: deactivateTarget.userId })
              }
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dev-mode invite link dialog */}
      {inviteResult && (
        <Dialog open onOpenChange={() => setInviteResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Invite Sent
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {inviteResult.link ? (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Dev mode:</strong> In production, this link would be sent via email.
                      Share it manually for testing.
                    </AlertDescription>
                  </Alert>
                  <div className="flex items-center gap-2">
                    <Input value={inviteResult.link} readOnly className="font-mono text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteResult.link!);
                        toast.success("Copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Invite email sent to user #{inviteResult.userId}.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setInviteResult(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
