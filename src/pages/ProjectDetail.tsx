import { SEO } from "../components/SEO";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Building2, MapPin, Calendar, Clock, User } from "lucide-react";
import { projects } from "../data/projects";
import { BeforeAfterSlider } from "../components/interactive/BeforeAfterSlider";
import { BookingCTA } from "../components/sections/BookingCTA";
import { Button } from "../components/ui/Button";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <meta name="robots" content="noindex" />
        <div className="text-center px-4">
          <h1 className="text-3xl font-bold text-brand-dark dark:text-white mb-4">
            Project Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
            The project you're looking for doesn't exist or may have been removed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/projects"
              className="inline-flex items-center text-brand-accent hover:underline font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Link>
            <Button asChild variant="outline">
              <Link to="/contact?source=project-not-found">
                Contact Us About a Similar Project
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const pm = {
    title: `${project.title} | ${project.sector} | TNA Provider`,
    description: project.description,
    canonical: `https://tnaprovider.com.au/projects/${project.id}`,
    image: project.imageUrl,
  };

  const sidebarDetails = [
    { label: "Client", value: project.client, icon: User },
    { label: "Client Type", value: project.clientType, icon: Building2 },
    { label: "Location", value: project.location, icon: MapPin },
    { label: "Year", value: project.year, icon: Calendar },
    { label: "Timeline", value: project.timeline, icon: Clock },
    { label: "Scope of Work", value: project.scope, icon: CheckCircle2 },
  ].filter((d) => d.value);

  return (
    <div className="min-h-screen pt-20 bg-brand-gray dark:bg-brand-darker">
      <SEO
        title={pm.title}
        description={pm.description}
        canonical={pm.canonical}
        ogImage={pm.image}
      />

      {/* Hero Section */}
      <div className="relative h-[50vh] md:h-[70vh] w-full">
        <img
          src={project.imageUrl}
          alt={project.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-end pb-16 md:pb-24">
          <div className="container mx-auto px-4 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link
                to="/projects"
                className="text-white/80 hover:text-white inline-flex items-center mb-4 md:mb-6 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Link>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-light text-white mb-4">
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
            {/* Project Overview */}
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
            </motion.div>

            {/* Challenge / Solution / Result */}
            <div className="flex flex-col gap-8 mb-16">
              {project.challenge && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5 }}
                  className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-bold">
                      !
                    </span>
                    The Challenge
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {project.challenge}
                  </p>
                </motion.div>
              )}

              {project.solution && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                      &rarr;
                    </span>
                    Our Solution
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {project.solution}
                  </p>
                </motion.div>
              )}

              {project.result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
                >
                  <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-bold">
                      &#10003;
                    </span>
                    The Result
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {project.result}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Before/After Slider */}
            {project.beforeImageUrl && project.afterImageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="mb-16"
              >
                <h3 className="text-xl md:text-2xl font-display font-light text-brand-dark dark:text-white mb-8">
                  Before & After
                </h3>
                <BeforeAfterSlider
                  beforeImageUrl={project.beforeImageUrl}
                  afterImageUrl={project.afterImageUrl}
                  beforeLabel="Before"
                  afterLabel="After"
                  alt={project.title}
                />
              </motion.div>
            )}

            {/* Delivery Highlights */}
            {project.deliveryHighlights && project.deliveryHighlights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
                className="mb-16"
              >
                <h3 className="text-xl md:text-2xl font-display font-light text-brand-dark dark:text-white mb-6">
                  Delivery Highlights
                </h3>
                <div className="flex flex-wrap gap-3">
                  {project.deliveryHighlights.map((h, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full text-sm font-medium text-brand-dark dark:text-gray-200 border border-gray-100 dark:border-gray-800"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                      {h}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Material Highlights */}
            {project.materialHighlights && project.materialHighlights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-16"
              >
                <h3 className="text-xl md:text-2xl font-display font-light text-brand-dark dark:text-white mb-6">
                  Material Highlights
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {project.materialHighlights.map((m, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300"
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Gallery */}
            {project.gallery && project.gallery.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <h3 className="text-xl md:text-2xl font-display font-light text-brand-dark dark:text-white mb-6">
                  Gallery
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.gallery.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <img
                        src={img}
                        alt={`${project.title} gallery ${index + 1}`}
                        className="w-full h-64 object-cover rounded-lg shadow-sm"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="flex flex-col gap-8 sticky top-28">
              {/* Project Details */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                  Project Details
                </h3>

                <div className="space-y-6">
                  {sidebarDetails.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                    >
                      <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </p>
                      <p className="font-medium text-brand-dark dark:text-gray-200">
                        {item.value}
                      </p>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + sidebarDetails.length * 0.08 }}
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-brand-gray dark:bg-gray-800 text-brand-dark dark:text-gray-300 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Button asChild size="lg" className="w-full">
                  <Link
                    to={`/contact?project=${project.id}&source=request-similar-project`}
                  >
                    Request Similar Project
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </motion.div>

              {/* Booking CTA */}
              <BookingCTA />
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Projects */}
      <section className="py-16 bg-white dark:bg-brand-darker border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 md:px-8">
          <h3 className="text-2xl font-display font-bold text-brand-dark dark:text-white mb-8">
            Similar Projects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects
              .filter((p) => p.id !== project.id && p.sector === project.sector)
              .slice(0, 3)
              .map((related, index) => (
                <motion.div
                  key={related.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link
                    to={`/projects/${related.id}`}
                    className="group block bg-brand-gray dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={related.imageUrl}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-6">
                      <h4 className="text-lg font-bold text-brand-dark dark:text-white group-hover:text-brand-accent transition-colors">
                        {related.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {related.scope}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
