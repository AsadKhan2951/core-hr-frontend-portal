import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { HcmLayout } from "./components/HcmLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import EmployeesPage from "./pages/EmployeesPage";
import OrgPage from "./pages/OrgPage";
import RolesPage from "./pages/RolesPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import AuditPage from "./pages/AuditPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import AiTestPage from "./pages/AiTestPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import BulkUploadPage from "./pages/BulkUploadPage";
import TransferExitPage from "./pages/TransferExitPage";
import EmployeeMatrixPage from "./pages/EmployeeMatrixPage";
import WorkforceQueryPage from "./pages/WorkforceQueryPage";
import EmployeeReportsPage from "./pages/EmployeeReportsPage";
import AttendanceDashboard from "./pages/attendance/AttendanceDashboard";
import ClockPage from "./pages/attendance/ClockPage";
import ShiftRosterPage from "./pages/attendance/ShiftRosterPage";
import OvertimePage from "./pages/attendance/OvertimePage";
import PunchImportPage from "./pages/attendance/PunchImportPage";
import AttendanceReportsPage from "./pages/attendance/AttendanceReportsPage";
import AnomalyFlagsPage from "./pages/attendance/AnomalyFlagsPage";
import AbsenteeismPredictionPage from "./pages/attendance/AbsenteeismPredictionPage";
import LeaveTypesPage from "./pages/leave/LeaveTypesPage";
import LeavePoliciesPage from "./pages/leave/LeavePoliciesPage";
import ApplyLeavePage from "./pages/leave/ApplyLeavePage";
import MyLeavesPage from "./pages/leave/MyLeavesPage";
import LeaveCalendarPage from "./pages/leave/LeaveCalendarPage";
import LeaveBalancePage from "./pages/leave/LeaveBalancePage";
import LeaveApprovalPage from "./pages/leave/LeaveApprovalPage";
import CompensatoryLeavePage from "./pages/leave/CompensatoryLeavePage";
import LeaveReportsPage from "./pages/leave/LeaveReportsPage";
import PayrollDashboardPage from "./pages/payroll/PayrollDashboardPage";
import SalaryStructuresPage from "./pages/payroll/SalaryStructuresPage";
import TaxSlabsPage from "./pages/payroll/TaxSlabsPage";
import LoansAdvancesPage from "./pages/payroll/LoansAdvancesPage";
import PayrollRunPage from "./pages/payroll/PayrollRunPage";
import PayslipViewerPage from "./pages/payroll/PayslipViewerPage";
import HrLettersPage from "./pages/payroll/HrLettersPage";
import PayrollReportsPage from "./pages/payroll/PayrollReportsPage";
import ManpowerRequisitionPage from "./pages/recruitment/ManpowerRequisitionPage";
import JobPostingsPage from "./pages/recruitment/JobPostingsPage";
import CareerPortalPage from "./pages/recruitment/CareerPortalPage";
import CandidateBankPage from "./pages/recruitment/CandidateBankPage";
import KanbanPipelinePage from "./pages/recruitment/KanbanPipelinePage";
import InterviewSchedulingPage from "./pages/recruitment/InterviewSchedulingPage";
import ScorecardsPage from "./pages/recruitment/ScorecardsPage";
import EvaluationTemplatesPage from "./pages/recruitment/EvaluationTemplatesPage";
import RecruitmentDashboardPage from "./pages/recruitment/RecruitmentDashboardPage";
import RecruitmentReportsPage from "./pages/recruitment/RecruitmentReportsPage";
import HiredToEmployeePage from "./pages/recruitment/HiredToEmployeePage";
import NewEmployeePage from "./pages/NewEmployeePage";
import PerformanceTemplatesPage from "./pages/PerformanceTemplatesPage";
import PerformanceKpisPage from "./pages/PerformanceKpisPage";
import PerformanceCyclesPage from "./pages/PerformanceCyclesPage";
import PerformanceEvaluationPage from "./pages/PerformanceEvaluationPage";
import PerformanceReportsPage from "./pages/PerformanceReportsPage";
import UsersPage from "./pages/settings/UsersPage";
import EmployeeSelfServicePage from "./pages/EmployeeSelfServicePage";
import ManagerSelfServicePage from "./pages/ManagerSelfServicePage";
import RoleEditorPage from "./pages/settings/RoleEditorPage";
import UserOverridesPage from "./pages/settings/UserOverridesPage";
import ExpenseClaimsPage from "./pages/expenses/ExpenseClaimsPage";

