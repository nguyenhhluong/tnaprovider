import { business } from "../data/business";

export function OrganizationStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: business.name,
    legalName: business.legalName,
    url: business.url,
    logo: business.image,
    image: business.image,
    description: business.description,
    email: business.email,
    telephone: business.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.suburb,
      addressRegion: business.address.state,
      postalCode: business.address.postcode,
      addressCountry: business.address.country,
    },
    areaServed: business.areaServed.map((area) => ({ "@type": "City", name: area })),
    sameAs: business.sameAs,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function LocalBusinessStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: business.url,
    image: business.image,
    description: business.description,
    email: business.email,
    telephone: business.phone,
    priceRange: business.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.suburb,
      addressRegion: business.address.state,
      postalCode: business.address.postcode,
      addressCountry: business.address.country,
    },
    openingHoursSpecification: business.openingHours.map((oh) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: oh.days,
      opens: oh.opens,
      closes: oh.closes,
    })),
    areaServed: business.areaServed,
    sameAs: business.sameAs,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function FAQStructuredData({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
