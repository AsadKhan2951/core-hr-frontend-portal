import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle2,
  XCircle, AlertCircle, Sparkles, FileText, ChevronRight
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── Template columns ─────────────────────────────────────────────────────────
const TEMPLATE_COLUMNS = [
  "First Name*", "Last Name*", "Work Email*", "Employee Number",
  "Employment Type*", "Status*", "Join Date (YYYY-MM-DD)*",
  "Department", "Designation", "Location",
  "Personal Email", "Personal Phone", "Work Phone",
  "Gender", "Date of Birth (YYYY-MM-DD)", "Nationality",
  "National ID", "Marital Status", "Address",
];

const REQUIRED_COLS = new Set(["First Name*", "Last Name*", "Work Email*", "Employment Type*", "Status*", "Join Date (YYYY-MM-DD)*"]);

const VALID_EMP_TYPES = new Set(["full_time", "part_time", "contract", "intern", "probation"]);
const VALID_STATUSES = new Set(["active", "inactive", "on_leave", "probation"]);

type ValidationError = { row: number; column: string; message: string };
type ParsedRow = Record<string, string>;

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_COLUMNS,
    ["John", "Doe", "john.doe@company.com", "EMP-0001", "full_time", "active", "2024-01-15",
     "Engineering", "Software Engineer", "Dubai HQ",
     "john.personal@gmail.com", "+971501234567", "+97142345678",
     "Male", "1990-05-20", "British", "A12345678", "Single", "Dubai Marina, Dubai"],
  ]);
  ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, "employee_bulk_upload_template.xlsx");
  toast.success("Template downloaded");
}

function validateRows(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed, row 1 = header
    const firstName = row["First Name*"]?.trim();
    const lastName = row["Last Name*"]?.trim();
    const email = row["Work Email*"]?.trim();
    const empType = row["Employment Type*"]?.trim().toLowerCase();
    const status = row["Status*"]?.trim().toLowerCase();
    const joinDate = row["Join Date (YYYY-MM-DD)*"]?.trim();

    if (!firstName) errors.push({ row: rowNum, column: "First Name*", message: "Required" });
    if (!lastName) errors.push({ row: rowNum, column: "Last Name*", message: "Required" });
    if (!email) errors.push({ row: rowNum, column: "Work Email*", message: "Required" });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ row: rowNum, column: "Work Email*", message: "Invalid email format" });
    if (!empType) errors.push({ row: rowNum, column: "Employment Type*", message: "Required" });
    else if (!VALID_EMP_TYPES.has(empType)) errors.push({ row: rowNum, column: "Employment Type*", message: `Must be one of: ${Array.from(VALID_EMP_TYPES).join(", ")}` });
    if (!status) errors.push({ row: rowNum, column: "Status*", message: "Required" });
    else if (!VALID_STATUSES.has(status)) errors.push({ row: rowNum, column: "Status*", message: `Must be one of: ${Array.from(VALID_STATUSES).join(", ")}` });
    if (!joinDate) errors.push({ row: rowNum, column: "Join Date*", message: "Required" });
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) errors.push({ row: rowNum, column: "Join Date*", message: "Must be YYYY-MM-DD" });
  });
  return errors;
}

