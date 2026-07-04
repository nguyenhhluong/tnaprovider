import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Services } from "./pages/Services";
import { Sectors } from "./pages/Sectors";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Contact } from "./pages/Contact";
import { FAQ } from "./pages/FAQ";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicy";
import { TermsOfServicePage } from "./pages/TermsOfService";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/platform/ProtectedRoute";
import { CostEstimator } from "./pages/tools/CostEstimator";
import { TenderUpload } from "./pages/tools/TenderUpload";
import { TimelinePredictor } from "./pages/tools/TimelinePredictor";
import { Capability } from "./pages/capability/Capability";
import { Materials } from "./pages/Materials";
import { ProjectMapPage } from "./pages/ProjectMap";
import { PlatformLayout } from "./pages/platform/PlatformLayout";
import { Dashboard } from "./pages/platform/Dashboard";
import { Leads } from "./pages/platform/Leads";
import { PlatformProjects } from "./pages/platform/PlatformProjects";
import { Timesheets } from "./pages/platform/Timesheets";
import { ClientPortal } from "./pages/platform/ClientPortal";
import { Maintenance } from "./pages/platform/Maintenance";
import { Analytics } from "./pages/platform/Analytics";
import { Email } from "./pages/platform/Email";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { AcceptInvite } from "./pages/AcceptInvite";
import { ForcePasswordChange } from "./pages/ForcePasswordChange";
import { Settings } from "./pages/platform/Settings";
import { Users as PlatformUsers } from "./pages/platform/Users";
import { Audit } from "./pages/platform/Audit";
import { Profile } from "./pages/platform/Profile";
import { Security } from "./pages/platform/Security";
import { AdminTools } from "./pages/platform/AdminTools";
import LeadAutomation from "./pages/platform/LeadAutomation";
import Quotes from "./pages/platform/Quotes";
import Tasks from "./pages/platform/Tasks";
import Documents from "./pages/platform/Documents";
import Notifications from "./pages/platform/Notifications";
import Reports from "./pages/platform/Reports";
import { RealtimeTimesheet } from "./pages/platform/RealtimeTimesheet";
import { AdminRealtimeTimesheets } from "./pages/platform/AdminRealtimeTimesheets";
import { EmployeeRates } from "./pages/platform/EmployeeRates";
import { AdminSiteQR } from "./pages/platform/AdminSiteQR";
import { PayRules } from "./pages/platform/PayRules";
import { PayrollSummary } from "./pages/platform/PayrollSummary";
import { QRSiteCheckIn } from "./pages/platform/QRSiteCheckIn";
import { isAppHost } from "./utils/host";

function AppIndex() {
  if (isAppHost()) return <Dashboard />;
  return <Home />;
}

function AppProjects() {
  if (isAppHost()) return <PlatformProjects />;
  return <Projects />;
}

function RootLayout() {
  if (isAppHost()) return <ProtectedRoute><PlatformLayout /></ProtectedRoute>;
  return <Layout />;
}

function AppLogin() {
  return <Login />;
}

function AppForgotPassword() {
  return <ForgotPassword />;
}

function AppResetPassword() {
  return <ResetPassword />;
}

function AppAcceptInvite() {
  return <AcceptInvite />;
}

