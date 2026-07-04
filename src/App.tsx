/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Services } from "./pages/Services";
import { Sectors } from "./pages/Sectors";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Contact } from "./pages/Contact";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicy";
import { TermsOfServicePage } from "./pages/TermsOfService";
import { ThemeProvider } from "./components/ThemeProvider";
import { PlatformLayout } from "./pages/platform/PlatformLayout";
import { Dashboard } from "./pages/platform/Dashboard";
import { Leads } from "./pages/platform/Leads";
import { PlatformProjects } from "./pages/platform/PlatformProjects";
import { Timesheets } from "./pages/platform/Timesheets";
import { ClientPortal } from "./pages/platform/ClientPortal";
import { Maintenance } from "./pages/platform/Maintenance";
import { Analytics } from "./pages/platform/Analytics";
import { Email } from "./pages/platform/Email";

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
      { path: "privacy-policy", element: <PrivacyPolicyPage /> },
      { path: "terms-of-service", element: <TermsOfServicePage /> },
    ],
  },
  {
    path: "/platform",
    element: <PlatformLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "leads", element: <Leads /> },
      { path: "projects", element: <PlatformProjects /> },
      { path: "timesheets", element: <Timesheets /> },
      { path: "client-portal", element: <ClientPortal /> },
      { path: "maintenance", element: <Maintenance /> },
      { path: "analytics", element: <Analytics /> },
      { path: "email", element: <Email /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="tna-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
