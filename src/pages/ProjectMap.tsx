import { SEO } from "../components/SEO";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ProjectMap as ProjectMapComponent } from "../components/interactive/ProjectMap";

export function ProjectMapPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      <SEO
        title="Project Map | TNA Provider"
        description="Explore TNA Provider commercial projects across Australia by location, sector, and project type."
        canonical="https://tnaprovider.com.au/project-map"
      />
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle
              as="h1"
              subtitle="Project Map"
              title="Our Projects Across Australia"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Explore TNA Provider commercial projects across Australia. Filter by sector, state, or search by location.
            </p>
          </div>
        </div>
      </section>
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <ProjectMapComponent />
        </div>
      </section>
    </div>
  );
}
