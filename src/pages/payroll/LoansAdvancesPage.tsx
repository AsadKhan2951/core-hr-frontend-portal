/**
 * LoansAdvancesPage — Payroll Module 4
 * Manage employee loans and salary advances.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Edit, CreditCard, Banknote } from "lucide-react";

const COMPANY_ID = 1;

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function LoansAdvancesPage() {
  const utils = trpc.useUtils();

  // ── Loans ──────────────────────────────────────────────────────────────────
  const { data: loans = [], isLoading: loadingLoans } = trpc.payroll.loans.list.useQuery({ companyId: COMPANY_ID });
  const [loanDialog, setLoanDialog] = useState(false);
  const [loanForm, setLoanForm] = useState({
    employeeId: "", loanType: "Personal Loan", principalAmount: "", interestRate: "0",
    totalInstallments: "12", monthlyDeduction: "", disbursedDate: new Date().toISOString().split("T")[0], notes: "",
  });

  const createLoan = trpc.payroll.loans.create.useMutation({
    onSuccess: () => { utils.payroll.loans.list.invalidate(); toast.success("Loan created"); setLoanDialog(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateLoan = trpc.payroll.loans.update.useMutation({
    onSuccess: () => { utils.payroll.loans.list.invalidate(); toast.success("Loan updated"); },
    onError: (e) => toast.error(e.message),
  });

  // ── Advances ───────────────────────────────────────────────────────────────
  const { data: advances = [], isLoading: loadingAdvances } = trpc.payroll.advances.list.useQuery({ companyId: COMPANY_ID });
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: "", amount: "", reason: "",
    repaymentMonths: "1", disbursedDate: new Date().toISOString().split("T")[0],
  });

  const createAdvance = trpc.payroll.advances.create.useMutation({
    onSuccess: () => { utils.payroll.advances.list.invalidate(); toast.success("Advance created"); setAdvanceDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveLoan = () => {
    if (!loanForm.employeeId || !loanForm.principalAmount || !loanForm.monthlyDeduction) {
      return toast.error("Employee, principal amount, and monthly deduction are required");
    }
    const principal = parseFloat(loanForm.principalAmount);
    const monthly = parseFloat(loanForm.monthlyDeduction);
    createLoan.mutate({
      companyId: COMPANY_ID,
      employeeId: parseInt(loanForm.employeeId),
      loanType: loanForm.loanType,
      principalAmount: loanForm.principalAmount,
      interestRate: loanForm.interestRate,
      totalInstallments: parseInt(loanForm.totalInstallments),
      remainingInstallments: parseInt(loanForm.totalInstallments),
      monthlyDeduction: loanForm.monthlyDeduction,
      disbursedDate: new Date(loanForm.disbursedDate),
      notes: loanForm.notes || undefined,
    });
  };

  const handleSaveAdvance = () => {
    if (!advanceForm.employeeId || !advanceForm.amount) {
      return toast.error("Employee and amount are required");
    }
    createAdvance.mutate({
      companyId: COMPANY_ID,
      employeeId: parseInt(advanceForm.employeeId),
      amount: advanceForm.amount,
      notes: advanceForm.reason || undefined,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Loans & Advances</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage employee loans and salary advances. Deductions are applied automatically during payroll runs.</p>
      </div>

      <Tabs defaultValue="loans">
        <TabsList>
          <TabsTrigger value="loans"><CreditCard className="w-4 h-4 mr-2" />Loans ({loans.length})</TabsTrigger>
          <TabsTrigger value="advances"><Banknote className="w-4 h-4 mr-2" />Advances ({advances.length})</TabsTrigger>
        </TabsList>

        {/* ── LOANS TAB ──────────────────────────────────────────────────────── */}
        <TabsContent value="loans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Employee Loans</CardTitle>
              <Button size="sm" onClick={() => setLoanDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />New Loan
              </Button>
            </CardHeader>
            <CardContent>
              {loadingLoans ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : loans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No loans recorded.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Monthly Deduction</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Disbursed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.employeeId}</TableCell>
                        <TableCell>{l.loanType}</TableCell>
                        <TableCell>{parseFloat(l.principalAmount).toLocaleString()}</TableCell>
                        <TableCell>{parseFloat(l.monthlyDeduction).toLocaleString()}</TableCell>
                        <TableCell>{l.remainingInstallments} / {l.totalInstallments}</TableCell>
                        <TableCell>{new Date(l.disbursedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[l.status] ?? ""}`}>{l.status}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => updateLoan.mutate({ id: l.id, status: "active" })} disabled={l.status === "active"}>
                            Activate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ADVANCES TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="advances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Salary Advances</CardTitle>
              <Button size="sm" onClick={() => setAdvanceDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />New Advance
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAdvances ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : advances.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No salary advances recorded.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Repayment Months</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Disbursed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.employeeId}</TableCell>
                        <TableCell>{parseFloat(a.amount).toLocaleString()}</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>{new Date(a.requestedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[a.status] ?? ""}`}>{a.status}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── LOAN DIALOG ──────────────────────────────────────────────────────── */}
      <Dialog open={loanDialog} onOpenChange={setLoanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Employee Loan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Employee ID *</Label>
              <Input type="number" value={loanForm.employeeId} onChange={(e) => setLoanForm((f) => ({ ...f, employeeId: e.target.value }))} placeholder="Employee ID" />
            </div>
            <div>
              <Label>Loan Type</Label>
              <Select value={loanForm.loanType} onValueChange={(v) => setLoanForm((f) => ({ ...f, loanType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Personal Loan", "Home Loan", "Vehicle Loan", "Education Loan", "Emergency Loan"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Principal Amount *</Label>
              <Input type="number" value={loanForm.principalAmount} onChange={(e) => setLoanForm((f) => ({ ...f, principalAmount: e.target.value }))} />
            </div>
            <div>
              <Label>Interest Rate (decimal)</Label>
              <Input type="number" step="0.0001" value={loanForm.interestRate} onChange={(e) => setLoanForm((f) => ({ ...f, interestRate: e.target.value }))} />
            </div>
            <div>
              <Label>Total Installments</Label>
              <Input type="number" value={loanForm.totalInstallments} onChange={(e) => setLoanForm((f) => ({ ...f, totalInstallments: e.target.value }))} />
            </div>
            <div>
              <Label>Monthly Deduction *</Label>
              <Input type="number" value={loanForm.monthlyDeduction} onChange={(e) => setLoanForm((f) => ({ ...f, monthlyDeduction: e.target.value }))} />
            </div>
            <div>
              <Label>Disbursed Date</Label>
              <Input type="date" value={loanForm.disbursedDate} onChange={(e) => setLoanForm((f) => ({ ...f, disbursedDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={loanForm.notes} onChange={(e) => setLoanForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveLoan} disabled={createLoan.isPending}>
              {createLoan.isPending ? "Saving..." : "Create Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADVANCE DIALOG ───────────────────────────────────────────────────── */}
      <Dialog open={advanceDialog} onOpenChange={setAdvanceDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Salary Advance</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee ID *</Label>
              <Input type="number" value={advanceForm.employeeId} onChange={(e) => setAdvanceForm((f) => ({ ...f, employeeId: e.target.value }))} />
            </div>
            <div>
              <Label>Advance Amount *</Label>
              <Input type="number" value={advanceForm.amount} onChange={(e) => setAdvanceForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Repayment Months</Label>
              <Input type="number" min="1" value={advanceForm.repaymentMonths} onChange={(e) => setAdvanceForm((f) => ({ ...f, repaymentMonths: e.target.value }))} />
            </div>
            <div>
              <Label>Disbursed Date</Label>
              <Input type="date" value={advanceForm.disbursedDate} onChange={(e) => setAdvanceForm((f) => ({ ...f, disbursedDate: e.target.value }))} />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea value={advanceForm.reason} onChange={(e) => setAdvanceForm((f) => ({ ...f, reason: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAdvance} disabled={createAdvance.isPending}>
              {createAdvance.isPending ? "Saving..." : "Create Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
