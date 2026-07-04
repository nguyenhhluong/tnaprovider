import { SEO } from "../../components/SEO";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { CapabilityCard } from "../../components/sections/CapabilityCard";
import { capabilityStatements } from "../../data/capabilityStatements";

export function Capability() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="Capability Statement | TNA Provider"
        description="Explore TNA Provider's capabilities across retail, hospitality, medical, office, custom joinery, shopfitting, and commercial construction."
        canonical="https://tnaprovider.com.au/capability"
      />
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle
              as="h1"
              subtitle="Capability Statement"
              title="What We Can Deliver"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Explore our capabilities across commercial sectors. Download detailed capability statements for your next project.
            </p>
          </div>
        </div>
      </section>
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capabilityStatements.map((cap) => (
              <CapabilityCard key={cap.sector} capability={cap} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
