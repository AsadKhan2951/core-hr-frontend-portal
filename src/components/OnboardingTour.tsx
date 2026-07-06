/**
 * CORE HR — Onboarding Tour
 *
 * A 12-step interactive overlay that introduces each major feature area.
 * - First-login detection via localStorage key "corehr_tour_completed"
 * - Spotlight highlight on target elements using data-tour attributes
 * - Skip / Back / Next / Finish controls
 * - Accessible: focus-trapped, keyboard navigable (Escape = skip)
 * - Exported useTour() hook for the Tutorial header button
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  X,
  Users,
  Clock,
  Calendar,
  DollarSign,
  Briefcase,
  BarChart2,
  LayoutDashboard,
  Bell,
  Settings,
  Bot,
  FileText,
  Receipt,
} from "lucide-react";

// ─── Tour Steps ────────────────────────────────────────────────────────────────

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** CSS selector or data-tour attribute to spotlight. null = center modal */
  target: string | null;
  /** Where to position the tooltip relative to the target */
  placement: "top" | "bottom" | "left" | "right" | "center";
  /** Optional route to navigate to before showing this step */
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to CORE HR 👋",
    description:
      "This quick tour walks you through the key features of CORE HR. You can skip at any time and replay it later using the Tutorial button in the top header.",
    icon: <LayoutDashboard className="h-6 w-6 text-primary" />,
    target: null,
    placement: "center",
  },
  {
    id: "dashboard",
    title: "Global Dashboard",
    description:
      "Your command centre. See live headcount, pending approvals, attendance stats, and department breakdowns — all in one place. Charts update in real time from your HR data.",
    icon: <LayoutDashboard className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-dashboard']",
    placement: "right",
  },
  {
    id: "employees",
    title: "Employee Management",
    description:
      "Add, edit, and manage your entire workforce. Each employee has a full profile: personal info, documents, assets, employment timeline, and AI-powered attrition risk insights.",
    icon: <Users className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-employees']",
    placement: "right",
  },
  {
    id: "attendance",
    title: "Time & Attendance",
    description:
      "Track clock-ins/outs, manage shifts and rosters, handle overtime requests, and import biometric punch logs. Color-coded status: green = present, amber = late, red = absent.",
    icon: <Clock className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-attendance']",
    placement: "right",
  },
  {
    id: "leave",
    title: "Leave Management",
    description:
      "Employees apply for leave, managers approve or reject. Configure leave types and policies, view the team calendar, track balances, and run leave reports.",
    icon: <Calendar className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-leave']",
    placement: "right",
  },
  {
    id: "payroll",
    title: "Payroll",
    description:
      "Build salary structures, run monthly payroll, generate payslips as downloadable PDFs, and produce HR letters (employment confirmation, salary certificate, NOC) in one click.",
    icon: <DollarSign className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-payroll']",
    placement: "right",
  },
  {
    id: "expenses",
    title: "Expense Claims",
    description:
      "Employees submit expense claims with receipts. Managers approve or reject. Finance marks them as paid. Full audit trail with Excel export.",
    icon: <Receipt className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-expenses']",
    placement: "right",
  },
  {
    id: "recruitment",
    title: "Recruitment",
    description:
      "Post jobs, manage candidates through a Kanban pipeline, schedule interviews, score candidates, and convert hired candidates to employees with one click.",
    icon: <Briefcase className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-recruitment']",
    placement: "right",
  },
  {
    id: "performance",
    title: "Performance & Appraisals",
    description:
      "Set KPIs, run appraisal cycles, collect self-reviews and manager reviews. The AI assistant drafts review text for human editing — no automated decisions are made.",
    icon: <BarChart2 className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-performance']",
    placement: "right",
  },
  {
    id: "ai",
    title: "AI Assistant",
    description:
      "Ask HR questions in plain English: \"Who is on leave this week?\", \"Show me the top 5 employees by tenure\". Every AI action requires your confirmation before executing.",
    icon: <Bot className="h-6 w-6 text-primary" />,
    target: "[data-tour='ai-assistant-btn']",
    placement: "bottom",
  },
  {
    id: "approvals",
    title: "Approvals & Workflows",
    description:
      "All leave, expense, transfer, and exit requests flow through configurable approval workflows. Track pending items, approve or reject with comments, and view the full audit trail.",
    icon: <FileText className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-approvals']",
    placement: "right",
  },
  {
    id: "notifications",
    title: "Notifications",
    description:
      "The bell icon shows real-time in-app notifications for approvals, deadlines, and system events. Click any notification to jump directly to the relevant record.",
    icon: <Bell className="h-6 w-6 text-primary" />,
    target: "[data-tour='notifications-btn']",
    placement: "bottom",
  },
  {
    id: "settings",
    title: "Settings & Users",
    description:
      "Manage company settings, user accounts, CORE HR roles, and permissions. Assign roles to users to control exactly what each person can see and do.",
    icon: <Settings className="h-6 w-6 text-primary" />,
    target: "[data-tour='nav-settings']",
    placement: "right",
  },
];

