import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Shield, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COMPANY_ID = 1;

const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "export"] as const;

export default function RolesPage() {
  const [companyId] = useMemo(() => [DEFAULT_COMPANY_ID], []);

  const { data: predefined, isLoading } = trpc.roles.listPredefined.useQuery();
  const { data: modules } = trpc.roles.listModules.useQuery();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Six predefined CORE HR roles with granular per-module permissions.
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
          : predefined?.map((role) => (
              <Card key={role.slug} className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{role.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{role.slug}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Permission matrix */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Permission Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each module supports these six permission actions, configurable per role.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground w-32">Action</th>
                  <th className="text-left py-2 font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_ACTIONS.map((action) => (
                  <tr key={action} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4">
                      <Badge variant="secondary" className="capitalize">{action}</Badge>
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">
                      {action === "view" && "Read-only access to list and detail views"}
                      {action === "create" && "Create new records in this module"}
                      {action === "edit" && "Modify existing records"}
                      {action === "delete" && "Permanently remove records"}
                      {action === "approve" && "Approve or reject workflow requests"}
                      {action === "export" && "Export data to CSV/PDF"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Module list */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Available Modules ({modules?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {modules?.map((mod) => (
              <Badge key={mod} variant="outline" className="capitalize">
                {mod.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
