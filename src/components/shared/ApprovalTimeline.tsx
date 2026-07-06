/**
 * components/shared/ApprovalTimeline.tsx
 *
 * Visual step-by-step approval workflow timeline.
 * Used across Leave, Payroll, Recruitment, and any module that uses the
 * generic Approval Workflow engine.
 *
 * Usage:
 *   <ApprovalTimeline
 *     steps={[
 *       { id: "1", label: "Line Manager", approver: "Ahmed Al-Rashid",
 *         status: "approved", timestamp: new Date(), comment: "Looks good." },
 *       { id: "2", label: "HR Manager", approver: "Sara Khan",
 *         status: "pending" },
 *       { id: "3", label: "Director", status: "waiting" },
 *     ]}
 *     currentStepId="2"
 *   />
 */

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  MessageSquare,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalStepStatus =
  | "approved"
  | "rejected"
  | "pending"   // current step — awaiting action
  | "waiting"   // future step — not yet reached
  | "skipped";  // bypassed by workflow logic

export interface ApprovalStep {
  id: string;
  /** Step label, e.g. "Line Manager Approval" */
  label: string;
  /** Approver display name */
  approver?: string;
  /** Approver designation / role */
  approverRole?: string;
  status: ApprovalStepStatus;
  timestamp?: Date;
  comment?: string;
}

export interface ApprovalTimelineProps {
  steps: ApprovalStep[];
  /** ID of the currently active step */
  currentStepId?: string;
  /** Overall request status badge */
  overallStatus?: "pending" | "approved" | "rejected" | "cancelled";
  className?: string;
  /** compact = smaller padding, used inside cards */
  compact?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<
  ApprovalStepStatus,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  approved: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-100",
    label: "Rejected",
  },
  pending: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-100",
    label: "Pending",
  },
  waiting: {
    icon: Circle,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Waiting",
  },
  skipped: {
    icon: Circle,
    color: "text-muted-foreground/50",
    bg: "bg-muted/50",
    label: "Skipped",
  },
};

const overallBadgeVariant: Record<
  NonNullable<ApprovalTimelineProps["overallStatus"]>,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  cancelled: "outline",
};

function getInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApprovalTimeline({
  steps,
  currentStepId,
  overallStatus,
  className,
  compact = false,
}: ApprovalTimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {/* Overall status */}
      {overallStatus && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Overall status:</span>
          <Badge
            variant={overallBadgeVariant[overallStatus]}
            className="capitalize"
          >
            {overallStatus}
          </Badge>
        </div>
      )}

      {/* Steps */}
      <ol className="relative">
        {steps.map((step, idx) => {
          const cfg = statusConfig[step.status];
          const Icon = cfg.icon;
          const isLast = idx === steps.length - 1;
          const isCurrent = step.id === currentStepId;

          return (
            <li key={step.id} className="relative flex gap-4">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-4 top-8 w-0.5 -bottom-0",
                    step.status === "approved"
                      ? "bg-green-200"
                      : step.status === "rejected"
                      ? "bg-red-200"
                      : "bg-border"
                  )}
                  style={{ height: "calc(100% - 2rem)" }}
                />
              )}

              {/* Icon */}
              <div className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                cfg.bg,
                isCurrent && "ring-2 ring-primary ring-offset-2"
              )}>
                <Icon className={cn("h-4 w-4", cfg.color)} />
              </div>

              {/* Content */}
              <div className={cn(
                "flex-1 min-w-0",
                compact ? "pb-4" : "pb-6"
              )}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className={cn(
                      "font-medium text-foreground",
                      compact ? "text-xs" : "text-sm"
                    )}>
                      {step.label}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-primary font-normal">(current)</span>
                      )}
                    </p>

                    {/* Approver info */}
                    {step.approver && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">
                            {getInitials(step.approver)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {step.approver}
                          {step.approverRole && (
                            <span className="ml-1 text-muted-foreground/60">· {step.approverRole}</span>
                          )}
                        </span>
                      </div>
                    )}

                    {!step.approver && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/50">Unassigned</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={
                        step.status === "approved" ? "default" :
                        step.status === "rejected" ? "destructive" :
                        step.status === "pending" ? "secondary" :
                        "outline"
                      }
                      className="text-[10px] px-1.5 py-0 h-4 capitalize"
                    >
                      {cfg.label}
                    </Badge>
                    {step.timestamp && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(step.timestamp, "MMM d, yyyy HH:mm")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment */}
                {step.comment && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground italic">{step.comment}</p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
