import { cn } from "@/lib/utils";

type StatusVariant =
  // Attendance
  | "present" | "absent" | "late" | "leave" | "holiday" | "weekend" | "wfh" | "half-day"
  // Leave / Approval
  | "approved" | "rejected" | "pending" | "cancelled" | "withdrawn"
  // Employee
  | "active" | "inactive" | "probation" | "terminated"
  // Recruitment
  | "open" | "closed" | "draft" | "shortlisted" | "interviewed" | "offered" | "hired"
  // Performance
  | "excellent" | "good" | "average" | "poor" | "not-rated"
  // Payroll
  | "paid" | "unpaid" | "processing"
  // Generic
  | "success" | "warning" | "error" | "info" | "neutral";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  // Attendance
  present:     "status-present",
  absent:      "status-absent",
  late:        "status-late",
  leave:       "status-leave",
  holiday:     "status-holiday",
  weekend:     "status-weekend",
  wfh:         "bg-blue-50 text-blue-700 border-blue-200",
  "half-day":  "bg-purple-50 text-purple-700 border-purple-200",
  // Leave / Approval
  approved:    "status-present",
  rejected:    "status-absent",
  pending:     "status-late",
  cancelled:   "status-weekend",
  withdrawn:   "status-weekend",
  // Employee
  active:      "status-present",
  inactive:    "status-weekend",
  probation:   "status-leave",
  terminated:  "status-absent",
  // Recruitment
  open:        "status-present",
  closed:      "status-weekend",
  draft:       "bg-gray-50 text-gray-600 border-gray-200",
  shortlisted: "status-leave",
  interviewed: "bg-purple-50 text-purple-700 border-purple-200",
  offered:     "bg-teal-50 text-teal-700 border-teal-200",
  hired:       "status-present",
  // Performance
  excellent:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  good:        "status-present",
  average:     "status-late",
  poor:        "status-absent",
  "not-rated": "status-weekend",
  // Payroll
  paid:        "status-present",
  unpaid:      "status-late",
  processing:  "status-leave",
  // Generic
  success:     "status-present",
  warning:     "status-late",
  error:       "status-absent",
  info:        "status-leave",
  neutral:     "status-weekend",
};

const LABEL_MAP: Partial<Record<StatusVariant, string>> = {
  wfh: "WFH",
  "half-day": "Half Day",
  "not-rated": "Not Rated",
};

interface StatusPillProps {
  status: StatusVariant | string;
  label?: string;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusPill({ status, label, dot = false, size = "sm", className }: StatusPillProps) {
  const variant = status as StatusVariant;
  const classes = VARIANT_CLASSES[variant] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const displayLabel = label ?? LABEL_MAP[variant] ?? (status.charAt(0).toUpperCase() + status.slice(1));

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        classes,
        className
      )}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {displayLabel}
    </span>
  );
}
