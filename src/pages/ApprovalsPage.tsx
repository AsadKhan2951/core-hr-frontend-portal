import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Clock, XCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COMPANY_ID = 1;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  submitted: { label: "Submitted", variant: "outline", icon: Inbox },
  cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
  draft: { label: "Draft", variant: "outline", icon: Inbox },
};

export default function ApprovalsPage() {
  const [companyId] = useMemo(() => [DEFAULT_COMPANY_ID], []);

  const { data: instances, isLoading } = trpc.workflow.listInstances.useQuery({ companyId });
  const { data: pendingCount } = trpc.workflow.pendingCount.useQuery({ companyId });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and act on workflow approval requests.
          </p>
        </div>
        {(pendingCount?.count ?? 0) > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount?.count} pending
          </Badge>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !instances || instances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No workflow requests yet</p>
              <p className="text-xs mt-1">Requests submitted through the workflow engine will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Title</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Type</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Status</th>
                    <th className="text-left py-3 font-semibold text-foreground">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((wf) => {
                    const config = STATUS_CONFIG[wf.status] ?? STATUS_CONFIG.draft;
                    const StatusIcon = config.icon;
                    return (
                      <tr key={wf.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{wf.title}</p>
                          {wf.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{wf.description}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="capitalize text-xs">
                            {wf.requestType.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className="h-3.5 w-3.5" />
                            <Badge variant={config.variant} className="text-xs">
                              {config.label}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {new Date(wf.createdAt).toLocaleDateString()}
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
    </div>
  );
}
