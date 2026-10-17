import { createBrowserRouter, Navigate } from "react-router";
import { AdminShell } from "./shell";
import {
  AdminOverview,
  IntegrationsSecurity,
  MonitoringAudit,
  PoliciesAI,
  UserManagement,
  VendorManagement,
  TaxKnowledgeBase,
  DeadlinesCalendar,
} from "./pages";
import { AuditorShell } from "./auditor-shell";
import { AuditTrail, AuditorDashboard, DecisionReview, FinBot, ReportsForecast, TaxAnnexures } from "./auditor-pages";
import RegistrationPage from "./pages/RegistrationPage";
import LoginPage from "./pages/LoginPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/PasswordResetPages";
import PendingRegistrations from "./pages/admin/PendingRegistrations";
import FinanceOfficerDashboard from "./pages/finance/FinanceOfficerDashboard";
import Home from "./pages/Home";

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  {
    path: "/admin",
    Component: AdminShell,
    children: [
      { index: true, element: <Navigate replace to="/admin/overview" /> },
      { path: "overview", Component: AdminOverview },
      { path: "users", Component: UserManagement },
      { path: "vendors", Component: VendorManagement },
      { path: "policies-ai", Component: PoliciesAI },
      { path: "tax-kb", Component: TaxKnowledgeBase },
      { path: "monitoring-audit", Component: MonitoringAudit },
      { path: "deadlines", Component: DeadlinesCalendar },
      { path: "integrations-security", Component: IntegrationsSecurity },
      { path: "requests", Component: PendingRegistrations },
      { path: "registrations", element: <Navigate replace to="/admin/users" /> },
      { path: "dashboard", element: <Navigate replace to="/admin/overview" /> },
    ],
  },
  {
    path: "/auditor",
    Component: AuditorShell,
    children: [
      { index: true, element: <Navigate replace to="/auditor/dashboard" /> },
      { path: "dashboard", Component: AuditorDashboard },
      { path: "audit-trail", Component: AuditTrail },
      { path: "decision-review", Component: DecisionReview },
      { path: "reports-forecast", Component: ReportsForecast },
      { path: "tax-annexures", Component: TaxAnnexures },
      { path: "finbot", Component: FinBot },
    ],
  },
  { path: "/register", Component: RegistrationPage },
  { path: "/login", Component: LoginPage },
  { path: "/forgot-password", Component: ForgotPasswordPage },
  { path: "/reset-password", Component: ResetPasswordPage },
  { path: "/officer/dashboard", Component: FinanceOfficerDashboard },
  { path: "/finance", Component: FinanceOfficerDashboard },
  { path: "/finance-officer", Component: FinanceOfficerDashboard },
  { path: "*", element: <Navigate replace to="/" /> },
]);
