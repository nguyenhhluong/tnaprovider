import { SEO } from "../../components/SEO";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { CostEstimatorForm } from "../../components/forms/CostEstimatorForm";

export function CostEstimator() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="Cost Estimator | TNA Provider"
        description="Get an indicative cost estimate for your commercial fitout, joinery, or construction project."
        canonical="https://tnaprovider.com.au/tools/cost-estimator"
      />
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle
              as="h1"
              subtitle="Cost Estimator"
              title="Estimate Your Project Cost"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Get an indicative range for your commercial project based on type, size, materials, and location.
            </p>
          </div>
        </div>
      </section>
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <CostEstimatorForm />
        </div>
      </section>
    </div>
  );
}
