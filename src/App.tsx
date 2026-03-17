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
import { Contact } from "./pages/Contact";
import { ThemeProvider } from "./components/ThemeProvider";

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
      { path: "contact", element: <Contact /> },
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
