import { SEO } from "../components/SEO";
import { SectionTitle } from "../components/ui/SectionTitle";
import { MaterialGallery } from "../components/sections/MaterialGallery";

export function Materials() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="Material & Finish Gallery | TNA Provider"
        description="Browse TNA Provider's material and finish gallery featuring veneers, laminates, stone, solid surfaces, hardware, and more for your commercial project."
        canonical="https://tnaprovider.com.au/materials"
      />
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle
              as="h1"
              subtitle="Material & Finish Gallery"
              title="Explore Materials & Finishes"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Browse our curated selection of timber veneers, laminates, stone, hardware, lighting, and finishes for your next commercial project.
            </p>
          </div>
        </div>
      </section>
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <MaterialGallery />
        </div>
      </section>
    </div>
  );
}
