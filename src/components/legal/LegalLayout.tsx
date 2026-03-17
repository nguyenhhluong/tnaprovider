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
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-7 text-zinc-700 md:text-base">
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
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-16 md:px-8 md:py-24">
        <header className="mb-12 space-y-4 border-b border-zinc-200 pb-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            {eyebrow}
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 md:text-5xl">
            {title}
          </h1>

          <div className="space-y-1 text-sm text-zinc-600 md:text-base">
            <p>{companyName}</p>
            <p>ABN {abn}</p>
            <p>Last updated: {lastUpdated}</p>
          </div>
        </header>

        <div className="space-y-10">{children}</div>
      </div>
    </main>
  );
}
