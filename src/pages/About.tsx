import { motion } from "motion/react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { CheckCircle2, Target, Shield, Clock } from "lucide-react";

export function About() {
  return (
    <div className="flex flex-col min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=2000" 
            alt="Construction" 
            className="w-full h-full object-cover mix-blend-luminosity"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle 
              subtitle="About TNA Provider"
              title="Building Commercial Excellence Across Australia"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              We are a premier Australian construction company specializing in end-to-end solutions for commercial and retail spaces. From bespoke joinery fabrication to on-site construction and project management, we deliver quality without compromise.
            </p>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-24 bg-white dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col gap-8">
              <SectionTitle 
                subtitle="Our Story"
                title="A Foundation of Trust and Craftsmanship"
              />
              <div className="prose prose-lg text-gray-600 dark:text-gray-400">
                <p>
                  TNA Provider was founded on a simple principle: commercial construction and fitouts shouldn't be a fragmented, stressful process. By bringing design, manufacturing, and construction under one roof, we provide a streamlined experience for our clients.
                </p>
                <p>
                  Our in-house joinery facility allows us to maintain strict quality control over every bespoke element, while our experienced site managers ensure that the physical build progresses smoothly, safely, and on schedule.
                </p>
                <p>
                  Whether it's a high-end retail boutique, a bustling hospitality venue, or a modern corporate office, we have the expertise to bring your vision to life.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800" 
                alt="Joinery Workshop" 
                className="rounded-2xl w-full h-64 object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://images.unsplash.com/photo-1541888086925-920a0b414631?auto=format&fit=crop&q=80&w=800" 
                alt="Construction Site" 
                className="rounded-2xl w-full h-64 object-cover mt-8"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-brand-gray dark:bg-gray-900">
        <div className="container mx-auto px-4 md:px-8">
          <SectionTitle 
            subtitle="Our Values"
            title="What Makes Us Different"
            align="center"
            className="mb-16"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "End-to-End Capability",
                desc: "From initial design and planning through to custom manufacturing and final installation, we handle every aspect of your project."
              },
              {
                icon: Shield,
                title: "Uncompromising Quality",
                desc: "Our in-house joinery and strict site management protocols ensure that every detail meets our exacting standards."
              },
              {
                icon: Clock,
                title: "Reliable Delivery",
                desc: "We understand that time is money in commercial spaces. We commit to realistic timelines and deliver on them, every time."
              }
            ].map((value, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-brand-darker p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-brand-gray dark:bg-gray-800 flex items-center justify-center text-brand-accent mb-6">
                  <value.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-4">{value.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Details */}
      <section className="py-24 bg-white dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center">
          <h2 className="text-3xl font-display font-bold text-brand-dark dark:text-white mb-8">Company Information</h2>
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-8 p-8 bg-brand-gray dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full">
            <div className="flex flex-col items-center sm:items-start text-left">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Business Name</span>
              <span className="text-xl font-bold text-brand-dark dark:text-white">TNA Provider</span>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-300 dark:bg-gray-700" />
            <div className="flex flex-col items-center sm:items-start text-left">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ABN</span>
              <span className="text-xl font-bold text-brand-dark dark:text-white">80 664 454 924</span>
            </div>
            <div className="hidden sm:block w-px h-12 bg-gray-300 dark:bg-gray-700" />
            <div className="flex flex-col items-center sm:items-start text-left">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Service Area</span>
              <span className="text-xl font-bold text-brand-dark dark:text-white">Australia-wide</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
