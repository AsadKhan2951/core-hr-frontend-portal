/**
 * HrLettersPage — HR Documents Module
 *
 * Allows HR managers and admins to generate standard HR letters for any employee:
 *   - Employment Confirmation Letter
 *   - Salary Certificate
 *   - No Objection Certificate (NOC)
 *   - Experience Letter
 *   - Promotion Letter
 *
 * All letters are generated client-side as PDF using jsPDF.
 * No data is sent to an external service — fully offline-capable.
 *
 * AI Safety: No AI is involved in letter generation. All content is deterministic
 * and based on the employee's actual HR record. The HR user reviews the preview
 * before downloading.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Building2,
  User,
  Briefcase,
  DollarSign,
  ShieldCheck,
  Award,
  Star,
} from "lucide-react";
import { generateHrLetterPdf, type HrLetterType } from "@/lib/pdfGenerator";
import { format } from "date-fns";

const COMPANY_ID = 1;

const LETTER_TYPES: { value: HrLetterType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: "employment_confirmation",
    label: "Employment Confirmation",
    icon: Building2,
    description: "Confirms the employee's current employment status, designation, and department.",
  },
  {
    value: "salary_certificate",
    label: "Salary Certificate",
    icon: DollarSign,
    description: "Certifies the employee's monthly salary — commonly required for bank loans and visa applications.",
  },
  {
    value: "noc",
    label: "No Objection Certificate",
    icon: ShieldCheck,
    description: "States the company has no objection to the employee's stated purpose (e.g., visa, part-time work).",
  },
  {
    value: "experience_letter",
    label: "Experience Letter",
    icon: Award,
    description: "Issued upon exit — confirms the employee's tenure and role at the company.",
  },
  {
    value: "promotion_letter",
    label: "Promotion Letter",
    icon: Star,
    description: "Formally notifies the employee of their promotion to a new designation.",
  },
];

export default function HrLettersPage() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedLetterType, setSelectedLetterType] = useState<HrLetterType>("employment_confirmation");
  const [recipientName, setRecipientName] = useState("");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hrManagerName, setHrManagerName] = useState("HR Manager");
  const [hrManagerTitle, setHrManagerTitle] = useState("Human Resources Department");
  const [issuedDate, setIssuedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: employees = [], isLoading: loadingEmployees } = trpc.employees.list.useQuery({ companyId: COMPANY_ID });

  const selectedEmployee = employees.find(e => String(e.id) === selectedEmployeeId);

  const { data: allAssignments = [] } = trpc.payroll.assignments.list.useQuery(
    { companyId: COMPANY_ID },
    { enabled: !!selectedEmployeeId }
  );
  const salaryInfo = allAssignments.find(a => a.employeeId === parseInt(selectedEmployeeId));

  const handleGenerate = () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee first.");
      return;
    }

    const joinDate = selectedEmployee.joinDate
      ? format(new Date(selectedEmployee.joinDate), "d MMMM yyyy")
      : "N/A";

    generateHrLetterPdf({
      letterType: selectedLetterType,
      employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
      employeeNumber: selectedEmployee.employeeNumber ?? "N/A",
      designation: selectedEmployee.designationName ?? "N/A",
      department: selectedEmployee.departmentName ?? "N/A",
      joinDate,
      salary: salaryInfo?.basicSalary ? String(salaryInfo.basicSalary) : undefined,
      currency: salaryInfo?.currency ?? "AED",
      companyName: "Rad Technologies",
      companyAddress: "Dubai Internet City, Dubai, UAE",
      recipientName: recipientName || undefined,
      recipientOrg: recipientOrg || undefined,
      purpose: purpose || undefined,
      issuedDate: format(new Date(issuedDate), "d MMMM yyyy"),
      hrManagerName,
      hrManagerTitle,
    });

    toast.success("HR letter generated and downloaded.");
  };

  const selectedLetterMeta = LETTER_TYPES.find(l => l.value === selectedLetterType);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Letters</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate standard HR letters and certificates as PDF. All letters are based on live employee data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Letter type selector ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Letter Type</h2>
          {LETTER_TYPES.map(lt => {
            const Icon = lt.icon;
            const isSelected = selectedLetterType === lt.value;
            return (
              <button
                key={lt.value}
                onClick={() => setSelectedLetterType(lt.value)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-lg p-1.5 ${isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {lt.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{lt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Form ─────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedLetterMeta && <selectedLetterMeta.icon className="h-5 w-5 text-primary" />}
                {selectedLetterMeta?.label}
              </CardTitle>
              <CardDescription>{selectedLetterMeta?.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Employee selection */}
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingEmployees ? "Loading employees..." : "Select employee..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.firstName} {e.lastName} — {e.employeeNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee info preview */}
              {selectedEmployee && (
                <div className="rounded-lg bg-muted/50 p-3.5 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                    <span><Briefcase className="inline h-3.5 w-3.5 mr-1" />{selectedEmployee.designationName ?? "—"}</span>
                    <span><Building2 className="inline h-3.5 w-3.5 mr-1" />{selectedEmployee.departmentName ?? "—"}</span>
                    {salaryInfo?.basicSalary && (
                      <span><DollarSign className="inline h-3.5 w-3.5 mr-1" />{salaryInfo.currency ?? "AED"} {Number(salaryInfo.basicSalary).toLocaleString()} / month</span>
                    )}
                    <span>
                      <Badge variant="outline" className="text-xs">
                        {selectedEmployee.status ?? "active"}
                      </Badge>
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Letter details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={issuedDate}
                    onChange={e => setIssuedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Purpose (optional)</Label>
                  <Input
                    placeholder="e.g., bank loan, visa application"
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Recipient Name (optional)</Label>
                  <Input
                    placeholder="e.g., Emirates NBD"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Recipient Organisation (optional)</Label>
                  <Input
                    placeholder="e.g., UAE Immigration"
                    value={recipientOrg}
                    onChange={e => setRecipientOrg(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Signed By (HR Manager Name)</Label>
                  <Input
                    value={hrManagerName}
                    onChange={e => setHrManagerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    value={hrManagerTitle}
                    onChange={e => setHrManagerTitle(e.target.value)}
                  />
                </div>
              </div>

              {/* Generate button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedEmployeeId}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Generate &amp; Download PDF
                </Button>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center pt-1">
                <FileText className="inline h-3.5 w-3.5 mr-1" />
                Letters are generated entirely in your browser from live employee data. No data is sent to any external service.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
