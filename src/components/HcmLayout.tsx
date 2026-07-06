import { useState, useCallback, useRef, useEffect } from "react";
import { AIAssistantPanel } from "@/components/AIAssistantPanel";
import { OnboardingTour, useTour } from "@/components/OnboardingTour";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  Layers,
  Briefcase,
  Shield,
  GitBranch,
  Bell,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  CheckCircle,
  Calendar,
  Clock,
  DollarSign,
  Target,
  BookOpen,
  Package,
  Megaphone,
  BarChart3,
  Cpu,
  MessageSquare,
  Upload,
  TrendingUp,
  AlertTriangle,
  Bot,
  CalendarDays,
  PlusCircle,
  ListChecks,
  Wallet,
  CheckSquare,
  Gift,
  SlidersHorizontal,
  ClipboardList,
  UserCheck,
  Search,
  Star,
  Users2,
  Home,
  UserCog,
  Globe,
  ChevronDown,
  HelpCircle,
  Keyboard,
  Receipt,
  Mail,
  GraduationCap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";

// ─── Role definitions ──────────────────────────────────────────────────────────

type HcmRole = "super_admin" | "hr_admin" | "hr_manager" | "department_manager" | "employee" | "viewer";

const ROLE_VISIBLE_MODULES: Record<HcmRole, string[]> = {
  super_admin: ["*"],
  hr_admin: ["*"],
  hr_manager: [
    "/dashboard", "/my", "/my-team", "/employees", "/org", "/leave", "/attendance", "/payroll",
    "/recruitment", "/performance", "/training", "/assets", "/announcements",
    "/documents", "/approvals", "/reports", "/notifications", "/profile", "/expenses",
  ],
  department_manager: [
    "/dashboard", "/my", "/my-team", "/employees", "/org", "/leave", "/attendance",
    "/performance", "/announcements", "/documents", "/approvals",
    "/notifications", "/profile", "/expenses",
  ],
  employee: [
    "/dashboard", "/my", "/leave", "/attendance", "/announcements",
    "/documents", "/notifications", "/profile", "/expenses",
  ],
  viewer: ["/dashboard", "/reports", "/notifications", "/profile"],
};

