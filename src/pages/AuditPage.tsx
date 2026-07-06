import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileText, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COMPANY_ID = 1;

export default function AuditPage() {
  const [companyId] = useMemo(() => [DEFAULT_COMPANY_ID], []);

  const { data: logs, isLoading } = trpc.audit.list.useQuery({ companyId, limit: 50 });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable record of all system actions — who did what, when.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No audit events yet</p>
              <p className="text-xs mt-1">System actions will be recorded here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Actor</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Action</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Module</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Entity</th>
                    <th className="text-left py-3 font-semibold text-foreground">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Activity className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{log.actorName ?? "System"}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="capitalize text-xs">
                          {log.module.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">
                        {log.entityLabel ?? log.entityType}
                        {log.entityId ? ` #${log.entityId}` : ""}
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
