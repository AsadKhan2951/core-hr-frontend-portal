import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Download, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

const COMPANY_ID = 1;

// CSV template columns
const TEMPLATE_HEADERS = ["employee_id", "date", "clock_in", "clock_out", "source", "notes"];
const SAMPLE_ROWS = [
  [101, "2024-01-15", "09:00", "18:00", "biometric", ""],
  [102, "2024-01-15", "08:45", "17:30", "biometric", "Early shift"],
];

type ImportJob = {
  id: number;
  source: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  createdAt: string | Date;
};

type ParsedRow = {
  rowNum: number;
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  source: string;
  notes: string;
  valid: boolean;
  errors: string[];
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  completed_with_errors: { label: "Partial", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_ROWS]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, ws, "Punch Log Template");
  XLSX.writeFile(wb, "punch_log_template.xlsx");
}

function validateRow(row: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  if (!row.employee_id) errors.push("Missing employee_id");
  if (!row.date) errors.push("Missing date");
  else if (isNaN(Date.parse(row.date))) errors.push("Invalid date format");
  if (!row.clock_in) errors.push("Missing clock_in");
  if (row.clock_in && !/^\d{2}:\d{2}/.test(row.clock_in)) errors.push("clock_in must be HH:MM");
  if (row.clock_out && !/^\d{2}:\d{2}/.test(row.clock_out)) errors.push("clock_out must be HH:MM");
  return {
    rowNum,
    employeeId: row.employee_id ?? "",
    date: row.date ?? "",
    clockIn: row.clock_in ?? "",
    clockOut: row.clock_out ?? "",
    source: row.source ?? "csv",
    notes: row.notes ?? "",
    valid: errors.length === 0,
    errors,
  };
}

export default function PunchImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importSource, setImportSource] = useState<"biometric" | "csv" | "excel">("csv");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: importJobs, refetch } = trpc.attendance.punchImport.jobs.useQuery({ companyId: COMPANY_ID });

  const processImport = trpc.attendance.punchImport.upload.useMutation({
    onSuccess: (result: { successCount: number; errorCount: number }) => {
      toast.success(`Import complete: ${result.successCount} records imported, ${result.errorCount} errors`);
      setParsedRows([]);
      refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
    onSettled: () => setIsSubmitting(false),
  });

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false });
        const parsed = rows.map((row, i) => validateRow(row, i + 2));
        setParsedRows(parsed);
        toast.info(`Parsed ${parsed.length} rows — ${parsed.filter(r => r.valid).length} valid, ${parsed.filter(r => !r.valid).length} errors`);
      } catch {
        toast.error("Failed to parse file. Please use the provided template.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleSubmit = () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) { toast.error("No valid rows to import"); return; }
    setIsSubmitting(true);
    processImport.mutate({
      companyId: COMPANY_ID,
      fileName: `punch_import_${new Date().toISOString().slice(0,10)}.xlsx`,
      source: importSource === "biometric" ? "biometric" : "csv_import",
      rows: validRows.map(r => ({
        employeeId: Number(r.employeeId),
        date: r.date,
        clockIn: r.clockIn,
        clockOut: r.clockOut || undefined,
        notes: r.notes || undefined,
      })),
    });
  };

  const downloadErrorReport = () => {
    const errorRows = parsedRows.filter(r => !r.valid);
    if (errorRows.length === 0) return;
    const wb = XLSX.utils.book_new();
    const data = [
      ["Row #", "Employee ID", "Date", "Clock In", "Clock Out", "Errors"],
      ...errorRows.map(r => [r.rowNum, r.employeeId, r.date, r.clockIn, r.clockOut, r.errors.join("; ")]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, "punch_import_errors.xlsx");
  };

  const previewColumns = [
    { key: "rowNum", header: "Row" },
    { key: "employeeId", header: "Employee ID" },
    { key: "date", header: "Date" },
    { key: "clockIn", header: "Clock In" },
    { key: "clockOut", header: "Clock Out" },
    { key: "source", header: "Source" },
    {
      key: "valid",
      header: "Status",
      render: (row: Record<string, unknown>) => row.valid
        ? <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Valid</Badge>
        : <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />{(row.errors as string[]).join(", ")}</Badge>,
    },
  ];

  const historyColumns = [
    { key: "source", header: "Source", sortable: true },
    { key: "totalRows", header: "Total", sortable: true },
    { key: "successRows", header: "Success", sortable: true },
    { key: "errorRows", header: "Errors", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row: Record<string, unknown>) => {
        const s = STATUS_BADGE[String(row.status)] ?? { label: String(row.status), variant: "outline" as const };
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Imported At",
      sortable: true,
      render: (row: Record<string, unknown>) => format(new Date(String(row.createdAt)), "dd MMM yyyy HH:mm"),
    },
  ];

  const validCount = parsedRows.filter(r => r.valid).length;
  const errorCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Punch Log Import</h1>
          <p className="text-sm text-muted-foreground mt-1">Import biometric or CSV punch logs in bulk</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Upload Punch Log File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <Label>Import Source</Label>
              <Select value={importSource} onValueChange={v => setImportSource(v as typeof importSource)}>
                <SelectTrigger className="mt-1 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="biometric">Biometric Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onClick={() => document.getElementById("punch-file-input")?.click()}
          >
            <input id="punch-file-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-sm">Drop your Excel or CSV file here</p>
            <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv — use the template for correct column format</p>
          </div>

          {/* Parse summary */}
          {parsedRows.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-sm">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{validCount} valid rows</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">{errorCount} errors</span>
                </div>
              )}
              <div className="ml-auto flex gap-2">
                {errorCount > 0 && (
                  <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Error Report
                  </Button>
                )}
                <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || validCount === 0}>
                  {isSubmitting ? (
                    <><Clock className="h-3.5 w-3.5 mr-1.5 animate-spin" />Importing...</>
                  ) : (
                    <><Upload className="h-3.5 w-3.5 mr-1.5" />Import {validCount} Records</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview table */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Preview — Review before importing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={previewColumns}
              data={parsedRows as unknown as Record<string, unknown>[]}
              pageSize={10}
              exportFilename="punch-import-preview"
            />
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {!importJobs || (importJobs as unknown[]).length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No imports yet"
              description="Your punch log import history will appear here."
              compact
            />
          ) : (
            <DataTable
              columns={historyColumns}
              data={(importJobs as unknown as Record<string, unknown>[])}
              exportFilename="import-history"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
