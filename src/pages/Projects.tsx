import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ProjectCard } from "../components/ui/ProjectCard";
import { LuxuryShowcase } from "../components/ui/LuxuryShowcase";
import { projects } from "../data/projects";

export function Projects() {
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filters = ["All", "Residential", "Retail", "Hospitality", "Commercial Office", "Healthcare", "Joinery"];
  
  const filteredProjects = projects.filter(project => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Joinery") return project.tags.includes("Joinery");
    return project.sector === activeFilter;
  });

  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Luxury Showcase Hero */}
      <LuxuryShowcase projects={projects.slice(0, 4)} />

      {/* Projects Grid */}
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-light text-brand-dark dark:text-white mb-4">
              All Projects
            </h2>
            <div className="w-12 h-[2px] bg-brand-accent mb-8" />
          </div>

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