function AppForcePasswordChange() {
  return <ForcePasswordChange />;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <AppIndex /> },
      { path: "about", element: <About /> },
      { path: "services", element: <Services /> },
      { path: "sectors", element: <Sectors /> },
      { path: "projects", element: <AppProjects /> },
      { path: "projects/:id", element: <ProjectDetail /> },
      { path: "contact", element: <Contact /> },
      { path: "faq", element: <FAQ /> },
      { path: "privacy-policy", element: <PrivacyPolicyPage /> },
      { path: "terms-of-service", element: <TermsOfServicePage /> },
      { path: "tools/cost-estimator", element: <CostEstimator /> },
      { path: "tools/tender-upload", element: <TenderUpload /> },
      { path: "tools/timeline-predictor", element: <TimelinePredictor /> },
      { path: "capability", element: <Capability /> },
      { path: "materials", element: <Materials /> },
      { path: "project-map", element: <ProjectMapPage /> },
      { path: "leads", element: <Leads /> },
      { path: "timesheets", element: <Timesheets /> },
      { path: "realtime-timesheet", element: <ProtectedRoute roles={["owner", "admin", "manager", "worker"]}><RealtimeTimesheet /></ProtectedRoute> },
      { path: "admin-realtime-timesheets", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><AdminRealtimeTimesheets /></ProtectedRoute> },
      { path: "employee-rates", element: <ProtectedRoute roles={["owner", "admin"]}><EmployeeRates /></ProtectedRoute> },
      { path: "admin-site-qr", element: <ProtectedRoute roles={["owner", "admin"]}><AdminSiteQR /></ProtectedRoute> },
      { path: "pay-rules", element: <ProtectedRoute roles={["owner", "admin"]}><PayRules /></ProtectedRoute> },
      { path: "payroll-summary", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><PayrollSummary /></ProtectedRoute> },
      { path: "qr-check-in/:qrToken", element: <ProtectedRoute roles={["owner", "admin", "manager", "worker"]}><QRSiteCheckIn /></ProtectedRoute> },
      { path: "users", element: <ProtectedRoute roles={["owner", "admin"]}><PlatformUsers /></ProtectedRoute> },
      { path: "security", element: <ProtectedRoute roles={["owner", "admin"]}><Security /></ProtectedRoute> },
      { path: "audit", element: <ProtectedRoute roles={["owner", "admin"]}><Audit /></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute roles={["owner", "admin"]}><Settings /></ProtectedRoute> },
      { path: "client-portal", element: <ClientPortal /> },
      { path: "maintenance", element: <Maintenance /> },
      { path: "analytics", element: <Analytics /> },
      { path: "email", element: <Email /> },
      { path: "admin-tools", element: <ProtectedRoute roles={["owner", "admin"]}><AdminTools /></ProtectedRoute> },
      { path: "lead-automation", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><LeadAutomation /></ProtectedRoute> },
      { path: "quotes", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><Quotes /></ProtectedRoute> },
      { path: "tasks", element: <ProtectedRoute roles={["owner", "admin", "manager", "worker"]}><Tasks /></ProtectedRoute> },
      { path: "documents", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><Documents /></ProtectedRoute> },
      { path: "notifications", element: <ProtectedRoute><Notifications /></ProtectedRoute> },
      { path: "reports", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><Reports /></ProtectedRoute> },
      { path: "profile", element: <Profile /> },
    ],
  },
  {
    path: "/platform",
    element: <ProtectedRoute><PlatformLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "leads", element: <Leads /> },
      { path: "projects", element: <PlatformProjects /> },
      { path: "timesheets", element: <Timesheets /> },
      { path: "realtime-timesheet", element: <ProtectedRoute roles={["owner", "admin", "manager", "worker"]}><RealtimeTimesheet /></ProtectedRoute> },
      { path: "admin-realtime-timesheets", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><AdminRealtimeTimesheets /></ProtectedRoute> },
      { path: "employee-rates", element: <ProtectedRoute roles={["owner", "admin"]}><EmployeeRates /></ProtectedRoute> },
      { path: "admin-site-qr", element: <ProtectedRoute roles={["owner", "admin"]}><AdminSiteQR /></ProtectedRoute> },
      { path: "pay-rules", element: <ProtectedRoute roles={["owner", "admin"]}><PayRules /></ProtectedRoute> },
      { path: "payroll-summary", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><PayrollSummary /></ProtectedRoute> },
      { path: "qr-check-in/:qrToken", element: <ProtectedRoute roles={["owner", "admin", "manager", "worker"]}><QRSiteCheckIn /></ProtectedRoute> },
      { path: "client-portal", element: <ClientPortal /> },
      { path: "maintenance", element: <Maintenance /> },
      { path: "analytics", element: <Analytics /> },
      { path: "email", element: <Email /> },
      { path: "security", element: <ProtectedRoute roles={["owner", "admin"]}><Security /></ProtectedRoute> },
      { path: "settings", element: <ProtectedRoute roles={["owner", "admin"]}><Settings /></ProtectedRoute> },
      { path: "users", element: <ProtectedRoute roles={["owner", "admin"]}><PlatformUsers /></ProtectedRoute> },
      { path: "audit", element: <ProtectedRoute roles={["owner", "admin"]}><Audit /></ProtectedRoute> },
      { path: "admin-tools", element: <ProtectedRoute roles={["owner", "admin"]}><AdminTools /></ProtectedRoute> },
      { path: "lead-automation", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><LeadAutomation /></ProtectedRoute> },
      { path: "quotes", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><Quotes /></ProtectedRoute> },
      { path: "tasks", element: <ProtectedRoute roles={["owner", "admin", "manager", "worker"]}><Tasks /></ProtectedRoute> },
      { path: "documents", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><Documents /></ProtectedRoute> },
      { path: "notifications", element: <ProtectedRoute><Notifications /></ProtectedRoute> },
      { path: "reports", element: <ProtectedRoute roles={["owner", "admin", "manager"]}><Reports /></ProtectedRoute> },
      { path: "profile", element: <Profile /> },
    ],
  },
  { path: "/login", element: <AppLogin /> },
  { path: "/forgot-password", element: <AppForgotPassword /> },
  { path: "/reset-password", element: <AppResetPassword /> },
  { path: "/accept-invite", element: <AppAcceptInvite /> },
  { path: "/force-password-change", element: <AppForcePasswordChange /> },
]);

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="tna-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}
