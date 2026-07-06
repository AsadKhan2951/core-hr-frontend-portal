/**
 * pages/expenses/ExpenseClaimsPage.tsx
 *
 * Expense Claims — employees submit, managers approve/reject.
 * All approval decisions are human-initiated; no automated decisions are made.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DataTable } from "@/components/shared/DataTable";
import { StatusPill } from "@/components/shared/StatusPill";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PlusCircle, CheckCircle, XCircle, Receipt } from "lucide-react";
import { format } from "date-fns";
import type { ColumnDef } from "@/components/shared/DataTable";

type ExpenseClaim = {
  id: number;
  employeeId: number;
  title: string;
  category: string;
  amount: string;
  currency: string;
  expenseDate: Date;
  description?: string | null;
  status: string;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  rejectedReason?: string | null;
  createdAt: Date;
};

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel",
  accommodation: "Accommodation",
  meals: "Meals",
  transport: "Transport",
  office_supplies: "Office Supplies",
  training: "Training",
  client_entertainment: "Client Entertainment",
  medical: "Medical",
  other: "Other",
};

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  draft:     { label: "Draft",     variant: "neutral" },
  submitted: { label: "Pending",   variant: "warning" },
  approved:  { label: "Approved",  variant: "success" },
  rejected:  { label: "Rejected",  variant: "danger" },
  paid:      { label: "Paid",      variant: "info" },
};

export default function ExpenseClaimsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const employeeId = (user as { employeeId?: number })?.employeeId ?? 0;
  const isManager = (user as { hcmRoleSlug?: string })?.hcmRoleSlug !== "employee";

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: myExpenses = [], isLoading } = trpc.expense.list.useQuery(
    { employeeId: isManager ? undefined : employeeId },
    { retry: false, refetchOnWindowFocus: false }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = trpc.expense.create.useMutation({
    onSuccess: () => {
      toast.success("Expense claim created");
      utils.expense.list.invalidate();
      setCreateOpen(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitMutation = trpc.expense.submit.useMutation({
    onSuccess: () => {
      toast.success("Expense submitted for approval");
      utils.expense.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.expense.approve.useMutation({
    onSuccess: () => {
      toast.success("Expense approved");
      utils.expense.list.invalidate();
      setApprovalDialog(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.expense.reject.useMutation({
    onSuccess: () => {
      toast.success("Expense rejected");
      utils.expense.list.invalidate();
      setApprovalDialog(null);
      setRejectReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Local state ───────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{ claim: ExpenseClaim; mode: "approve" | "reject" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Form state
  const [form, setForm] = useState({
    title: "",
    category: "other" as "travel" | "accommodation" | "meals" | "transport" | "office_supplies" | "training" | "client_entertainment" | "medical" | "other",
    amount: "",
    currency: "AED",
    expenseDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
  });

  const resetForm = () => setForm({
    title: "", category: "other", amount: "", currency: "AED",
    expenseDate: format(new Date(), "yyyy-MM-dd"), description: "",
  });

  const handleCreate = () => {
    if (!form.title || !form.amount || !form.expenseDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      employeeId,
      title: form.title,
      category: form.category,
      amount: parseFloat(form.amount),
      currency: form.currency,
      expenseDate: new Date(form.expenseDate),
      description: form.description || undefined,
    });
  };

  const handleApprove = () => {
    if (!approvalDialog) return;
    approveMutation.mutate({ id: approvalDialog.claim.id, approverId: employeeId });
  };

  const handleReject = () => {
    if (!approvalDialog || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({
      id: approvalDialog.claim.id,
      approverId: employeeId,
      reason: rejectReason,
    });
  };

  // ── Columns ───────────────────────────────────────────────────────────────────
  const columns: ColumnDef<ExpenseClaim>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      searchable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-sm">{row.title}</div>
          <div className="text-xs text-muted-foreground">{CATEGORY_LABELS[row.category] ?? row.category}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-sm">
          {row.currency} {parseFloat(row.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "expenseDate",
      header: "Date",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.expenseDate ? format(new Date(row.expenseDate), "dd MMM yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => {
        const s = STATUS_MAP[row.status] ?? { label: row.status, variant: "neutral" as const };
        return <StatusPill label={s.label} variant={s.variant} />;
      },
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => submitMutation.mutate({ id: row.id })}
              disabled={submitMutation.isPending}
            >
              Submit
            </Button>
          )}
          {isManager && row.status === "submitted" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                onClick={() => setApprovalDialog({ claim: row, mode: "approve" })}
              >
                <CheckCircle className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => { setApprovalDialog({ claim: row, mode: "reject" }); setRejectReason(""); }}
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pendingCount = (myExpenses as ExpenseClaim[]).filter(e => e.status === "submitted").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Claims"
        breadcrumbs={[{ label: "Home", href: "/dashboard" }, { label: "Expense Claims" }]}
        action={
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            New Claim
          </Button>
        }
      />

      {isManager && pendingCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <Receipt className="h-4 w-4 shrink-0" />
          <span>
            <strong>{pendingCount}</strong> expense claim{pendingCount !== 1 ? "s" : ""} awaiting your review.
            All approval decisions require your explicit action.
          </span>
        </div>
      )}

      <DataTable
        title="Expense Claims"
        columns={columns}
        data={myExpenses as ExpenseClaim[]}
        loading={isLoading}
        pageSize={15}
        exportFilename="expense-claims"
        emptyIcon={Receipt}
        emptyTitle="No expense claims yet"
        emptyDescription="Submit your first expense claim using the button above."
        toolbarAction={
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <PlusCircle className="h-4 w-4" />
            New Claim
          </Button>
        }
      />

      {/* ── Create Claim Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Expense Claim</DialogTitle>
            <DialogDescription>
              Fill in the expense details. You can save as draft and submit later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Client dinner at Nobu"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as typeof f.category }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expenseDate">Expense Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={form.expenseDate}
                onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Additional notes or justification…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Save as Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approval Dialog ── */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog?.mode === "approve" ? "Approve Expense" : "Reject Expense"}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog?.mode === "approve"
                ? "You are about to approve this expense claim. This action requires your explicit confirmation."
                : "Please provide a reason for rejecting this expense claim."}
            </DialogDescription>
          </DialogHeader>
          {approvalDialog && (
            <div className="py-2 space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="font-medium">{approvalDialog.claim.title}</div>
                <div className="text-muted-foreground">
                  {approvalDialog.claim.currency} {parseFloat(approvalDialog.claim.amount).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                  {" · "}
                  {CATEGORY_LABELS[approvalDialog.claim.category]}
                </div>
              </div>
              {approvalDialog.mode === "reject" && (
                <div className="space-y-1.5">
                  <Label htmlFor="rejectReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectReason"
                    placeholder="Explain why this claim is being rejected…"
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancel</Button>
            {approvalDialog?.mode === "approve" ? (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                {approveMutation.isPending ? "Approving…" : "Confirm Approval"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                {rejectMutation.isPending ? "Rejecting…" : "Confirm Rejection"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