// ─── Layout wrapper for authenticated pages ────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <HcmLayout>
        {children}
      </HcmLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />

      {/* Dashboard */}
      <Route path="/dashboard">
        <AppShell><Dashboard /></AppShell>
      </Route>

      {/* People */}
      <Route path="/employees">
        <AppShell><EmployeesPage /></AppShell>
      </Route>
      <Route path="/employees/new">
        <AppShell><NewEmployeePage /></AppShell>
      </Route>
      <Route path="/employees/:id">
        {(params) => <AppShell><EmployeeProfilePage employeeId={Number(params.id)} /></AppShell>}
      </Route>
      <Route path="/employees/bulk-upload">
        <AppShell><BulkUploadPage /></AppShell>
      </Route>
      <Route path="/employees/transfers">
        <AppShell><TransferExitPage /></AppShell>
      </Route>
      <Route path="/employees/matrix">
        <AppShell><EmployeeMatrixPage /></AppShell>
      </Route>
      <Route path="/employees/workforce-query">
        <AppShell><WorkforceQueryPage /></AppShell>
      </Route>

      {/* Org structure */}
      <Route path="/org">
        <AppShell><OrgPage /></AppShell>
      </Route>
      <Route path="/org/companies">
        <AppShell><PlaceholderPage title="Companies" description="Manage multi-tenant company entities — add, edit, and configure companies." /></AppShell>
      </Route>
      <Route path="/org/locations">
        <AppShell><PlaceholderPage title="Locations" description="Office locations, geo-fence settings, and address management." /></AppShell>
      </Route>
      <Route path="/org/departments">
        <AppShell><PlaceholderPage title="Departments" description="Department hierarchy, heads, and cost centre mapping." /></AppShell>
      </Route>
      <Route path="/org/designations">
        <AppShell><PlaceholderPage title="Designations" description="Job titles, grade levels, and designation hierarchy." /></AppShell>
      </Route>

      {/* ─── Module 3: Leave Management ─── */}
      <Route path="/leave">
        <AppShell><ApplyLeavePage /></AppShell>
      </Route>
      <Route path="/leave/apply">
        <AppShell><ApplyLeavePage /></AppShell>
      </Route>
      <Route path="/leave/my-leaves">
        <AppShell><MyLeavesPage /></AppShell>
      </Route>
      <Route path="/leave/calendar">
        <AppShell><LeaveCalendarPage /></AppShell>
      </Route>
      <Route path="/leave/balance">
        <AppShell><LeaveBalancePage /></AppShell>
      </Route>
      <Route path="/leave/approvals">
        <AppShell><LeaveApprovalPage /></AppShell>
      </Route>
      <Route path="/leave/compensatory">
        <AppShell><CompensatoryLeavePage /></AppShell>
      </Route>
      <Route path="/leave/types">
        <AppShell><LeaveTypesPage /></AppShell>
      </Route>
      <Route path="/leave/policies">
        <AppShell><LeavePoliciesPage /></AppShell>
      </Route>
      <Route path="/leave/reports">
        <AppShell><LeaveReportsPage /></AppShell>
      </Route>

      {/* ─── Module 2: Time & Attendance ─── */}
      <Route path="/attendance">
        <AppShell><AttendanceDashboard /></AppShell>
      </Route>
      <Route path="/attendance/clock">
        <AppShell><ClockPage /></AppShell>
      </Route>
      <Route path="/attendance/shifts">
        <AppShell><ShiftRosterPage /></AppShell>
      </Route>
      <Route path="/attendance/overtime">
        <AppShell><OvertimePage /></AppShell>
      </Route>
      <Route path="/attendance/import">
        <AppShell><PunchImportPage /></AppShell>
      </Route>
      <Route path="/attendance/reports">
        <AppShell><AttendanceReportsPage /></AppShell>
      </Route>
      <Route path="/attendance/anomalies">
        <AppShell><AnomalyFlagsPage /></AppShell>
      </Route>
      <Route path="/attendance/predictions">
        <AppShell><AbsenteeismPredictionPage /></AppShell>
      </Route>
      {/* ─── Module 4: Payroll Management ─── */}
      <Route path="/payroll">
        <AppShell><PayrollDashboardPage /></AppShell>
      </Route>
      <Route path="/payroll/structures">
        <AppShell><SalaryStructuresPage /></AppShell>
      </Route>
      <Route path="/payroll/tax">
        <AppShell><TaxSlabsPage /></AppShell>
      </Route>
      <Route path="/payroll/loans">
        <AppShell><LoansAdvancesPage /></AppShell>
      </Route>
      <Route path="/payroll/run">
        <AppShell><PayrollRunPage /></AppShell>
      </Route>
      <Route path="/payroll/payslips">
        <AppShell><PayslipViewerPage /></AppShell>
      </Route>
      <Route path="/payroll/reports">
        <AppShell><PayrollReportsPage /></AppShell>
      </Route>
      <Route path="/payroll/hr-letters">
        <AppShell><HrLettersPage /></AppShell>
      </Route>
      {/* ─── Module 5: Recruitment ─── */}
      {/* Public career portal — no auth required */}
      <Route path="/careers" component={CareerPortalPage} />

      <Route path="/recruitment">
        <AppShell><RecruitmentDashboardPage /></AppShell>
      </Route>
      <Route path="/recruitment/requisitions">
        <AppShell><ManpowerRequisitionPage /></AppShell>
      </Route>
      <Route path="/recruitment/jobs">
        <AppShell><JobPostingsPage /></AppShell>
      </Route>
      <Route path="/recruitment/candidates">
        <AppShell><CandidateBankPage /></AppShell>
      </Route>
      <Route path="/recruitment/pipeline">
        <AppShell><KanbanPipelinePage /></AppShell>
      </Route>
      <Route path="/recruitment/interviews">
        <AppShell><InterviewSchedulingPage /></AppShell>
      </Route>
      <Route path="/recruitment/scorecards">
        <AppShell><ScorecardsPage /></AppShell>
      </Route>
      <Route path="/recruitment/templates">
        <AppShell><EvaluationTemplatesPage /></AppShell>
      </Route>
      <Route path="/recruitment/hired">
        <AppShell><HiredToEmployeePage /></AppShell>
      </Route>
      <Route path="/recruitment/reports">
        <AppShell><RecruitmentReportsPage /></AppShell>
      </Route>
      {/* ─── Module 7: Performance Management ─── */}
      <Route path="/performance">
        <AppShell><PerformanceCyclesPage /></AppShell>
      </Route>
      <Route path="/performance/cycles">
        <AppShell><PerformanceCyclesPage /></AppShell>
      </Route>
      <Route path="/performance/templates">
        <AppShell><PerformanceTemplatesPage /></AppShell>
      </Route>
      <Route path="/performance/kpis">
        <AppShell><PerformanceKpisPage /></AppShell>
      </Route>
      <Route path="/performance/evaluate/:participantId">
        {(params) => <AppShell><PerformanceEvaluationPage /></AppShell>}
      </Route>
      <Route path="/performance/reports/:cycleId">
        {(params) => <AppShell><PerformanceReportsPage /></AppShell>}
      </Route>
      <Route path="/performance/reports">
        <AppShell><PerformanceReportsPage /></AppShell>
      </Route>
      <Route path="/training">
        <AppShell><PlaceholderPage title="Training & Development" description="Training plans, courses, and completion tracking." /></AppShell>
      </Route>
      <Route path="/assets">
        <AppShell><PlaceholderPage title="Asset Management" description="Company assets, assignments, and maintenance." /></AppShell>
      </Route>

      {/* Communication */}
      <Route path="/announcements">
        <AppShell><PlaceholderPage title="Announcements" description="Company-wide and targeted announcements." /></AppShell>
      </Route>
      <Route path="/documents">
        <AppShell><PlaceholderPage title="Documents" description="HR document management and e-signature workflows." /></AppShell>
      </Route>

      {/* System */}
      <Route path="/approvals">
        <AppShell><ApprovalsPage /></AppShell>
      </Route>
      <Route path="/roles">
        <AppShell><RolesPage /></AppShell>
      </Route>
      <Route path="/workflow">
        <AppShell><PlaceholderPage title="Workflow Builder" description="Design custom multi-step approval workflows for any module." /></AppShell>
      </Route>
      <Route path="/audit">
        <AppShell><AuditPage /></AppShell>
      </Route>
      <Route path="/reports">
        <AppShell><EmployeeReportsPage /></AppShell>
      </Route>
      <Route path="/settings">
        <AppShell><PlaceholderPage title="Settings" description="System configuration, integrations, and company preferences." /></AppShell>
      </Route>
      {/* Access Management */}
      <Route path="/settings/users">
        <AppShell><UsersPage /></AppShell>
      </Route>
      <Route path="/settings/roles">
        <AppShell><RoleEditorPage /></AppShell>
      </Route>
      <Route path="/settings/overrides">
        <AppShell><UserOverridesPage /></AppShell>
      </Route>
      {/* Self-Service Portals */}
      <Route path="/my">
        <AppShell><EmployeeSelfServicePage /></AppShell>
      </Route>
      <Route path="/my-team">
        <AppShell><ManagerSelfServicePage /></AppShell>
      </Route>

      <Route path="/expenses">
        <AppShell><ExpenseClaimsPage /></AppShell>
      </Route>
      <Route path="/ai-test">
        <AppShell><AiTestPage /></AppShell>
      </Route>

      <Route path="/notifications">
        <AppShell><PlaceholderPage title="Notifications" description="Your notification inbox and preferences." /></AppShell>
      </Route>
      <Route path="/profile">
        <AppShell><PlaceholderPage title="My Profile" description="Personal information, security settings, and preferences." /></AppShell>
      </Route>

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
