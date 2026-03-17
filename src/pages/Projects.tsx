import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ProjectCard } from "../components/ui/ProjectCard";

const projects = [
  {
    id: "1",
    title: "Lumina Cafe Flagship",
    sector: "Hospitality",
    scope: "Full Fitout & Joinery",
    description: "Complete interior fitout including custom curved timber counter, banquette seating, and architectural lighting integration.",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1600",
    tags: ["Hospitality", "Joinery"],
  },
  {
    id: "2",
    title: "Nexus Tech Hub",
    sector: "Commercial Office",
    scope: "Construction & Fitout",
    description: "A 2000sqm office refurbishment featuring acoustic meeting pods, custom reception desk, and open-plan workstations.",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1600",
    tags: ["Office", "Construction"],
  },
  {
    id: "3",
    title: "Aura Boutique",
    sector: "Retail",
    scope: "Shopfitting & Joinery",
    description: "High-end fashion retail fitout with bespoke brass display racks, marble counters, and premium veneer panelling.",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1600",
    tags: ["Retail", "Shopfitting"],
  },
  {
    id: "4",
    title: "Elevate Dental",
    sector: "Healthcare",
    scope: "Specialist Fitout",
    description: "Modern dental clinic fitout requiring strict hygiene compliance, custom sterilization room joinery, and patient lounge.",
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1600",
    tags: ["Healthcare", "Fitout"],
  },
  {
    id: "5",
    title: "The Local Grocer",
    sector: "Retail",
    scope: "Joinery & Refrigeration",
    description: "Boutique supermarket fitout integrating custom timber shelving with commercial refrigeration units.",
    imageUrl: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=1600",
    tags: ["Retail", "Joinery"],
  },
  {
    id: "6",
    title: "Vertex Consulting",
    sector: "Commercial Office",
    scope: "Boardroom & Reception",
    description: "Premium boardroom fitout featuring a 6-meter custom oak table, integrated AV, and a striking reception area.",
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=1600",
    tags: ["Office", "Joinery"],
  }
];

export function Projects() {
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filters = ["All", "Retail", "Hospitality", "Commercial Office", "Healthcare", "Joinery"];
  
  const filteredProjects = projects.filter(project => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Joinery") return project.tags.includes("Joinery");
    return project.sector === activeFilter;
  });

  return (
    <div className="flex flex-col min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle 
              subtitle="Our Portfolio"
              title="Featured Projects & Case Studies"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Explore a selection of our recent commercial construction, joinery, and shopfitting projects delivered across Australia.
            </p>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-12">
            {filters.map((filter) => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter 
                    ? 'bg-brand-dark dark:bg-brand-accent text-white border border-transparent' 
                    : 'bg-white dark:bg-gray-900 text-brand-dark dark:text-gray-300 hover:bg-brand-accent hover:text-white dark:hover:bg-brand-accent border border-gray-200 dark:border-gray-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProjectCard 
                    id={project.id}
                    title={project.title}
                    sector={project.sector}
                    scope={project.scope}
                    description={project.description}
                    imageUrl={project.imageUrl}
                    tags={project.tags}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
