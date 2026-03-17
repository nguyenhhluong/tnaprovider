import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { projects } from "../data/projects";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-dark dark:text-white mb-4">Project Not Found</h1>
          <Link to="/projects" className="text-brand-accent hover:underline inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-brand-gray dark:bg-brand-darker">
      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[70vh] w-full">
        <img 
          src={project.imageUrl} 
          alt={project.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/projects" className="text-white/80 hover:text-white inline-flex items-center mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
              <h1 className="text-4xl md:text-6xl font-display font-light text-white mb-4">
                {project.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-brand-accent text-white text-sm font-medium uppercase tracking-wider">
                  {project.sector}
                </span>
                <span className="px-4 py-2 bg-white/10 backdrop-blur-md text-white border border-white/20 text-sm font-medium uppercase tracking-wider">
                  {project.scope}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl md:text-3xl font-display font-light text-brand-dark dark:text-white mb-6">
                Project Overview
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-12">
                {project.fullDescription}
              </p>

              {/* Gallery */}
              <h3 className="text-xl md:text-2xl font-display font-light text-brand-dark dark:text-white mb-6">
                Gallery
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.gallery.map((img, index) => (
                  <img 
                    key={index}
                    src={img}
                    alt={`${project.title} gallery ${index + 1}`}
                    className="w-full h-64 object-cover rounded-lg shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar Details */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-28"
            >
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                Project Details
              </h3>
              
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Client</p>
                  <p className="font-medium text-brand-dark dark:text-gray-200">{project.client}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Location</p>
                  <p className="font-medium text-brand-dark dark:text-gray-200">{project.location}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Year</p>
                  <p className="font-medium text-brand-dark dark:text-gray-200">{project.year}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Scope of Work</p>
                  <p className="font-medium text-brand-dark dark:text-gray-200">{project.scope}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-brand-gray dark:bg-gray-800 text-brand-dark dark:text-gray-300 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
