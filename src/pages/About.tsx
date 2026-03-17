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
              title="Commercial Construction and Joinery"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              We handle commercial fitouts, custom joinery, and on-site construction work across Sydney and Australia. Our team manages the full delivery path from shop drawing to handover.
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
                title="How We Work"
              />
              <div className="prose prose-lg text-gray-600 dark:text-gray-400">
                <p>
                  TNA Provider brings together joinery manufacturing and on-site construction under one team. This means we control the timeline and quality instead of coordinating multiple subcontractors.
                </p>
                <p>
                  Our joinery facility handles custom fabrication while our site managers run the physical build. Whether it's a retail fitout, hospitality refit, or office refurbishment, we deliver the complete package.
                </p>
                <p>
                  We work across retail, hospitality, office, and specialist environments. Each sector has its own requirements — we know the difference.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=800" 
                alt="Joinery Workshop" 
                className="rounded-2xl w-full h-64 object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <img 
                src="https://images.unsplash.com/photo-1541888086925-920a0b414631?auto=format&fit=crop&q=80&w=800" 
                alt="Construction Site" 
                className="rounded-2xl w-full h-64 object-cover mt-8"
                loading="lazy"
                decoding="async"
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
                title: "One Team, One Point of Contact",
                desc: "We handle design, joinery, and construction in-house. You deal with one team from quote to handover."
              },
              {
                icon: Shield,
                title: "We Show Up",
                desc: "We have our own joinery shop and own site crews. No chasing subcontractors."
              },
              {
                icon: Clock,
                title: "We Deliver on Time",
                desc: "We set realistic timelines and stick to them. No excuses — just done."
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
