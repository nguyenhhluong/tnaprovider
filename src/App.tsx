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
import { CostEstimator } from "./pages/tools/CostEstimator";
import { TenderUpload } from "./pages/tools/TenderUpload";
import { TimelinePredictor } from "./pages/tools/TimelinePredictor";
import { Capability } from "./pages/capability/Capability";
import { Materials } from "./pages/Materials";
import { ProjectMapPage } from "./pages/ProjectMap";

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
      { path: "tools/cost-estimator", element: <CostEstimator /> },
      { path: "tools/tender-upload", element: <TenderUpload /> },
      { path: "tools/timeline-predictor", element: <TimelinePredictor /> },
      { path: "capability", element: <Capability /> },
      { path: "materials", element: <Materials /> },
      { path: "project-map", element: <ProjectMapPage /> },
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
