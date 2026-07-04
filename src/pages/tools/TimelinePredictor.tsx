import { SEO } from "../../components/SEO";
import { SectionTitle } from "../../components/ui/SectionTitle";
import { TimelinePredictorForm } from "../../components/forms/TimelinePredictorForm";

export function TimelinePredictor() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="Timeline Predictor | TNA Provider"
        description="Get an estimated project timeline with stage-by-stage breakdown for your commercial fitout or construction project."
        canonical="https://tnaprovider.com.au/tools/timeline-predictor"
      />
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle
              as="h1"
              subtitle="Timeline Predictor"
              title="Predict Your Project Timeline"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Get a stage-by-stage timeline estimate based on your project type, size, and requirements.
            </p>
          </div>
        </div>
      </section>
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <TimelinePredictorForm />
        </div>
      </section>
    </div>
  );
}
