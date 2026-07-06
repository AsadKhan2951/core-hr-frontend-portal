/**
 * client/src/lib/pdfGenerator.ts
 *
 * Client-side PDF generation utilities for CORE HR.
 * Uses jsPDF to generate payslips and HR letters in the browser.
 * No server-side dependencies required.
 */
import jsPDF from "jspdf";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Color palette ────────────────────────────────────────────────────────────
const BLUE   = [19, 113, 185] as const;  // #1371B9
const DARK   = [30, 41, 59]   as const;  // slate-800
const GRAY   = [100, 116, 139] as const; // slate-500
const LIGHT  = [241, 245, 249] as const; // slate-100
const WHITE  = [255, 255, 255] as const;
const GREEN  = [22, 163, 74]   as const; // green-600

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setColor(doc: jsPDF, rgb: readonly [number, number, number], fill = false) {
  if (fill) doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  else doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function currency(amount: string | number, curr = "AED") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${curr} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Payslip PDF ──────────────────────────────────────────────────────────────

export interface PayslipData {
  id: number;
  employeeName: string;
  employeeNumber: string | null;
  workEmail: string | null;
  month: number;
  year: number;
  basicSalary: string;
  grossSalary: string;
  totalEarnings: string;
  totalDeductions: string;
  taxAmount: string;
  pfEmployee: string;
  pfEmployer: string;
  loanDeductions: string;
  advanceDeductions: string;
  lateDeductions: string;
  absentDeductions: string;
  netSalary: string;
  currency: string;
  attendanceDays: number | null;
  absentDays: number | null;
  components?: unknown;
  companyName?: string;
}

export function generatePayslipPdf(payslip: PayslipData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const MARGIN = 14;
  const CONTENT_W = W - MARGIN * 2;

  // ── Header bar ──────────────────────────────────────────────────────────────
  setColor(doc, BLUE, true);
  doc.rect(0, 0, W, 28, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(payslip.companyName ?? "CORE HR", MARGIN, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("PAYSLIP", MARGIN, 20);
  doc.setFontSize(9);
  doc.text(
    `${MONTHS[payslip.month - 1]} ${payslip.year}`,
    W - MARGIN,
    12,
    { align: "right" }
  );
  doc.text(`Payslip #${payslip.id}`, W - MARGIN, 20, { align: "right" });

  // ── Employee info card ───────────────────────────────────────────────────────
  let y = 36;
  setColor(doc, LIGHT, true);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text(payslip.employeeName, MARGIN + 4, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, GRAY);
  doc.text(`Employee ID: ${payslip.employeeNumber ?? "N/A"}`, MARGIN + 4, y + 15);
  doc.text(payslip.workEmail ?? "", MARGIN + 4, y + 20);

  // Attendance summary (right side)
  if (payslip.attendanceDays !== null) {
    doc.setFontSize(8.5);
    doc.text(`Days Worked: ${payslip.attendanceDays ?? "-"}`, W - MARGIN - 4, y + 8, { align: "right" });
    doc.text(`Absent Days: ${payslip.absentDays ?? 0}`, W - MARGIN - 4, y + 15, { align: "right" });
  }

  // ── Earnings section ─────────────────────────────────────────────────────────
  y += 30;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, BLUE);
  doc.text("EARNINGS", MARGIN, y);
  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 1.5, MARGIN + 35, y + 1.5);

  y += 6;
  const earningsRows: [string, string][] = [
    ["Basic Salary", currency(payslip.basicSalary, payslip.currency)],
  ];

  // Parse components for allowances
  if (payslip.components) {
    try {
      const comps = typeof payslip.components === "string"
        ? JSON.parse(payslip.components)
        : payslip.components;
      if (Array.isArray(comps)) {
        for (const c of comps) {
          if (c.type === "allowance" || c.type === "earning") {
            earningsRows.push([c.name, currency(c.amount, payslip.currency)]);
          }
        }
      }
    } catch { /* ignore */ }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (const [label, value] of earningsRows) {
    setColor(doc, DARK);
    doc.text(label, MARGIN + 2, y);
    setColor(doc, DARK);
    doc.text(value, W - MARGIN - 2, y, { align: "right" });
    y += 6;
  }

  // Total earnings row
  setColor(doc, LIGHT, true);
  doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColor(doc, DARK);
  doc.text("Total Earnings", MARGIN + 2, y + 4);
  doc.text(currency(payslip.totalEarnings, payslip.currency), W - MARGIN - 2, y + 4, { align: "right" });
  y += 12;

  // ── Deductions section ───────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, [220, 38, 38]);  // red-600
  doc.text("DEDUCTIONS", MARGIN, y);
  doc.setDrawColor(220, 38, 38);
  doc.line(MARGIN, y + 1.5, MARGIN + 38, y + 1.5);

  y += 6;
  const deductionRows: [string, string][] = [];
  if (parseFloat(payslip.taxAmount) > 0)
    deductionRows.push(["Income Tax", currency(payslip.taxAmount, payslip.currency)]);
  if (parseFloat(payslip.pfEmployee) > 0)
    deductionRows.push(["Provident Fund (Employee)", currency(payslip.pfEmployee, payslip.currency)]);
  if (parseFloat(payslip.loanDeductions) > 0)
    deductionRows.push(["Loan Deduction", currency(payslip.loanDeductions, payslip.currency)]);
  if (parseFloat(payslip.advanceDeductions) > 0)
    deductionRows.push(["Advance Recovery", currency(payslip.advanceDeductions, payslip.currency)]);
  if (parseFloat(payslip.lateDeductions) > 0)
    deductionRows.push(["Late Deduction", currency(payslip.lateDeductions, payslip.currency)]);
  if (parseFloat(payslip.absentDeductions) > 0)
    deductionRows.push(["Absent Deduction", currency(payslip.absentDeductions, payslip.currency)]);
  if (deductionRows.length === 0)
    deductionRows.push(["No deductions", "—"]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (const [label, value] of deductionRows) {
    setColor(doc, DARK);
    doc.text(label, MARGIN + 2, y);
    doc.text(value, W - MARGIN - 2, y, { align: "right" });
    y += 6;
  }

  // Total deductions row
  setColor(doc, LIGHT, true);
  doc.rect(MARGIN, y - 1, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColor(doc, DARK);
  doc.text("Total Deductions", MARGIN + 2, y + 4);
  doc.text(currency(payslip.totalDeductions, payslip.currency), W - MARGIN - 2, y + 4, { align: "right" });
  y += 14;

  // ── Net pay box ──────────────────────────────────────────────────────────────
  setColor(doc, BLUE, true);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("NET PAY", MARGIN + 4, y + 9);
  doc.text(currency(payslip.netSalary, payslip.currency), W - MARGIN - 4, y + 9, { align: "right" });

  // ── Footer ───────────────────────────────────────────────────────────────────
  y = 275;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  setColor(doc, GRAY);
  doc.text(
    "This is a computer-generated payslip and does not require a signature.",
    W / 2,
    y,
    { align: "center" }
  );
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-GB")} by CORE HR`,
    W / 2,
    y + 5,
    { align: "center" }
  );

  // ── Save ─────────────────────────────────────────────────────────────────────
  doc.save(`payslip-${payslip.employeeNumber ?? payslip.id}-${MONTHS[payslip.month - 1]}-${payslip.year}.pdf`);
}

// ─── HR Letter PDF ────────────────────────────────────────────────────────────

export type HrLetterType =
  | "employment_confirmation"
  | "salary_certificate"
  | "noc"
  | "experience_letter"
  | "promotion_letter";

export interface HrLetterData {
  letterType: HrLetterType;
  employeeName: string;
  employeeNumber: string;
  designation: string;
  department: string;
  joinDate: string;
  salary?: string;
  currency?: string;
  companyName: string;
  companyAddress?: string;
  recipientName?: string;
  recipientOrg?: string;
  purpose?: string;
  issuedDate?: string;
  hrManagerName?: string;
  hrManagerTitle?: string;
}

const LETTER_TITLES: Record<HrLetterType, string> = {
  employment_confirmation: "Employment Confirmation Letter",
  salary_certificate:      "Salary Certificate",
  noc:                     "No Objection Certificate",
  experience_letter:       "Experience Letter",
  promotion_letter:        "Promotion Letter",
};

function buildLetterBody(data: HrLetterData): string[] {
  const date = data.issuedDate ?? new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const to = data.recipientName
    ? `To Whom It May Concern / ${data.recipientName}${data.recipientOrg ? `, ${data.recipientOrg}` : ""}`
    : "To Whom It May Concern";

  switch (data.letterType) {
    case "employment_confirmation":
      return [
        `Date: ${date}`,
        "",
        to,
        "",
        `Subject: Employment Confirmation — ${data.employeeName}`,
        "",
        `This is to confirm that ${data.employeeName} (Employee ID: ${data.employeeNumber}) is currently employed with ${data.companyName} as ${data.designation} in the ${data.department} department.`,
        "",
        `${data.employeeName} has been with us since ${data.joinDate} and continues to be a valued member of our team.`,
        "",
        `This letter is issued upon the employee's request${data.purpose ? ` for ${data.purpose}` : ""} and is valid for 30 days from the date of issue.`,
        "",
        "Should you require any further information, please do not hesitate to contact us.",
        "",
        "Yours sincerely,",
      ];

    case "salary_certificate":
      return [
        `Date: ${date}`,
        "",
        to,
        "",
        `Subject: Salary Certificate — ${data.employeeName}`,
        "",
        `This is to certify that ${data.employeeName} (Employee ID: ${data.employeeNumber}) is employed with ${data.companyName} as ${data.designation} in the ${data.department} department since ${data.joinDate}.`,
        "",
        `The employee's current monthly salary is ${data.salary ? currency(data.salary, data.currency ?? "AED") : "as per contract"}.`,
        "",
        `This certificate is issued${data.purpose ? ` for ${data.purpose}` : " upon the employee's request"} and is valid for 30 days from the date of issue.`,
        "",
        "Yours sincerely,",
      ];

    case "noc":
      return [
        `Date: ${date}`,
        "",
        to,
        "",
        `Subject: No Objection Certificate — ${data.employeeName}`,
        "",
        `This is to certify that ${data.employeeName} (Employee ID: ${data.employeeNumber}), ${data.designation} in the ${data.department} department, has been employed with ${data.companyName} since ${data.joinDate}.`,
        "",
        `${data.companyName} has no objection to ${data.employeeName}${data.purpose ? ` ${data.purpose}` : " applying for the requested purpose"}.`,
        "",
        "This certificate is issued in good faith and does not constitute any guarantee or liability on the part of the company.",
        "",
        "Yours sincerely,",
      ];

    case "experience_letter":
      return [
        `Date: ${date}`,
        "",
        to,
        "",
        `Subject: Experience Letter — ${data.employeeName}`,
        "",
        `This is to certify that ${data.employeeName} (Employee ID: ${data.employeeNumber}) was employed with ${data.companyName} as ${data.designation} in the ${data.department} department from ${data.joinDate}.`,
        "",
        `During their tenure, ${data.employeeName} demonstrated professionalism, dedication, and strong performance. We wish them the very best in their future endeavours.`,
        "",
        "Yours sincerely,",
      ];

    case "promotion_letter":
      return [
        `Date: ${date}`,
        "",
        `Dear ${data.employeeName},`,
        "",
        `Subject: Promotion Confirmation`,
        "",
        `We are pleased to inform you that, in recognition of your outstanding performance and contributions to ${data.companyName}, you have been promoted to the position of ${data.designation} in the ${data.department} department, effective from ${data.issuedDate ?? date}.`,
        "",
        `Your new compensation package will be communicated to you separately. We look forward to your continued contributions and wish you success in your new role.`,
        "",
        "Congratulations!",
        "",
        "Yours sincerely,",
      ];
  }
}

export function generateHrLetterPdf(data: HrLetterData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const MARGIN = 20;
  const CONTENT_W = W - MARGIN * 2;

  // ── Letterhead ───────────────────────────────────────────────────────────────
  setColor(doc, BLUE, true);
  doc.rect(0, 0, W, 24, "F");
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(data.companyName, MARGIN, 10);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  if (data.companyAddress) doc.text(data.companyAddress, MARGIN, 17);

  // ── Title ────────────────────────────────────────────────────────────────────
  let y = 34;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text(LETTER_TITLES[data.letterType], W / 2, y, { align: "center" });

  // Underline
  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineWidth(0.5);
  const titleW = doc.getTextWidth(LETTER_TITLES[data.letterType]);
  doc.line((W - titleW) / 2, y + 1.5, (W + titleW) / 2, y + 1.5);

  y += 12;

  // ── Body ─────────────────────────────────────────────────────────────────────
  const lines = buildLetterBody(data);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);

  for (const line of lines) {
    if (line === "") {
      y += 4;
      continue;
    }
    if (line.startsWith("Subject:")) {
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(line, CONTENT_W);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * 6;
      doc.setFont("helvetica", "normal");
    } else if (line === "Yours sincerely," || line === "Congratulations!") {
      y += 2;
      doc.text(line, MARGIN, y);
      y += 16;
      // Signature block
      doc.setDrawColor(DARK[0], DARK[1], DARK[2]);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, MARGIN + 50, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.text(data.hrManagerName ?? "HR Manager", MARGIN, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      setColor(doc, GRAY);
      doc.text(data.hrManagerTitle ?? "Human Resources", MARGIN, y);
      doc.text(data.companyName, MARGIN, y + 5);
    } else {
      const wrapped = doc.splitTextToSize(line, CONTENT_W);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * 6;
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = 280;
  setColor(doc, LIGHT, true);
  doc.rect(0, footerY, W, 17, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  setColor(doc, GRAY);
  doc.text(
    "This letter is computer-generated and is valid without a physical signature unless otherwise stated.",
    W / 2,
    footerY + 6,
    { align: "center" }
  );
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-GB")} by CORE HR`,
    W / 2,
    footerY + 12,
    { align: "center" }
  );

  // ── Save ─────────────────────────────────────────────────────────────────────
  const slug = data.letterType.replace(/_/g, "-");
  doc.save(`${slug}-${data.employeeNumber}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
