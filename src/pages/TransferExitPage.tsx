import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable, type ColumnDef } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw, LogOut, Plus, ArrowRight, Calendar } from "lucide-react";

const companyId = 1;

const TRANSFER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

const EXIT_TYPE_LABELS: Record<string, string> = {
  resignation: "Resignation",
  termination: "Termination",
  retirement: "Retirement",
  end_of_contract: "End of Contract",
  mutual_separation: "Mutual Separation",
};

type TransferRow = {
  id: number;
  employeeId: number;
  fromDepartmentId: number | null;
  toDepartmentId: number | null;
  fromLocationId: number | null;
  toLocationId: number | null;
  effectiveDate: Date;
  status: string;
  reason: string | null;
  employeeName?: string;
  fromDepartment?: string;
  toDepartment?: string;
};

type ExitRow = {
  id: number;
  employeeId: number;
  exitType: string;
  exitDate: Date;
  status: string;
  reason: string | null;
  employeeName?: string;
};

// ─── Transfer Dialog ──────────────────────────────────────────────────────────
function TransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [toDeptId, setToDeptId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: employees } = trpc.employees.list.useQuery({ companyId });
  const { data: departments } = trpc.org.listDepartments.useQuery({ companyId });
  const createTransfer = trpc.employees.transfers.create.useMutation({
    onSuccess: () => { toast.success("Transfer request submitted"); onClose(); },
    onError: () => toast.error("Failed to submit transfer"),
  });

  const handleSubmit = () => {
    if (!employeeId || !toDeptId || !effectiveDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createTransfer.mutate({
      companyId,
      employeeId: parseInt(employeeId),
      toDepartmentId: parseInt(toDeptId),
      effectiveDate: new Date(effectiveDate),
      reason: reason || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4" />New Transfer Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees?.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Transfer To Department *</Label>
            <Select onValueChange={setToDeptId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d: { id: number; name: string }) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Effective Date *</Label>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea placeholder="Reason for transfer…" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createTransfer.isPending}>
            {createTransfer.isPending ? "Submitting…" : "Submit Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Exit Dialog ──────────────────────────────────────────────────────────────
function ExitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [employeeId, setEmployeeId] = useState("");
  const [exitType, setExitType] = useState<"resignation" | "termination" | "retirement" | "end_of_contract" | "mutual_separation">("resignation");
  const [exitDate, setExitDate] = useState("");
  const [reason, setReason] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("30");

  const { data: employees } = trpc.employees.list.useQuery({ companyId });
  const createExit = trpc.employees.exits.initiate.useMutation({
    onSuccess: () => { toast.success("Exit record created"); onClose(); },
    onError: () => toast.error("Failed to create exit record"),
  });

  const handleSubmit = () => {
    if (!employeeId || !exitDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createExit.mutate({
      companyId,
      employeeId: parseInt(employeeId),
      exitType: exitType as "resignation" | "termination" | "retirement" | "end_of_contract" | "redundancy" | "death" | "absconding",
      lastWorkingDay: new Date(exitDate),
      reason: reason || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LogOut className="w-4 h-4" />New Exit Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <Select onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees?.map(e => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Exit Type *</Label>
            <Select value={exitType} onValueChange={v => setExitType(v as typeof exitType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(EXIT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Exit Date *</Label>
              <Input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notice Period (days)</Label>
              <Input type="number" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} min="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea placeholder="Reason for exit…" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createExit.isPending}>
            {createExit.isPending ? "Saving…" : "Save Exit Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TransferExitPage() {
  const [transferOpen, setTransferOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const { data: transfers, isLoading: loadingTransfers } = trpc.employees.transfers.list.useQuery({ companyId });
  const { data: exits, isLoading: loadingExits } = trpc.employees.exits.list.useQuery({ companyId });

  const transferCols: ColumnDef<TransferRow>[] = [
    { key: "employeeName", header: "Employee", sortable: true, render: (row) => <span className="font-medium text-sm">{row.employeeName ?? `EMP-${row.employeeId}`}</span> },
    { key: "fromDepartment", header: "From", render: (row) => (
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{row.fromDepartment ?? "—"}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground" />
        <span>{row.toDepartment ?? "—"}</span>
      </div>
    )},
    { key: "effectiveDate", header: "Effective Date", sortable: true, render: (row) => (
      <div className="flex items-center gap-1.5 text-sm"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />{new Date(row.effectiveDate).toLocaleDateString()}</div>
    )},
    { key: "status", header: "Status", render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TRANSFER_STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
        {row.status}
      </span>
    )},
    { key: "reason", header: "Reason", render: (row) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{row.reason ?? "—"}</span> },
  ];

  const exitCols: ColumnDef<ExitRow>[] = [
    { key: "employeeName", header: "Employee", sortable: true, render: (row) => <span className="font-medium text-sm">{row.employeeName ?? `EMP-${row.employeeId}`}</span> },
    { key: "exitType", header: "Exit Type", sortable: true, render: (row) => <span className="text-sm">{EXIT_TYPE_LABELS[row.exitType] ?? row.exitType}</span> },
    { key: "exitDate", header: "Exit Date", sortable: true, render: (row) => (
      <div className="flex items-center gap-1.5 text-sm"><Calendar className="w-3.5 h-3.5 text-muted-foreground" />{new Date(row.exitDate).toLocaleDateString()}</div>
    )},
    { key: "status", header: "Status", render: (row) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TRANSFER_STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
        {row.status}
      </span>
    )},
    { key: "reason", header: "Reason", render: (row) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{row.reason ?? "—"}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transfers & Exits</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage employee transfers and exit handoffs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <RefreshCw className="w-4 h-4 mr-1.5" />New Transfer
          </Button>
          <Button onClick={() => setExitOpen(true)}>
            <LogOut className="w-4 h-4 mr-1.5" />New Exit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{transfers?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Total Transfers</div>
            <div className="text-xs text-muted-foreground mt-1">
              {transfers?.filter(t => t.status === "draft").length ?? 0} pending approval
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{exits?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Total Exits</div>
            <div className="text-xs text-muted-foreground mt-1">
              {exits?.filter(e => e.status === "initiated").length ?? 0} pending clearance
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfers">
        <TabsList>
          <TabsTrigger value="transfers">Transfers ({transfers?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="exits">Exits ({exits?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="transfers" className="mt-4">
          {loadingTransfers ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !transfers?.length ? (
            <EmptyState icon={RefreshCw} title="No transfers" description="No transfer requests have been created yet."
              action={{ label: "New Transfer", onClick: () => setTransferOpen(true) }} />
          ) : (
            <DataTable<TransferRow>
              columns={transferCols}
              data={transfers as unknown as TransferRow[]}
              title="Transfer Requests"
              exportFilename="transfers"
            />
          )}
        </TabsContent>
        <TabsContent value="exits" className="mt-4">
          {loadingExits ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !exits?.length ? (
            <EmptyState icon={LogOut} title="No exits" description="No exit records have been created yet."
              action={{ label: "New Exit", onClick: () => setExitOpen(true) }} />
          ) : (
            <DataTable<ExitRow>
              columns={exitCols}
              data={exits as unknown as ExitRow[]}
              title="Exit Records"
              exportFilename="exits"
            />
          )}
        </TabsContent>
      </Tabs>

      <TransferDialog open={transferOpen} onClose={() => setTransferOpen(false)} />
      <ExitDialog open={exitOpen} onClose={() => setExitOpen(false)} />
    </div>
  );
}