function exportErrorReport(errors: ValidationError[], filename: string) {
  const rows = errors.map(e => ({ Row: e.row, Column: e.column, Error: e.message }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 50 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, `${filename}_errors.xlsx`);
  toast.success("Error report downloaded");
}

// ─── Resume AI Parser ─────────────────────────────────────────────────────────
function ResumeParserPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parseResume = trpc.employees.ai.parseDocument.useMutation();

  const handleFile = (f: File) => {
    setFile(f);
    setParsed(null);
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const result = await parseResume.mutateAsync({
          documentText: `[Document: ${file.name}]\nFile type: ${file.type}\nBase64 content available for AI parsing.`,
          documentType: file.name.toLowerCase().includes("passport") ? "passport" : 
                        file.name.toLowerCase().includes("id") ? "national_id" : "resume",
        });
        setParsed(result.extractedFields as unknown as Record<string, string>);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to parse document");
      setLoading(false);
    }
  };

  return (
    <Card className="border-indigo-100 bg-indigo-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            AI Resume / ID Parser
          </CardTitle>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />AI Suggestion — Review before saving
          </span>
        </div>
        <CardDescription className="text-xs">
          Upload a resume, CV, or ID document. The AI will extract fields to pre-fill a new employee profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="border-2 border-dashed border-indigo-200 rounded-lg p-4 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileText className="w-6 h-6 text-indigo-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            {file ? file.name : "Click to upload PDF, DOCX, or image"}
          </p>
        </div>
        <input ref={fileRef} type="file" className="hidden"
          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button size="sm" disabled={!file || loading} onClick={handleParse} className="w-full">
          {loading ? "Parsing…" : <><Sparkles className="w-4 h-4 mr-1.5" />Parse Document</>}
        </Button>
        {parsed && (
          <div className="bg-white rounded-lg border border-indigo-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />Extracted Fields (AI Suggestion)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(parsed).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}: </span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs mt-2"
              onClick={() => toast.info("Profile pre-fill will be available in the Add Employee form")}>
              <ChevronRight className="w-3 h-3 mr-1" />Use to Pre-fill New Employee Form
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Lazy import to avoid top-level import error
const Brain = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

// ─── Main BulkUploadPage ──────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const bulkCreate = trpc.employees.bulkUpload.process.useMutation();

  const handleFileSelect = (f: File) => {
    setFile(f);
    setParsedRows(null);
    setErrors([]);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
      if (!json.length) { toast.error("Empty file"); return; }
      const headers = (json[0] ?? []) as string[];
      const rows = json.slice(1).map(row => {
        const r: ParsedRow = {};
        headers.forEach((h, i) => { r[h] = String((row as unknown as string[])[i] ?? ""); });
        return r;
      }).filter(row => Object.values(row).some(v => v?.trim()));
      setParsedRows(rows);
      const validationErrors = validateRows(rows);
      setErrors(validationErrors);
      if (validationErrors.length === 0) toast.success(`${rows.length} rows parsed, no errors found`);
      else toast.warning(`${rows.length} rows parsed, ${validationErrors.length} validation errors`);
    };
    reader.readAsArrayBuffer(f);
  };

  const handleUpload = async () => {
    if (!parsedRows?.length || errors.length > 0) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const employees = parsedRows.map(row => ({
        firstName: row["First Name*"]?.trim() ?? "",
        lastName: row["Last Name*"]?.trim() ?? "",
        workEmail: row["Work Email*"]?.trim(),
        employeeNumber: row["Employee Number"]?.trim() || undefined,
        employmentType: row["Employment Type*"]?.trim().toLowerCase() as "full_time" | "part_time" | "contract" | "intern" | "probation",
        status: row["Status*"]?.trim().toLowerCase() as "active" | "inactive" | "on_leave" | "probation",
        joinDate: row["Join Date (YYYY-MM-DD)*"]?.trim() ? new Date(row["Join Date (YYYY-MM-DD)*"]) : new Date(),
        personalPhone: row["Personal Phone"]?.trim() || undefined,
        gender: row["Gender"]?.trim().toLowerCase() || undefined,
        nationality: row["Nationality"]?.trim() || undefined,
      }));

      // Simulate progress
      const interval = setInterval(() => setUploadProgress(p => Math.min(p + 10, 90)), 200);
      const result = await bulkCreate.mutateAsync({
        companyId: 1,
        fileName: file?.name ?? "upload.xlsx",
        rows: employees.map(e => ({
          firstName: e.firstName,
          lastName: e.lastName,
          workEmail: e.workEmail,
          employeeNumber: e.employeeNumber,
          employmentType: e.employmentType,
          status: e.status,
          joinDate: e.joinDate.toISOString().split("T")[0],
          gender: e.gender,
          personalPhone: e.personalPhone,
          nationality: e.nationality,
        })),
      });
      clearInterval(interval);
      setUploadProgress(100);
      setUploadResult({ success: result.success ?? 0, failed: result.errors ?? 0 });
      toast.success(`${result.success ?? 0} employees created successfully`);
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/employees")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" />Back to Employees
          </button>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Upload Employees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Import multiple employees from an Excel file</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload flow */}
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Download template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
                Download Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Download the Excel template with all required columns and a sample row.
                Required columns are marked with *.
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1.5" />Download Template
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upload file */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
                Upload Filled File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
              >
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">{file ? file.name : "Drop your Excel file here or click to browse"}</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files only</p>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
            </CardContent>
          </Card>

          {/* Step 3: Validation results */}
          {parsedRows !== null && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">3</span>
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{parsedRows.length - new Set(errors.map(e => e.row)).size} valid rows</span>
                  </div>
                  {errors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span>{errors.length} errors in {new Set(errors.map(e => e.row)).size} rows</span>
                    </div>
                  )}
                </div>

                {errors.length > 0 && (
                  <>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border bg-red-50 p-3">
                      {errors.slice(0, 20).map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                          <span><span className="font-medium">Row {err.row}, {err.column}:</span> {err.message}</span>
                        </div>
                      ))}
                      {errors.length > 20 && <p className="text-xs text-muted-foreground">…and {errors.length - 20} more errors</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => exportErrorReport(errors, file?.name ?? "upload")}>
                      <Download className="w-4 h-4 mr-1.5" />Download Error Report
                    </Button>
                  </>
                )}

                {errors.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    All {parsedRows.length} rows are valid. Ready to upload.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Upload */}
          {parsedRows !== null && errors.length === 0 && !uploadResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">4</span>
                  Import Employees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Importing…</span><span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  <Upload className="w-4 h-4 mr-1.5" />
                  {uploading ? "Importing…" : `Import ${parsedRows.length} Employees`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Result */}
          {uploadResult && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="pt-6 flex items-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-800">Import Complete</p>
                  <p className="text-sm text-emerald-700">
                    {uploadResult.success} employees created successfully.
                    {uploadResult.failed > 0 && ` ${uploadResult.failed} failed.`}
                  </p>
                </div>
                <Button size="sm" className="ml-auto" onClick={() => navigate("/employees")}>
                  View Employees
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: AI Resume Parser */}
        <div>
          <ResumeParserPanel />
        </div>
      </div>
    </div>
  );
}