// ─── localStorage helpers ──────────────────────────────────────────────────────

const TOUR_KEY = "corehr_tour_completed";

export function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === "true";
  } catch {
    return false;
  }
}

export function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_KEY, "true");
  } catch {
    // ignore
  }
}

export function resetTour(): void {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch {
    // ignore
  }
}

// ─── Spotlight overlay ─────────────────────────────────────────────────────────

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

// ─── Tooltip positioning ───────────────────────────────────────────────────────

function getTooltipStyle(
  rect: SpotlightRect | null,
  placement: TourStep["placement"]
): React.CSSProperties {
  if (!rect || placement === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10001,
    };
  }

  const PAD = 16;
  const TOOLTIP_W = 360;

  switch (placement) {
    case "right":
      return {
        position: "fixed",
        top: Math.min(rect.top - window.scrollY + rect.height / 2 - 100, window.innerHeight - 260),
        left: rect.left + rect.width + PAD,
        zIndex: 10001,
        width: TOOLTIP_W,
      };
    case "left":
      return {
        position: "fixed",
        top: Math.min(rect.top - window.scrollY + rect.height / 2 - 100, window.innerHeight - 260),
        left: rect.left - TOOLTIP_W - PAD,
        zIndex: 10001,
        width: TOOLTIP_W,
      };
    case "bottom":
      return {
        position: "fixed",
        top: rect.top - window.scrollY + rect.height + PAD,
        left: Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - PAD),
        zIndex: 10001,
        width: TOOLTIP_W,
      };
    case "top":
      return {
        position: "fixed",
        top: rect.top - window.scrollY - 220 - PAD,
        left: Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - PAD),
        zIndex: 10001,
        width: TOOLTIP_W,
      };
    default:
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10001,
      };
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingTour({ open, onClose }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[step];

  // Measure target element on step change
  useEffect(() => {
    if (!open) return;
    if (!currentStep.target) {
      setTargetRect(null);
      return;
    }
    // Small delay to let any navigation settle
    const timer = setTimeout(() => {
      const rect = getTargetRect(currentStep.target!);
      setTargetRect(rect);
      // Scroll target into view
      if (rect) {
        const el = document.querySelector(currentStep.target!);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [open, step, currentStep.target]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleClose = useCallback(() => {
    markTourCompleted();
    setStep(0);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const tooltipStyle = getTooltipStyle(targetRect, currentStep.placement);
  const PAD = 8;
  const RADIUS = 12;

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div
        className="fixed inset-0 z-[10000] pointer-events-auto"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={handleClose}
        aria-hidden="true"
      >
        {targetRect && (
          <div
            style={{
              position: "absolute",
              top: targetRect.top - window.scrollY - PAD,
              left: targetRect.left - PAD,
              width: targetRect.width + PAD * 2,
              height: targetRect.height + PAD * 2,
              borderRadius: RADIUS,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              backgroundColor: "transparent",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${currentStep.title}`}
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-[360px]">
          {/* Header */}
          <div className="bg-primary/5 border-b border-border px-5 py-4 flex items-start gap-3">
            <div className="mt-0.5 shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {currentStep.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-0.5">
                Step {step + 1} of {TOUR_STEPS.length}
              </p>
              <h3 className="text-sm font-bold text-foreground leading-snug">
                {currentStep.title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Skip tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="px-5 pb-2 flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-border"
                )}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground text-xs h-8"
            >
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 gap-1.5 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90"
              >
                {step === TOUR_STEPS.length - 1 ? (
                  "Finish 🎉"
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── useTour hook ──────────────────────────────────────────────────────────────

export function useTour() {
  const [open, setOpen] = useState(false);

  // Auto-open on first login
  useEffect(() => {
    if (!isTourCompleted()) {
      // Small delay so the layout renders first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = useCallback(() => {
    resetTour();
    setOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, startTour, closeTour };
}
