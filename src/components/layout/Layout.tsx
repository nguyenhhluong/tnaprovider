import { Outlet, ScrollRestoration } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AIChat } from "../AIChat";

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollRestoration />
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <AIChat />
    </div>
  );
}
