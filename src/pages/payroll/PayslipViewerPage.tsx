/**
 * PayslipViewerPage — Payroll Module 4
 * Admin view: browse payslips for a payroll run, view detail, export bank/salary sheet.
 * ESS view: employee's own payslips with AI plain-English explainer.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileText, Bot, Download, Eye, RefreshCw, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { generatePayslipPdf } from "@/lib/pdfGenerator";

const COMPANY_ID = 1;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function PayslipViewerPage() {
  const { user } = useAuth();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<number | null>(null);
  const [payslipDialog, setPayslipDialog] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const { data: runs = [] } = trpc.payroll.runs.list.useQuery({ companyId: COMPANY_ID });
  const { data: payslips = [], isLoading: loadingPayslips } = trpc.payroll.payslips.list.useQuery(
    { payrollRunId: selectedRunId! },
    { enabled: !!selectedRunId }
  );
  const { data: payslipDetail } = trpc.payroll.payslips.get.useQuery(
    { id: selectedPayslip! },
    { enabled: !!selectedPayslip }
  );
  const { data: myPayslips = [], isLoading: loadingMyPayslips } = trpc.payroll.payslips.myPayslips.useQuery(
    { employeeId: user?.id ?? 0 },
    { enabled: !!user?.id }
  );

  const explainPayslip = trpc.payroll.ai.explainPayslip.useMutation({
    onSuccess: (data) => { setAiExplanation(data.explanation); setLoadingExplanation(false); },
    onError: (e) => { toast.error(e.message); setLoadingExplanation(false); },
  });

  const handleExplain = (payslipId: number) => {
    setLoadingExplanation(true);
    setAiExplanation(null);
    explainPayslip.mutate({ payslipId });
  };

  const handleExportBankSheet = () => {
    if (!payslips.length) return toast.error("No payslips to export");
    const run = runs.find((r) => r.id === selectedRunId);
    const rows = payslips.map((p) => ({
      "Employee ID": p.employeeId,
      "Employee Name": p.employeeName,
      "IBAN / Account": "",
      "Bank Name": "",
      "Net Salary": parseFloat(p.netSalary),
      "Currency": p.currency,
      "Month": run ? `${MONTHS[run.month - 1]} ${run.year}` : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bank Sheet");
    XLSX.writeFile(wb, `bank-sheet-${run?.month}-${run?.year}.xlsx`);
    toast.success("Bank sheet exported");
  };

  const handleExportSalarySheet = () => {
    if (!payslips.length) return toast.error("No payslips to export");
    const run = runs.find((r) => r.id === selectedRunId);
    const rows = payslips.map((p) => ({
      "Employee ID": p.employeeId,
      "Employee Name": p.employeeName,
      "Basic Salary": parseFloat(p.basicSalary),
      "Gross Salary": parseFloat(p.grossSalary),
      "Total Deductions": parseFloat(p.totalDeductions),
      "Tax": parseFloat(p.taxAmount),
      "PF Employee": parseFloat(p.pfEmployee),
      "PF Employer": parseFloat(p.pfEmployer),
      "Loan Deductions": parseFloat(p.loanDeductions),
      "Advance Deductions": parseFloat(p.advanceDeductions),
      "Net Salary": parseFloat(p.netSalary),
      "Currency": p.currency,
      "Status": p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Sheet");
    XLSX.writeFile(wb, `salary-sheet-${run?.month}-${run?.year}.xlsx`);
    toast.success("Salary sheet exported");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payslips</h1>
        <p className="text-sm text-muted-foreground mt-1">View, export, and explain payslips</p>
      </div>

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin"><FileText className="w-4 h-4 mr-2" />Admin View</TabsTrigger>
          <TabsTrigger value="ess"><Eye className="w-4 h-4 mr-2" />My Payslips (ESS)</TabsTrigger>
        </TabsList>

        {/* ── ADMIN VIEW ─────────────────────────────────────────────────────── */}
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>Payslips by Run</CardTitle>
                  <CardDescription>Select a payroll run to view all payslips</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={selectedRunId ? String(selectedRunId) : ""} onValueChange={(v) => setSelectedRunId(parseInt(v))}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select payroll run..." />
                    </SelectTrigger>
                    <SelectContent>
                      {runs.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {MONTHS[r.month - 1]} {r.year} — {r.status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRunId && (
                    <>
                      <Button size="sm" variant="outline" onClick={handleExportBankSheet}>
                        <Download className="w-4 h-4 mr-2" />Bank Sheet
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleExportSalarySheet}>
                        <Download className="w-4 h-4 mr-2" />Salary Sheet
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedRunId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a payroll run above to view payslips.</p>
                </div>
              ) : loadingPayslips ? (
                <div className="text-center py-8 text-muted-foreground">Loading payslips...</div>
              ) : payslips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payslips for this run.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Basic</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.employeeName}</p>
                            <p className="text-xs text-muted-foreground">ID: {p.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{p.currency} {parseFloat(p.basicSalary).toLocaleString()}</TableCell>
                        <TableCell>{p.currency} {parseFloat(p.grossSalary).toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">-{p.currency} {parseFloat(p.totalDeductions).toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{p.currency} {parseFloat(p.netSalary).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedPayslip(p.id); setPayslipDialog(true); setAiExplanation(null); }}>
                            <Eye className="w-4 h-4" />
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

        {/* ── ESS VIEW ───────────────────────────────────────────────────────── */}
        <TabsContent value="ess">
          <Card>
            <CardHeader>
              <CardTitle>My Payslips</CardTitle>
              <CardDescription>Your personal payslip history. Use the AI explainer to understand your net pay.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMyPayslips ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : myPayslips.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No payslips available yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myPayslips.map((p) => (
                    <div key={p.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{MONTHS[(p.month ?? 1) - 1]} {p.year}</p>
                        <p className="text-sm text-muted-foreground">
                          Gross: {p.currency} {parseFloat(p.grossSalary).toLocaleString()} &nbsp;·&nbsp;
                          Net: <span className="font-semibold text-foreground">{p.currency} {parseFloat(p.netSalary).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedPayslip(p.id); setPayslipDialog(true); setAiExplanation(null); }}>
                          <Eye className="w-4 h-4 mr-2" />View
                        </Button>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => { setSelectedPayslip(p.id); setPayslipDialog(true); handleExplain(p.id); }}>
                          <Bot className="w-4 h-4 mr-2" />Explain
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── PAYSLIP DETAIL DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={payslipDialog} onOpenChange={(o) => { setPayslipDialog(o); if (!o) { setAiExplanation(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payslip — {payslipDetail ? `${MONTHS[(payslipDetail.month ?? 1) - 1]} ${payslipDetail.year}` : ""}
            </DialogTitle>
          </DialogHeader>

          {payslipDetail && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{payslipDetail.employeeName}</p>
                    <p className="text-sm text-muted-foreground">Employee ID: {payslipDetail.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{MONTHS[(payslipDetail.month ?? 1) - 1]} {payslipDetail.year}</p>
                    <Badge variant={payslipDetail.status === "approved" ? "default" : "secondary"}>{payslipDetail.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">Earnings</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Basic Salary</span>
                    <span className="font-medium">{payslipDetail.currency} {parseFloat(payslipDetail.basicSalary).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Gross Salary</span>
                    <span>{payslipDetail.currency} {parseFloat(payslipDetail.grossSalary).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Deductions */}
              <div>
                <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">Deductions</p>
                <div className="space-y-1">
                  {parseFloat(payslipDetail.taxAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Income Tax</span>
                      <span className="text-red-600">-{payslipDetail.currency} {parseFloat(payslipDetail.taxAmount).toLocaleString()}</span>
                    </div>
                  )}
                  {parseFloat(payslipDetail.pfEmployee) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>PF (Employee)</span>
                      <span className="text-red-600">-{payslipDetail.currency} {parseFloat(payslipDetail.pfEmployee).toLocaleString()}</span>
                    </div>
                  )}
                  {parseFloat(payslipDetail.loanDeductions) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Loan Deduction</span>
                      <span className="text-red-600">-{payslipDetail.currency} {parseFloat(payslipDetail.loanDeductions).toLocaleString()}</span>
                    </div>
                  )}
                  {parseFloat(payslipDetail.advanceDeductions) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Advance Recovery</span>
                      <span className="text-red-600">-{payslipDetail.currency} {parseFloat(payslipDetail.advanceDeductions).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Total Deductions</span>
                    <span className="text-red-600">-{payslipDetail.currency} {parseFloat(payslipDetail.totalDeductions).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net */}
              <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                <span className="font-bold text-lg">Net Salary</span>
                <span className="font-bold text-lg text-emerald-600">{payslipDetail.currency} {parseFloat(payslipDetail.netSalary).toLocaleString()}</span>
              </div>

              {/* PF Employer */}
              {parseFloat(payslipDetail.pfEmployer) > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground border rounded p-2">
                  <span>Employer PF Contribution (not deducted from salary)</span>
                  <span>{payslipDetail.currency} {parseFloat(payslipDetail.pfEmployer).toLocaleString()}</span>
                </div>
              )}

              {/* AI Explainer */}
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm text-blue-700 dark:text-blue-300">AI Payslip Explainer</span>
                    <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded">For your understanding only</span>
                  </div>
                  {!aiExplanation && (
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => handleExplain(payslipDetail.id)} disabled={loadingExplanation}>
                      {loadingExplanation ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Explaining...</> : "Explain my payslip"}
                    </Button>
                  )}
                </div>
                {loadingExplanation && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI is analysing your payslip...</span>
                  </div>
                )}
                {aiExplanation && (
                  <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">
                    {aiExplanation}
                  </div>
                )}
                {!aiExplanation && !loadingExplanation && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">Click "Explain my payslip" to get a plain-English breakdown of your pay this month.</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (payslipDetail) {
                      generatePayslipPdf({
                        ...payslipDetail,
                        companyName: "Rad Technologies",
                      });
                    }
                  }}
                  disabled={!payslipDetail}
                >
                  <Download className="w-4 h-4 mr-2" />Download PDF
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" />Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
