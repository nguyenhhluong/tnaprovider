import { useState, useMemo } from "react";
import { SEO } from "../components/SEO";
import { motion, AnimatePresence } from "motion/react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { ProjectCard } from "../components/ui/ProjectCard";
import { LuxuryShowcase } from "../components/ui/LuxuryShowcase";
import { projects } from "../data/projects";
import { Search, X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { cn } from "../utils/cn";

const filters = [
  "All",
  "Residential",
  "Retail",
  "Hospitality",
  "Commercial Office",
  "Medical",
  "Joinery",
  "Shopfitting",
  "Construction",
] as const;

type Filter = (typeof filters)[number];

export function Projects() {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Joinery" && project.tags.includes("Joinery")) ||
        (activeFilter === "Shopfitting" && project.tags.includes("Shopfitting")) ||
        (activeFilter === "Construction" && project.tags.includes("Construction")) ||
        project.sector === activeFilter;

      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      return (
        project.title.toLowerCase().includes(query) ||
        project.sector.toLowerCase().includes(query) ||
        project.scope.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query) ||
        project.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [activeFilter, searchQuery]);

  const resetFilters = () => {
    setActiveFilter("All");
    setSearchQuery("");
  };

  const hasActiveFilters = activeFilter !== "All" || searchQuery.trim() !== "";

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <SEO
        title="Our Projects | Commercial Fitouts & Joinery Portfolio | TNA Provider"
        description="View TNA Provider's portfolio of commercial fitouts, custom joinery, and construction projects across retail, hospitality, office, and residential sectors."
        canonical="https://tnaprovider.com.au/projects"
      />

      {/* Luxury Showcase Hero */}
      <LuxuryShowcase projects={projects.slice(0, 4)} />

      {/* Projects Grid */}
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="mb-12"
          >
            <h1 className="sr-only">Our Projects Portfolio</h1>
            <h2 className="text-3xl md:text-4xl font-display font-light text-brand-dark dark:text-white mb-4">
              All Projects
            </h2>
            <div className="w-12 h-[2px] bg-brand-accent mb-8" />
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex flex-col gap-6 mb-12"
          >
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by title, sector, location..."
                className="w-full h-12 pl-12 pr-10 rounded-full bg-white dark:bg-gray-900 text-brand-dark dark:text-white border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all text-sm"
                aria-label="Search projects"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    activeFilter === filter
                      ? "bg-brand-dark dark:bg-brand-accent text-white shadow-sm"
                      : "bg-white dark:bg-gray-900 text-brand-dark dark:text-gray-300 hover:bg-brand-accent hover:text-white dark:hover:bg-brand-accent border border-gray-200 dark:border-gray-800"
                  )}
                >
                  {filter}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-brand-accent transition-colors"
                >
                  Reset filters
                </button>
              )}
            </div>
          </motion.div>

          {/* Results */}
          <AnimatePresence mode="popLayout">
            {filteredProjects.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <ProjectCard
                      id={project.id}
                      title={project.title}
                      sector={project.sector}
                      scope={project.scope}
                      description={project.description}
                      imageUrl={project.imageUrl}
                      tags={project.tags}
                      location={project.location}
                      deliveryHighlights={project.deliveryHighlights}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-4">
                  No projects found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  No projects match this filter yet. Try another category or contact us about a
                  similar project.
                </p>
                <Button asChild variant="outline">
                  <a href="/contact">Contact Us About Your Project</a>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
