
import { Outlet, ScrollRestoration } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { OrganizationStructuredData, LocalBusinessStructuredData } from "../StructuredData";

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <OrganizationStructuredData />
      <LocalBusinessStructuredData />
      <ScrollRestoration />
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