// ─── Nav structure ─────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string | number;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard",    icon: LayoutDashboard, href: "/dashboard" },
      { label: "My Workspace", icon: Home,            href: "/my" },
      { label: "My Team",      icon: UserCog,         href: "/my-team" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Employees", icon: Users, href: "/employees" },
      {
        label: "Org Structure", icon: Building2, href: "/org",
        children: [
          { label: "Companies",    icon: Building2, href: "/org/companies" },
          { label: "Locations",    icon: MapPin,     href: "/org/locations" },
          { label: "Departments",  icon: Layers,     href: "/org/departments" },
          { label: "Designations", icon: Briefcase,  href: "/org/designations" },
        ],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Leave", icon: Calendar, href: "/leave",
        children: [
          { label: "Apply Leave",     icon: PlusCircle,        href: "/leave/apply" },
          { label: "My Leaves",       icon: ListChecks,        href: "/leave/my-leaves" },
          { label: "Leave Calendar",  icon: CalendarDays,      href: "/leave/calendar" },
          { label: "Balance Tracker", icon: Wallet,            href: "/leave/balance" },
          { label: "Approvals",       icon: CheckSquare,       href: "/leave/approvals" },
          { label: "Compensatory",    icon: Gift,              href: "/leave/compensatory" },
          { label: "Leave Types",     icon: SlidersHorizontal, href: "/leave/types" },
          { label: "Policies",        icon: ClipboardList,     href: "/leave/policies" },
          { label: "Reports",         icon: BarChart3,         href: "/leave/reports" },
        ],
      },
      {
        label: "Attendance", icon: Clock, href: "/attendance",
        children: [
          { label: "Dashboard",       icon: LayoutDashboard, href: "/attendance" },
          { label: "Clock In / Out",  icon: Clock,           href: "/attendance/clock" },
          { label: "Shifts & Rosters",icon: CalendarDays,    href: "/attendance/shifts" },
          { label: "Overtime",        icon: TrendingUp,      href: "/attendance/overtime" },
          { label: "Punch Import",    icon: Upload,          href: "/attendance/import" },
          { label: "Reports",         icon: BarChart3,       href: "/attendance/reports" },
          { label: "AI Anomaly Flags",icon: AlertTriangle,   href: "/attendance/anomalies" },
          { label: "Absenteeism AI",  icon: Bot,             href: "/attendance/predictions" },
        ],
      },
      {
        label: "Payroll", icon: DollarSign, href: "/payroll",
        children: [
          { label: "Dashboard",         icon: LayoutDashboard,   href: "/payroll" },
          { label: "Salary Structures", icon: Layers,            href: "/payroll/structures" },
          { label: "Tax & PF Settings", icon: SlidersHorizontal, href: "/payroll/tax" },
          { label: "Loans & Advances",  icon: Wallet,            href: "/payroll/loans" },
          { label: "Expense Claims",    icon: Receipt,           href: "/expenses" },
          { label: "Run Payroll",       icon: CheckSquare,       href: "/payroll/run" },
          { label: "Payslips",          icon: FileText,          href: "/payroll/payslips" },
          { label: "HR Letters",         icon: Mail,              href: "/payroll/hr-letters" },
          { label: "Reports",           icon: BarChart3,         href: "/payroll/reports" },
        ],
      },
      {
        label: "Recruitment", icon: Target, href: "/recruitment",
        children: [
          { label: "Dashboard",        icon: LayoutDashboard,   href: "/recruitment" },
          { label: "Requisitions",     icon: ClipboardList,     href: "/recruitment/requisitions" },
          { label: "Job Postings",     icon: Briefcase,         href: "/recruitment/jobs" },
          { label: "Candidate Bank",   icon: Search,            href: "/recruitment/candidates" },
          { label: "Pipeline",         icon: Layers,            href: "/recruitment/pipeline" },
          { label: "Interviews",       icon: Calendar,          href: "/recruitment/interviews" },
          { label: "Scorecards",       icon: Star,              href: "/recruitment/scorecards" },
          { label: "Templates",        icon: SlidersHorizontal, href: "/recruitment/templates" },
          { label: "Hired → Employee", icon: UserCheck,         href: "/recruitment/hired" },
          { label: "Reports",          icon: BarChart3,         href: "/recruitment/reports" },
        ],
      },
      {
        label: "Performance", icon: BarChart3, href: "/performance",
        children: [
          { label: "Appraisal Cycles",  icon: CalendarDays,  href: "/performance/cycles" },
          { label: "Templates",         icon: ClipboardList, href: "/performance/templates" },
          { label: "KPIs & Objectives", icon: Target,        href: "/performance/kpis" },
          { label: "Reports",           icon: BarChart3,     href: "/performance/reports" },
        ],
      },
      { label: "Training", icon: BookOpen, href: "/training", badge: "Soon", badgeVariant: "outline" },
      { label: "Assets",   icon: Package,  href: "/assets",   badge: "Soon", badgeVariant: "outline" },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Announcements", icon: Megaphone,    href: "/announcements", badge: "Soon", badgeVariant: "outline" },
      { label: "Documents",     icon: FileText,     href: "/documents",     badge: "Soon", badgeVariant: "outline" },
      { label: "Notifications", icon: MessageSquare, href: "/notifications" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Approvals",        icon: CheckCircle, href: "/approvals" },
      { label: "Workflow Builder", icon: GitBranch,   href: "/workflow" },
      { label: "Audit Log",        icon: FileText,    href: "/audit" },
      { label: "Reports",          icon: BarChart3,   href: "/reports" },
      { label: "Settings",         icon: Settings,    href: "/settings" },
      { label: "AI Service",       icon: Cpu,         href: "/ai-test", badge: "DEV", badgeVariant: "secondary" },
    ],
  },
  {
    title: "Access Management",
    adminOnly: true,
    items: [
      { label: "Users",               icon: Users2,            href: "/settings/users" },
      { label: "Roles & Permissions", icon: Shield,            href: "/settings/roles" },
      { label: "User Overrides",      icon: SlidersHorizontal, href: "/settings/overrides" },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function canSeeModule(href: string, role?: string): boolean {
  if (!role) return false;
  const allowed = ROLE_VISIBLE_MODULES[role as HcmRole];
  if (!allowed) return false;
  if (allowed.includes("*")) return true;
  return allowed.some(r => href === r || href.startsWith(r + "/"));
}

// Quick-search index of all nav items (flat)
const ALL_NAV_ITEMS: { label: string; href: string; section: string }[] = NAV_SECTIONS.flatMap(s =>
  s.items.flatMap(item => [
    { label: item.label, href: item.href, section: s.title },
    ...(item.children ?? []).map(c => ({ label: c.label, href: c.href, section: item.label })),
  ])
);

// ─── Global Search ─────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  onNavigate?: () => void;
}

function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length > 0
    ? ALL_NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder="Search…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-8 pl-8 pr-10 text-sm rounded-full bg-[var(--bg-subtle)] border-transparent focus-visible:border-[var(--brand-teal)] focus-visible:bg-[var(--bg-card)]"
      />
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
        ⌘K
      </kbd>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-scale-in">
          {results.map(item => (
            <button
              key={item.href}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent text-left transition-colors"
              onMouseDown={() => {
                navigate(item.href);
                setQuery("");
                setOpen(false);
                onNavigate?.();
              }}
            >
              <span className="flex-1 font-medium text-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.section}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  notificationCount?: number;
  userRole?: string;
}

function Sidebar({ collapsed, onToggle, notificationCount = 0, userRole }: SidebarProps) {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "/org": true,
  });

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const toggleSection = (href: string) => {
    setExpandedSections(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const isAdminRole = userRole === "super_admin" || userRole === "hr_admin";
  const visibleSections = NAV_SECTIONS
    .filter(section => !section.adminOnly || isAdminRole)
    .map(section => ({
      ...section,
      items: section.items.filter(item => canSeeModule(item.href, userRole)),
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col h-full transition-all duration-200 ease-out shrink-0",
        collapsed ? "w-[60px]" : "w-[240px]",
      )}
      style={{
        background: "linear-gradient(160deg, #0E2038 0%, #0B1E30 35%, #081828 65%, #050F1A 100%)", /* sidebar always dark */
        boxShadow: "1px 0 0 0 rgba(255,255,255,.06)",
      }}
    >
      {/* Logo + collapse toggle — seamlessly integrated, no border gap */}
      <div className={cn(
        "flex items-center shrink-0 relative",
        collapsed ? "h-16 justify-center px-0" : "h-[88px] px-4 gap-2"
      )}
        style={{
          background: "linear-gradient(160deg, rgba(15,180,168,.08) 0%, transparent 100%)",
        }}
      >
        {/* Subtle teal glow behind logo */}
        {!collapsed && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 30% 50%, rgba(15,180,168,.10) 0%, transparent 70%)",
            }}
          />
        )}
        {!collapsed && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0 relative z-10">
            {/* CoreHR logo — white/knockout, 500% size */}
            <img
              src="/manus-storage/corehr-logo_bca4def2.png"
              alt="CoreHR"
              className="h-[70px] w-auto object-contain shrink-0"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
        )}
        {collapsed && (
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center shadow-sm shrink-0"
            style={{ background: "linear-gradient(135deg, #4F9AB3 0%, #0FB4A8 55%, #08B8A8 100%)" }}
          >
            <span className="text-white text-sm font-bold tracking-tight">C</span>
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 relative z-10 text-white/30 hover:text-white/70 hover:bg-white/6"
            onClick={onToggle}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-thin">
        {visibleSections.map(section => (
          <div key={section.title} className={cn(collapsed ? "px-1.5" : "px-2")}>
            {!collapsed && (
              <p className="px-2 mb-1 mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/30 first:mt-0">
                {section.title}
              </p>
            )}
            {collapsed && <div className="my-1.5 border-t border-white/8" />}
            <ul className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const hasChildren = item.children && item.children.length > 0;
                const expanded = expandedSections[item.href];
                const isApprovals = item.href === "/approvals";
                const isNotifications = item.href === "/notifications";
                const liveCount = (isApprovals || isNotifications) ? notificationCount : 0;

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            <span className={cn(
                              "flex items-center justify-center h-9 w-full rounded-[14px] cursor-pointer transition-all duration-150 relative overflow-hidden",
                              active
                                ? "bg-white/10 text-white font-semibold"
                                : "text-white/60 hover:bg-white/6 hover:text-white/90"
                            )}>
                              <Icon className="h-[18px] w-[18px]" />
                              {liveCount > 0 && (
                                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-1 ring-sidebar" />
                              )}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleSection(item.href)}
                            className={cn(
                              "flex items-center gap-2.5 h-9 w-full px-2.5 rounded-[14px] text-sm font-medium transition-all duration-150",
                              active
                                ? "bg-white/10 text-white"
                                : "text-white/60 hover:bg-white/6 hover:text-white/90"
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className="flex-1 text-start truncate">{item.label}</span>
                            <ChevronRight className={cn(
                              "h-3.5 w-3.5 shrink-0 text-white/30 transition-transform duration-150",
                              expanded && "rotate-90"
                            )} />
                          </button>
                        ) : (
                          <Link href={item.href}>
                            <span className={cn(
                              "flex items-center gap-2.5 h-9 w-full px-2.5 rounded-[14px] text-sm font-medium cursor-pointer transition-all duration-150 relative overflow-hidden",
                              active
                                ? "bg-white/10 text-white font-semibold"
                                : "text-white/60 hover:bg-white/6 hover:text-white/90"
                            )}>
                              {active && (
                                <span
                                  className="absolute inset-y-[20%] start-0 w-[3px] rounded-e-full"
                                  style={{ background: "linear-gradient(180deg, #4F9AB3, #0FB4A8)" }}
                                />
                              )}
                              <Icon className="h-[18px] w-[18px] shrink-0" />
                              <span className="flex-1 truncate">{item.label}</span>
                              {liveCount > 0 && (
                                <Badge className="h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                                  {liveCount > 99 ? "99+" : liveCount}
                                </Badge>
                              )}
                              {liveCount === 0 && item.badge && (
                                <Badge
                                  variant={item.badgeVariant ?? "secondary"}
                                  className="h-4 min-w-4 px-1 text-[10px]"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </span>
                          </Link>
                        )}
                        {hasChildren && expanded && (
                          <ul className="ms-4 mt-0.5 space-y-0.5 border-s border-sidebar-border/60 ps-3">
                            {item.children!.map(child => {
                              const ChildIcon = child.icon;
                              const childActive = isActive(child.href);
                              return (
                                <li key={child.href}>
                                  <Link href={child.href}>
                                    <span className={cn(
                                      "flex items-center gap-2 h-8 w-full px-2 rounded-[10px] text-sm cursor-pointer transition-all duration-150",
                                      childActive
                                        ? "bg-white/10 text-white font-medium"
                                        : "text-white/50 hover:bg-white/6 hover:text-white/85"
                                    )}>
                                      <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">{child.label}</span>
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sidebar footer — collapse toggle (expanded mode) + help */}
      {!collapsed && (
        <div className="border-t border-white/8 px-3 py-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 justify-start gap-2 text-xs text-white/40 hover:text-white/80 hover:bg-white/6"
            onClick={onToggle}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Collapse
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <Keyboard className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <p className="font-medium mb-1">Keyboard shortcuts</p>
              <p>⌘K — Global search / AI assistant</p>
              <p>⌘/ — Toggle sidebar</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </aside>
  );
}

// ─── Topbar ────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "العربية", flag: "🇦🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
];

interface TopbarProps {
  onMobileMenuToggle: () => void;
  notificationCount?: number;
  onOpenAssistant?: () => void;
  onSidebarToggle?: () => void;
  onStartTour?: () => void;
}

function Topbar({ onMobileMenuToggle, notificationCount = 0, onOpenAssistant, onSidebarToggle, onStartTour }: TopbarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [lang, setLang] = useState("en");
  const { theme, toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Breadcrumb from path
  const segments = location.split("/").filter(Boolean);
  const breadcrumb = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="topbar">
      {/* Mobile menu */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden shrink-0"
        onClick={onMobileMenuToggle}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Desktop sidebar toggle (collapsed mode) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hidden md:flex shrink-0"
        onClick={onSidebarToggle}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Breadcrumb */}
      <nav className="hidden sm:flex items-center gap-1 text-sm min-w-0 flex-1">
        {breadcrumb.length === 0 ? (
          <span className="text-muted-foreground">Home</span>
        ) : (
          breadcrumb.map((seg, i) => (
            <span key={seg.href} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
              {seg.isLast ? (
                <span className="font-medium text-foreground truncate">{seg.label}</span>
              ) : (
                <Link href={seg.href}>
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer truncate transition-colors">
                    {seg.label}
                  </span>
                </Link>
              )}
            </span>
          ))
        )}
      </nav>

      {/* Global search */}
      <div className="hidden md:flex flex-1 max-w-xs">
        <GlobalSearch />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ms-auto">
        {/* Mobile search */}
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
          <Search className="h-4 w-4" />
        </Button>

        {/* Tutorial button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 hidden sm:flex"
              onClick={onStartTour}
              data-tour="tutorial-btn"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Tutorial</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Replay the onboarding tour</TooltipContent>
        </Tooltip>

        {/* AI Assistant — gradient brand button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="h-8 px-3 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 hover:-translate-y-px hover:brightness-105 hidden sm:flex"
              style={{
                background: "linear-gradient(135deg, #4F9AB3 0%, #0FB4A8 55%, #08B8A8 100%)",
                boxShadow: "0 6px 16px -6px rgba(15,180,168,.45), inset 0 1px 0 rgba(255,255,255,.20)",
              }}
              onClick={onOpenAssistant}
              data-tour="ai-assistant-btn"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>AI Assistant</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>AI Assistant <kbd className="ms-1 text-[10px] font-mono bg-muted px-1 rounded">⌘K</kbd></TooltipContent>
        </Tooltip>
        {/* AI icon-only on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:hidden text-[#0A8F86] hover:bg-[rgba(15,180,168,.10)]"
          onClick={onOpenAssistant}
        >
          <Bot className="h-4 w-4" />
        </Button>

        {/* Theme toggle — sun/moon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
        </Tooltip>

        {/* Language toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGUAGES.map(l => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn("gap-2", lang === l.code && "bg-accent font-medium")}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
                {lang === l.code && <CheckCircle className="h-3.5 w-3.5 ms-auto text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-1 ring-background">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-accent">
              <Avatar className="h-7 w-7 ring-2 ring-[#0FB4A8]/30">
                <AvatarFallback
                  className="text-[10px] text-white font-bold"
                  style={{ background: "linear-gradient(135deg, #4F9AB3, #0FB4A8)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-xs font-semibold text-foreground leading-none max-w-28 truncate">
                  {user?.name ?? "User"}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {(user as { role?: string } | null)?.role === "admin" ? "Super Admin" : "Employee"}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="pb-1">
              <p className="font-semibold text-sm">{user?.name ?? "User"}</p>
              <p className="text-xs text-muted-foreground font-normal">{user?.email ?? ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="h-4 w-4 me-2" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my">
                <Home className="h-4 w-4 me-2" />
                My Workspace
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 me-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications">
                <Bell className="h-4 w-4 me-2" />
                Notifications
                {notificationCount > 0 && (
                  <Badge className="ms-auto h-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                    {notificationCount}
                  </Badge>
                )}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ai-test">
                <HelpCircle className="h-4 w-4 me-2" />
                Help & Support
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 me-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────────

interface HcmLayoutProps {
  children: React.ReactNode;
  notificationCount?: number;
}

export function HcmLayout({ children, notificationCount: externalCount }: HcmLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const openAssistant = useCallback(() => setAssistantOpen(true), []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  const { open: tourOpen, startTour, closeTour } = useTour();
  const { user } = useAuth();

  // Keyboard shortcut: Cmd/Ctrl+/ toggles sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setSidebarCollapsed(c => !c);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const notifQuery = trpc.notifications.unreadCount.useQuery(
    { recipientEmployeeId: 0, companyId: 1 },
    { retry: false, refetchInterval: 30_000 }
  );
  const notificationCount = externalCount ?? (notifQuery.data?.count ?? 0);

  // Use hcmRoleSlug enriched by auth.me (from userRoles table).
  // Falls back to super_admin for Manus admin users, employee for everyone else.
  const userRole = (user as { hcmRoleSlug?: string; role?: string } | null)?.hcmRoleSlug
    ?? ((user as { role?: string } | null)?.role === "admin" ? "super_admin" : "employee");

  return (
    /*
     * INSET CANVAS SHELL
     * ─────────────────────────────────────────────────────────────
     * Outermost div = dark frame (--frame-bg). Fills the viewport.
     * Sidebar lives in the dark gutter — no border, just dark bg.
     * Canvas = the white floating surface with large rounded corners,
     *   a gutter gap on top/right/bottom, and a deep shadow.
     * ─────────────────────────────────────────────────────────────
     */
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--frame-bg)" }}
    >
      {/* ── Desktop Sidebar (lives in the dark frame, no border) ── */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          notificationCount={notificationCount}
          userRole={userRole}
        />
      </div>

      {/* ── Floating Canvas (main content surface) ── */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden relative"
        style={{
          margin: "var(--canvas-gutter) var(--canvas-gutter) var(--canvas-gutter) 0",
          borderRadius: "var(--canvas-radius)",
          background: "var(--canvas-bg)",
          boxShadow: "var(--canvas-shadow)",
          overflow: "hidden",
        }}
      >
        {/* Glow blobs — teal top-left, blue bottom-right */}
        <div className="canvas-glow-tl" />
        <div className="canvas-glow-br" />

        {/* Topbar — rounded top corners match canvas */}
        <Topbar
          onMobileMenuToggle={() => setMobileOpen(o => !o)}
          notificationCount={notificationCount}
          onOpenAssistant={openAssistant}
          onSidebarToggle={() => setSidebarCollapsed(c => !c)}
          onStartTour={startTour}
        />

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto relative z-10"
          style={{ background: "var(--bg-app)" }}
        >
          {children}
        </main>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex animate-slide-up">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              notificationCount={notificationCount}
              userRole={userRole}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Mobile: canvas is full-width, smaller radius */}
      <style>{`
        @media (max-width: 767px) {
          .inset-canvas {
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Global AI Assistant Panel */}
      <AIAssistantPanel open={assistantOpen} onClose={closeAssistant} />
      {/* Onboarding Tour Overlay */}
      <OnboardingTour open={tourOpen} onClose={closeTour} />
    </div>
  );
}

export default HcmLayout;
