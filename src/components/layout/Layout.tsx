
import { Outlet, ScrollRestoration } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "TNA Provider",
  "description": "Sydney-based commercial construction and joinery company. Custom joinery, shopfitting, and fitout services for retail, hospitality, and office spaces.",
  "url": "https://tnaprovider.com.au",
  "telephone": "0406 409 668",
  "email": "info@tnaprovider.com.au",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "16/46 Wellington Road",
    "addressLocality": "South Granville",
    "addressRegion": "NSW",
    "postalCode": "2142",
    "addressCountry": "AU"
  },
  "areaServed": ["Sydney", "NSW", "Australia"],
  "priceRange": "$$",
  "image": "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1200",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "07:00",
      "closes": "17:00"
    }
  ],
  "sameAs": [
    "https://www.facebook.com/profile.php?id=61553129173917"
  ]
};

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ScrollRestoration />
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
