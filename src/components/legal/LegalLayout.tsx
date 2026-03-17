import React from "react";

type LegalLayoutProps = {
  eyebrow?: string;
  title: string;
  companyName: string;
  abn: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 border-b border-gray-200 dark:border-gray-800">
      <h2 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-4">
        {title}
      </h2>
      <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}

export default function LegalLayout({
  eyebrow = "Legal",
  title,
  companyName,
  abn,
  lastUpdated,
  children,
}: LegalLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <section className="bg-brand-darker text-white py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-accent mb-2">
            {eyebrow}
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            {title}
          </h1>
          <div className="text-gray-300">
            <p>{companyName}</p>
            <p>ABN {abn}</p>
            <p>Last updated: {lastUpdated}</p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {children}
        </div>
      </section>
    </div>
  );
}
