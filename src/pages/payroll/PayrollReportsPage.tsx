/**
 * PayrollReportsPage — Payroll Module 4
 * 10+ report tabs with date-range filters and Excel export.
 * Reports: Monthly Summary, YTD, By Department, Tax Report, PF Report,
 * Loan Deductions, Advance Deductions, Payslip Detail, Cost Trend, Comparison.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";

const COMPANY_ID = 1;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = [2024, 2025, 2026, 2027];

function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = "Report") {
  if (!data.length) return toast.error("No data to export");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
  toast.success("Report exported");
}

export default function PayrollReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: summaryRows = [], isLoading: loadingSummary } = trpc.payroll.reports.summary.useQuery({ companyId: COMPANY_ID, month, year });
  const { data: deptRows = [], isLoading: loadingDept } = trpc.payroll.reports.byDepartment.useQuery({ companyId: COMPANY_ID, month, year });
  const { data: ytdRows = [], isLoading: loadingYtd } = trpc.payroll.reports.ytd.useQuery({ companyId: COMPANY_ID, year });
  const { data: loans = [], isLoading: loadingLoans } = trpc.payroll.loans.list.useQuery({ companyId: COMPANY_ID });
  const { data: advances = [], isLoading: loadingAdvances } = trpc.payroll.advances.list.useQuery({ companyId: COMPANY_ID });

  // ── Derived data ──────────────────────────────────────────────────────────
  const taxRows = summaryRows.map((r) => ({
    "Employee ID": r.employeeId,
    "Employee Name": r.employeeName,
    "Gross Salary": parseFloat(r.grossSalary),
    "Taxable Amount": parseFloat(r.grossSalary),
    "Tax Deducted": parseFloat(r.taxAmount),
    "PF Employee": parseFloat(r.pfEmployee),
    "PF Employer": parseFloat(r.pfEmployer),
    "Net Salary": parseFloat(r.netSalary),
    "Currency": r.currency,
  }));

  const pfRows = summaryRows.map((r) => ({
    "Employee ID": r.employeeId,
    "Employee Name": r.employeeName,
    "Basic Salary": parseFloat(r.basicSalary),
    "PF Employee Contribution": parseFloat(r.pfEmployee),
    "PF Employer Contribution": parseFloat(r.pfEmployer),
    "Total PF": parseFloat(r.pfEmployee) + parseFloat(r.pfEmployer),
    "Currency": r.currency,
  }));

  const totalGross = summaryRows.reduce((s, r) => s + parseFloat(r.grossSalary), 0);
  const totalNet = summaryRows.reduce((s, r) => s + parseFloat(r.netSalary), 0);
  const totalTax = summaryRows.reduce((s, r) => s + parseFloat(r.taxAmount), 0);
  const totalPfEmp = summaryRows.reduce((s, r) => s + parseFloat(r.pfEmployee), 0);
  const totalPfEr = summaryRows.reduce((s, r) => s + parseFloat(r.pfEmployer), 0);
  const totalDeductions = summaryRows.reduce((s, r) => s + parseFloat(r.totalDeductions), 0);

  // ── Date filter bar ───────────────────────────────────────────────────────
  const FilterBar = () => (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-sm">Month</Label>
        <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-sm">Year</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">10+ reports with date-range filters and Excel export</p>
      </div>

      <FilterBar />

      <Tabs defaultValue="summary">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
          <TabsTrigger value="ytd">YTD Trend</TabsTrigger>
          <TabsTrigger value="dept">By Department</TabsTrigger>
          <TabsTrigger value="tax">Tax Report</TabsTrigger>
          <TabsTrigger value="pf">PF Report</TabsTrigger>
          <TabsTrigger value="loans">Loan Deductions</TabsTrigger>
          <TabsTrigger value="advances">Advance Deductions</TabsTrigger>
          <TabsTrigger value="payslip">Payslip Detail</TabsTrigger>
          <TabsTrigger value="cost">Cost Overview</TabsTrigger>
          <TabsTrigger value="comparison">Month Comparison</TabsTrigger>
        </TabsList>

        {/* ── 1. MONTHLY SUMMARY ──────────────────────────────────────────────── */}
        <TabsContent value="summary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Monthly Payroll Summary — {MONTHS[month - 1]} {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                summaryRows.map((r) => ({
                  "Employee ID": r.employeeId, "Name": r.employeeName, "Emp #": r.employeeNumber,
                  "Basic": parseFloat(r.basicSalary), "Gross": parseFloat(r.grossSalary),
                  "Deductions": parseFloat(r.totalDeductions), "Tax": parseFloat(r.taxAmount),
                  "PF Emp": parseFloat(r.pfEmployee), "PF Er": parseFloat(r.pfEmployer),
                  "Loan": parseFloat(r.loanDeductions), "Net": parseFloat(r.netSalary),
                  "Currency": r.currency, "Status": r.status,
                })), `payroll-summary-${month}-${year}`, "Monthly Summary"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {/* Totals */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {[
                  { label: "Employees", value: summaryRows.length },
                  { label: "Total Gross", value: `AED ${totalGross.toLocaleString()}` },
                  { label: "Total Deductions", value: `AED ${totalDeductions.toLocaleString()}` },
                  { label: "Total Tax", value: `AED ${totalTax.toLocaleString()}` },
                  { label: "Total Net", value: `AED ${totalNet.toLocaleString()}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {loadingSummary ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : summaryRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payroll data for this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Basic</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>PF</TableHead>
                        <TableHead>Loan</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>{parseFloat(r.basicSalary).toLocaleString()}</TableCell>
                          <TableCell>{parseFloat(r.grossSalary).toLocaleString()}</TableCell>
                          <TableCell className="text-red-600">{parseFloat(r.taxAmount).toLocaleString()}</TableCell>
                          <TableCell className="text-red-600">{parseFloat(r.pfEmployee).toLocaleString()}</TableCell>
                          <TableCell className="text-red-600">{parseFloat(r.loanDeductions).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">{parseFloat(r.netSalary).toLocaleString()}</TableCell>
                          <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.status}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2. YTD TREND ────────────────────────────────────────────────────── */}
        <TabsContent value="ytd">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Year-to-Date Payroll Trend — {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                ytdRows.map((r) => ({
                  "Month": MONTHS[(r.month ?? 1) - 1], "Gross": r.totalGross, "Net": r.totalNet,
                  "Tax": r.totalTax, "Headcount": r.headcount,
                })), `ytd-payroll-${year}`, "YTD Trend"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingYtd ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : ytdRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No YTD data for {year}.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Headcount</TableHead>
                      <TableHead>Total Gross</TableHead>
                      <TableHead>Total Tax</TableHead>
                      <TableHead>Total Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ytdRows.map((r) => (
                      <TableRow key={r.month}>
                        <TableCell className="font-medium">{MONTHS[(r.month ?? 1) - 1]}</TableCell>
                        <TableCell>{r.headcount}</TableCell>
                        <TableCell>{r.totalGross?.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">{r.totalTax?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{r.totalNet?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{ytdRows.reduce((s, r) => s + (r.totalGross ?? 0), 0).toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">{ytdRows.reduce((s, r) => s + (r.totalTax ?? 0), 0).toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600">{ytdRows.reduce((s, r) => s + (r.totalNet ?? 0), 0).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3. BY DEPARTMENT ─────────────────────────────────────────────────── */}
        <TabsContent value="dept">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payroll Cost by Department — {MONTHS[month - 1]} {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                deptRows.map((r) => ({
                  "Department ID": r.departmentId, "Headcount": r.headcount,
                  "Total Gross": r.totalGross, "Total Net": r.totalNet,
                })), `payroll-by-dept-${month}-${year}`, "By Department"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingDept ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : deptRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No department data for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead>Headcount</TableHead>
                      <TableHead>Total Gross</TableHead>
                      <TableHead>Total Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deptRows.map((r) => (
                      <TableRow key={r.departmentId ?? "none"}>
                        <TableCell className="font-medium">Dept #{r.departmentId ?? "—"}</TableCell>
                        <TableCell>{r.headcount}</TableCell>
                        <TableCell>{r.totalGross?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-emerald-600">{r.totalNet?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 4. TAX REPORT ────────────────────────────────────────────────────── */}
        <TabsContent value="tax">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tax Deduction Report — {MONTHS[month - 1]} {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(taxRows, `tax-report-${month}-${year}`, "Tax Report")}>
                <Download className="w-4 h-4 mr-2" />Export (Govt Format)
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : summaryRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data for this period.</div>
              ) : (
                <>
                  <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <span>Total Tax Collected: <strong>AED {totalTax.toLocaleString()}</strong></span>
                    <span>Employees: <strong>{summaryRows.length}</strong></span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>Taxable Amount</TableHead>
                        <TableHead>Tax Deducted</TableHead>
                        <TableHead>PF Employee</TableHead>
                        <TableHead>PF Employer</TableHead>
                        <TableHead>Net Salary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>{parseFloat(r.grossSalary).toLocaleString()}</TableCell>
                          <TableCell>{parseFloat(r.grossSalary).toLocaleString()}</TableCell>
                          <TableCell className="text-red-600 font-medium">{parseFloat(r.taxAmount).toLocaleString()}</TableCell>
                          <TableCell>{parseFloat(r.pfEmployee).toLocaleString()}</TableCell>
                          <TableCell>{parseFloat(r.pfEmployer).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">{parseFloat(r.netSalary).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell>{totalGross.toLocaleString()}</TableCell>
                        <TableCell>{totalGross.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">{totalTax.toLocaleString()}</TableCell>
                        <TableCell>{totalPfEmp.toLocaleString()}</TableCell>
                        <TableCell>{totalPfEr.toLocaleString()}</TableCell>
                        <TableCell className="text-emerald-600">{totalNet.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 5. PF REPORT ─────────────────────────────────────────────────────── */}
        <TabsContent value="pf">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Provident Fund Report — {MONTHS[month - 1]} {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(pfRows, `pf-report-${month}-${year}`, "PF Report")}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : summaryRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data for this period.</div>
              ) : (
                <>
                  <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <span>Total PF Employee: <strong>AED {totalPfEmp.toLocaleString()}</strong></span>
                    <span>Total PF Employer: <strong>AED {totalPfEr.toLocaleString()}</strong></span>
                    <span>Combined: <strong>AED {(totalPfEmp + totalPfEr).toLocaleString()}</strong></span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>PF Employee</TableHead>
                        <TableHead>PF Employer</TableHead>
                        <TableHead>Total PF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>{parseFloat(r.basicSalary).toLocaleString()}</TableCell>
                          <TableCell>{parseFloat(r.pfEmployee).toLocaleString()}</TableCell>
                          <TableCell>{parseFloat(r.pfEmployer).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">{(parseFloat(r.pfEmployee) + parseFloat(r.pfEmployer)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 6. LOAN DEDUCTIONS ───────────────────────────────────────────────── */}
        <TabsContent value="loans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Loan Deductions Report</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                loans.map((l) => ({
                  "Employee ID": l.employeeId, "Loan Type": l.loanType,
                  "Principal": parseFloat(l.principalAmount), "Monthly Deduction": parseFloat(l.monthlyDeduction),
                  "Remaining Installments": l.remainingInstallments, "Status": l.status,
                })), `loan-deductions-${year}`, "Loan Deductions"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingLoans ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : loans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No loan records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Monthly Deduction</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
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
                        <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{l.status}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 7. ADVANCE DEDUCTIONS ────────────────────────────────────────────── */}
        <TabsContent value="advances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Advance Deductions Report</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                advances.map((a) => ({
                  "Employee ID": a.employeeId, "Amount": parseFloat(a.amount),
                  "Requested Date": new Date(a.requestedDate).toLocaleDateString(), "Status": a.status,
                })), `advance-deductions-${year}`, "Advance Deductions"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingAdvances ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : advances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No advance records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.employeeId}</TableCell>
                        <TableCell>{parseFloat(a.amount).toLocaleString()}</TableCell>
                        <TableCell>{new Date(a.requestedDate).toLocaleDateString()}</TableCell>
                        <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{a.status}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 8. PAYSLIP DETAIL ────────────────────────────────────────────────── */}
        <TabsContent value="payslip">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payslip Detail Report — {MONTHS[month - 1]} {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                summaryRows.map((r) => ({
                  "Employee ID": r.employeeId, "Name": r.employeeName, "Emp #": r.employeeNumber,
                  "Basic": parseFloat(r.basicSalary), "Gross": parseFloat(r.grossSalary),
                  "Tax": parseFloat(r.taxAmount), "PF Emp": parseFloat(r.pfEmployee),
                  "PF Er": parseFloat(r.pfEmployer), "Loan": parseFloat(r.loanDeductions),
                  "Total Deductions": parseFloat(r.totalDeductions), "Net": parseFloat(r.netSalary),
                  "Currency": r.currency, "Status": r.status,
                })), `payslip-detail-${month}-${year}`, "Payslip Detail"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : summaryRows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payslips for this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Basic</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>PF Emp</TableHead>
                        <TableHead>PF Er</TableHead>
                        <TableHead>Loan</TableHead>
                        <TableHead>Total Ded.</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{r.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{r.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{parseFloat(r.basicSalary).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{parseFloat(r.grossSalary).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-red-600">{parseFloat(r.taxAmount).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{parseFloat(r.pfEmployee).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{parseFloat(r.pfEmployer).toLocaleString()}</TableCell>
                          <TableCell className="text-sm">{parseFloat(r.loanDeductions).toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-red-600">{parseFloat(r.totalDeductions).toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-semibold text-emerald-600">{parseFloat(r.netSalary).toLocaleString()}</TableCell>
                          <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{r.status}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 9. COST OVERVIEW ─────────────────────────────────────────────────── */}
        <TabsContent value="cost">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payroll Cost Overview — {MONTHS[month - 1]} {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel([{
                "Month": MONTHS[month - 1], "Year": year, "Headcount": summaryRows.length,
                "Total Gross": totalGross, "Total Net": totalNet, "Total Tax": totalTax,
                "Total PF Employee": totalPfEmp, "Total PF Employer": totalPfEr,
                "Total Deductions": totalDeductions,
              }], `cost-overview-${month}-${year}`, "Cost Overview")}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Headcount", value: summaryRows.length, color: "text-blue-600" },
                  { label: "Total Gross", value: `AED ${totalGross.toLocaleString()}`, color: "text-foreground" },
                  { label: "Total Net Paid", value: `AED ${totalNet.toLocaleString()}`, color: "text-emerald-600" },
                  { label: "Total Tax", value: `AED ${totalTax.toLocaleString()}`, color: "text-red-600" },
                  { label: "PF Employee", value: `AED ${totalPfEmp.toLocaleString()}`, color: "text-orange-600" },
                  { label: "PF Employer", value: `AED ${totalPfEr.toLocaleString()}`, color: "text-purple-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 10. MONTH COMPARISON ─────────────────────────────────────────────── */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Month-over-Month Comparison — {year}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportToExcel(
                ytdRows.map((r) => ({
                  "Month": MONTHS[(r.month ?? 1) - 1], "Headcount": r.headcount,
                  "Gross": r.totalGross, "Net": r.totalNet, "Tax": r.totalTax,
                })), `month-comparison-${year}`, "Comparison"
              )}>
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
            </CardHeader>
            <CardContent>
              {loadingYtd ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : ytdRows.length < 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Need at least 2 months of data for comparison.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Headcount</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>MoM Net Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ytdRows.map((r, i) => {
                      const prev = ytdRows[i - 1];
                      const change = prev ? ((r.totalNet - prev.totalNet) / prev.totalNet * 100) : null;
                      return (
                        <TableRow key={r.month}>
                          <TableCell className="font-medium">{MONTHS[(r.month ?? 1) - 1]}</TableCell>
                          <TableCell>{r.headcount}</TableCell>
                          <TableCell>{r.totalGross?.toLocaleString()}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">{r.totalNet?.toLocaleString()}</TableCell>
                          <TableCell className="text-red-600">{r.totalTax?.toLocaleString()}</TableCell>
                          <TableCell>
                            {change !== null ? (
                              <span className={change >= 0 ? "text-emerald-600" : "text-red-600"}>
                                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                              </span>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
