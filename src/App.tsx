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
import { Settings } from "./pages/platform/Settings";
import { Users as PlatformUsers } from "./pages/platform/Users";
import { Audit } from "./pages/platform/Audit";
import { Profile } from "./pages/platform/Profile";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "services", element: <Services /> },
      { path: "sectors", element: <Sectors /> },
      { path: "projects", element: <Projects /> },
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
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/platform",
    element: <ProtectedRoute><PlatformLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "leads", element: <Leads /> },
      { path: "projects", element: <PlatformProjects /> },
      { path: "timesheets", element: <Timesheets /> },
      { path: "client-portal", element: <ClientPortal /> },
      { path: "maintenance", element: <Maintenance /> },
      { path: "analytics", element: <Analytics /> },
      { path: "email", element: <Email /> },
      { path: "settings", element: <ProtectedRoute roles={["owner", "admin"]}><Settings /></ProtectedRoute> },
      { path: "users", element: <ProtectedRoute roles={["owner", "admin"]}><PlatformUsers /></ProtectedRoute> },
      { path: "audit", element: <ProtectedRoute roles={["owner", "admin"]}><Audit /></ProtectedRoute> },
      { path: "profile", element: <Profile /> },
    ],
  },
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
